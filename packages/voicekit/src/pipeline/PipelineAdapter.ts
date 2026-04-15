/**
 * PipelineAdapter — composes STT + LLM + TTS into a single VoiceAdapter.
 *
 * Handles: mic capture -> STT -> LLM streaming -> sentence buffering -> TTS -> playback.
 * Supports barge-in and tool execution.
 *
 * ```ts
 * const adapter = createVoicePipeline({
 *   stt: deepgramSTT({ apiKey: '...' }),
 *   llm: openaiCompatibleLLM({ baseURL: 'https://openrouter.ai/api/v1', apiKey: '...' }),
 *   tts: cartesiaTTS({ apiKey: '...', voice: '...' }),
 * });
 * ```
 */

import { EventEmitter } from '../core/EventEmitter';
import type {
  VoiceAdapter,
  VoiceSession,
  VoiceAgentConfig,
  SessionOptions,
  SessionEvents,
  ConnectConfig,
} from '../core/types';
import type {
  VoicePipelineConfig,
  ChatMessage,
  ToolDefinition,
} from './types';

const SENTENCE_RE = /[.!?;]\s*$/;

class PipelineSession extends EventEmitter<SessionEvents> implements VoiceSession {
  private cfg: VoicePipelineConfig;
  private agent: VoiceAgentConfig;
  private history: ChatMessage[] = [];
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private playCtx: AudioContext | null = null;
  private playQueue: { buffer: AudioBuffer; time: number }[] = [];
  private playTime = 0;
  private generating = false;
  private abort: AbortController | null = null;
  private alive = false;

  constructor(cfg: VoicePipelineConfig, agent: VoiceAgentConfig) {
    super();
    this.cfg = cfg;
    this.agent = agent;
  }

  async connect(_cc: ConnectConfig): Promise<void> {
    if (this.agent.instructions) {
      this.history.push({ role: 'system', content: this.agent.instructions });
    }

    await this.cfg.stt.connect({ sampleRate: 16000, interimResults: true });
    if (this.cfg.tts.connect) await this.cfg.tts.connect();

    this.cfg.stt.onTranscript(async (ev) => {
      this.emit('user_transcript', {
        itemId: `u-${Date.now()}`,
        text: ev.isFinal ? ev.text : undefined,
        delta: ev.isFinal ? undefined : ev.text,
        isFinal: ev.isFinal,
      });

      if (ev.isFinal && ev.text.trim()) {
        if (this.generating && this.cfg.interruptOnSpeech !== false) this.interrupt();
        this.history.push({ role: 'user', content: ev.text });
        this.generate();
      }
    });

    if (this.cfg.stt.onVAD) {
      this.cfg.stt.onVAD((speaking) => {
        if (speaking) {
          this.emit('user_speech_started');
          if (this.generating && this.cfg.interruptOnSpeech !== false) this.interrupt();
        }
      });
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioCtx = new AudioContext({ sampleRate: 16000 });
    const src = this.audioCtx.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const inp = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(inp.length);
      for (let i = 0; i < inp.length; i++) {
        const s = Math.max(-1, Math.min(1, inp[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.cfg.stt.sendAudio(pcm);
    };
    src.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);

    this.alive = true;
    this.agent.onConnect?.();
    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    this.alive = false;
    this.interrupt();
    this.processor?.disconnect();
    this.audioCtx?.close();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.playCtx?.close();
    this.cfg.stt.close();
    this.cfg.tts.close?.();
    this.processor = null;
    this.audioCtx = null;
    this.mediaStream = null;
    this.playCtx = null;
    this.agent.onDisconnect?.();
    this.emit('status_change', 'DISCONNECTED');
    this.removeAllListeners();
  }

  async sendMessage(text: string): Promise<void> {
    if (this.generating) this.interrupt();
    this.history.push({ role: 'user', content: text });
    this.emit('user_transcript', { itemId: `u-${Date.now()}`, text, isFinal: true });
    this.generate();
  }

  interrupt(): void {
    this.abort?.abort();
    this.abort = null;
    this.generating = false;
  }

  mute(muted: boolean): void {
    this.mediaStream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }

  sendRawEvent(): void { /* no-op */ }

  // ---- generation loop ----

  private async generate(): Promise<void> {
    if (!this.alive) return;
    this.generating = true;
    this.abort = new AbortController();
    const sig = this.abort.signal;
    const id = `a-${Date.now()}`;

    const tools: ToolDefinition[] = (this.agent.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: (t as any).parameters?.properties || (t as any).parameters || {},
        required: (t as any).parameters?.required || (t as any).required || [],
      },
    }));

    try {
      let full = '';
      let buf = '';

      for await (const ev of this.cfg.llm.stream(this.history, tools.length ? tools : undefined)) {
        if (sig.aborted) break;

        if (ev.type === 'delta' && ev.delta) {
          full += ev.delta;
          buf += ev.delta;
          this.emit('assistant_transcript', { itemId: id, delta: ev.delta, isFinal: false });

          if (this.cfg.sentenceBuffer !== false && SENTENCE_RE.test(buf)) {
            await this.speak(buf.trim(), sig);
            buf = '';
          }
        }

        if (ev.type === 'tool_call' && ev.toolCall) {
          const tc = ev.toolCall;
          this.emit('tool_call_start', tc.name, tc.arguments);
          const exec = this.cfg.toolExecutors?.[tc.name]
            || this.agent.tools?.find((t) => t.name === tc.name)?.execute;
          if (exec) {
            try {
              const args = JSON.parse(tc.arguments);
              const result = await (exec as (a: any) => any)(args);
              this.emit('tool_call_end', tc.name, tc.arguments, result);
              this.history.push({ role: 'assistant', content: '' });
              this.history.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: tc.id, name: tc.name });
            } catch (err) {
              this.emit('tool_call_end', tc.name, tc.arguments, { error: String(err) });
            }
          }
        }
      }

      if (!sig.aborted && buf.trim()) await this.speak(buf.trim(), sig);
      if (!sig.aborted && full) {
        this.history.push({ role: 'assistant', content: full });
        this.emit('assistant_transcript', { itemId: id, text: full, isFinal: true });
      }
    } catch (err) {
      if (!sig.aborted) this.emit('error', err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.generating = false;
      this.abort = null;
    }
  }

  private async speak(text: string, sig: AbortSignal): Promise<void> {
    if (!text || sig.aborted) return;
    try {
      for await (const chunk of this.cfg.tts.synthesize(text)) {
        if (sig.aborted) break;
        this.playChunk(chunk);
      }
    } catch { /* non-fatal */ }
  }

  private playChunk(pcm: Int16Array): void {
    try {
      if (!this.playCtx) {
        this.playCtx = new AudioContext({ sampleRate: 16000 });
        this.playTime = this.playCtx.currentTime;
      }
      const f32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
      const buf = this.playCtx.createBuffer(1, f32.length, 16000);
      buf.copyToChannel(f32, 0);
      const s = this.playCtx.createBufferSource();
      s.buffer = buf;
      s.connect(this.playCtx.destination);
      const startAt = Math.max(this.playCtx.currentTime, this.playTime);
      s.start(startAt);
      this.playTime = startAt + buf.duration;
    } catch { /* non-fatal */ }
  }
}

class PipelineVoiceAdapter implements VoiceAdapter {
  readonly name = 'pipeline';
  private cfg: VoicePipelineConfig;
  constructor(cfg: VoicePipelineConfig) { this.cfg = cfg; }
  createSession(agent: VoiceAgentConfig, _opts?: SessionOptions): VoiceSession {
    return new PipelineSession(this.cfg, agent);
  }
}

/**
 * Create a composable voice pipeline adapter.
 *
 * ```ts
 * import { createVoicePipeline } from '@jchaffin/voicekit/pipeline';
 * import { deepgramSTT } from '@jchaffin/voicekit/pipeline/stt/deepgram';
 * import { openaiCompatibleLLM } from '@jchaffin/voicekit/pipeline/llm/openai-compatible';
 * import { cartesiaTTS } from '@jchaffin/voicekit/pipeline/tts/cartesia';
 *
 * const adapter = createVoicePipeline({
 *   stt: deepgramSTT({ apiKey: '...' }),
 *   llm: openaiCompatibleLLM({ baseURL: 'https://openrouter.ai/api/v1', apiKey: '...' }),
 *   tts: cartesiaTTS({ apiKey: '...', voice: '...' }),
 * });
 * ```
 */
export function createVoicePipeline(config: VoicePipelineConfig): VoiceAdapter {
  return new PipelineVoiceAdapter(config);
}
