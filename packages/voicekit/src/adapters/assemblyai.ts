/**
 * AssemblyAI adapter for VoiceKit.
 *
 * AssemblyAI provides real-time STT via WebSocket. Like the Deepgram adapter,
 * this connects to your backend agent WebSocket which orchestrates
 * AssemblyAI STT + your LLM + TTS pipeline.
 *
 * Usage:
 * ```ts
 * import { assemblyai } from '@jchaffin/voicekit/assemblyai';
 *
 * <VoiceProvider
 *   adapter={assemblyai({ agentUrl: 'wss://my-backend/agent' })}
 *   agent={agent}
 * />
 * ```
 *
 * For direct AssemblyAI real-time transcription without a backend agent,
 * use `assemblyaiDirect()` which connects straight to AssemblyAI's
 * WebSocket endpoint.
 */

import { EventEmitter } from '../core/EventEmitter';
import type {
  VoiceAdapter,
  VoiceSession,
  VoiceAgentConfig,
  SessionOptions,
  SessionEvents,
  ConnectConfig,
  ServerSessionConfig,
  ServerAdapter,
} from '../core/types';

// ============================================================================
// AssemblyAI Session (agent backend pattern)
// ============================================================================

class AssemblyAISession extends EventEmitter<SessionEvents> implements VoiceSession {
  private agentUrl: string;
  private options: SessionOptions;
  private agent: VoiceAgentConfig;
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  constructor(agent: VoiceAgentConfig, agentUrl: string, options: SessionOptions) {
    super();
    this.agent = agent;
    this.agentUrl = agentUrl;
    this.options = options;
  }

  async connect(config: ConnectConfig): Promise<void> {
    const url = new URL(this.agentUrl);
    url.searchParams.set('token', config.authToken);
    if (this.options.model) url.searchParams.set('model', this.options.model as string);
    if (this.options.language) url.searchParams.set('language', this.options.language as string);

    this.ws = new WebSocket(url.toString());

    await new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      let opened = false;
      ws.onopen = () => { opened = true; resolve(); };
      ws.onerror = () => { if (!opened) reject(new Error('AssemblyAI WebSocket connection failed')); };
      ws.onclose = () => {
        this.emit('status_change', 'DISCONNECTED');
        if (!opened) reject(new Error('WebSocket closed before open'));
      };
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch {
        this.emit('raw_event', event.data);
      }
    };

    this.ws.onerror = () => {
      this.emit('error', new Error('AssemblyAI WebSocket error'));
    };

    this.ws.send(JSON.stringify({
      type: 'agent_config',
      agent: {
        name: this.agent.name,
        instructions: this.agent.instructions,
        tools: (this.agent.tools || []).map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    }));

    // Capture mic and send raw PCM16 at 16kHz (AssemblyAI's preferred format)
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
      this.ws.send(JSON.stringify({ audio_data: btoa(binary) }));
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    this.scriptProcessor?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.scriptProcessor = null;
    this.audioContext = null;
    this.mediaStream = null;

    if (this.ws) {
      this.ws.send(JSON.stringify({ terminate_session: true }));
      this.ws.close();
      this.ws = null;
    }
    this.removeAllListeners();
  }

  sendMessage(text: string): void {
    this.ws?.send(JSON.stringify({ type: 'user_message', text }));
  }

  interrupt(): void {
    this.ws?.send(JSON.stringify({ type: 'interrupt' }));
  }

  mute(muted: boolean): void {
    this.mediaStream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }

  sendRawEvent(event: Record<string, unknown>): void {
    this.ws?.send(JSON.stringify(event));
  }

  private handleMessage(msg: any): void {
    // Handle AssemblyAI real-time transcript format
    if (msg.message_type === 'PartialTranscript' || msg.message_type === 'FinalTranscript') {
      const isFinal = msg.message_type === 'FinalTranscript';
      const text = msg.text || '';
      if (text.trim()) {
        this.emit('user_transcript', {
          itemId: msg.audio_start?.toString() || String(Date.now()),
          delta: isFinal ? undefined : text,
          text: isFinal ? text : undefined,
          isFinal,
        });
      }
      return;
    }

    // Handle normalized messages from agent backend
    switch (msg.type) {
      case 'user_transcript':
        this.emit('user_transcript', {
          itemId: msg.itemId || msg.id || '',
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.is_final ?? msg.isFinal ?? !!msg.text,
        });
        break;

      case 'assistant_transcript':
        this.emit('assistant_transcript', {
          itemId: msg.itemId || msg.id || '',
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.is_final ?? msg.isFinal ?? !!msg.text,
        });
        break;

      case 'audio':
        this.emit('audio_delta', msg.itemId || '', msg.data || '');
        break;

      case 'tool_call_start':
        this.emit('tool_call_start', msg.name, msg.input);
        break;

      case 'tool_call_end':
        this.emit('tool_call_end', msg.name, msg.input, msg.output);
        break;

      case 'speech_started':
        this.emit('user_speech_started');
        break;

      case 'error':
        this.emit('error', new Error(msg.message || msg.error || 'AssemblyAI error'));
        break;

      default:
        this.emit('raw_event', msg);
        break;
    }
  }
}

// ============================================================================
// Adapter factory
// ============================================================================

export interface AssemblyAIAdapterOptions extends SessionOptions {
  agentUrl: string;
}

export function assemblyai(options: AssemblyAIAdapterOptions): VoiceAdapter {
  return {
    name: 'assemblyai',
    createSession(agent: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      return new AssemblyAISession(agent, options.agentUrl, { ...options, ...sessionOpts });
    },
  };
}

// ============================================================================
// Direct AssemblyAI real-time transcription session (STT only, no agent)
// ============================================================================

export interface AssemblyAIDirectOptions extends SessionOptions {
  /** Override the AssemblyAI real-time WebSocket URL */
  realtimeUrl?: string;
}

export function assemblyaiDirect(options: AssemblyAIDirectOptions = {}): VoiceAdapter {
  return {
    name: 'assemblyai-direct',
    createSession(agent: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      const merged = { ...options, ...sessionOpts };
      const wsUrl = (merged.realtimeUrl as string) || 'wss://api.assemblyai.com/v2/realtime/ws';
      return new AssemblyAISession(agent, wsUrl, merged);
    },
  };
}

// ============================================================================
// Server adapter
// ============================================================================

export interface AssemblyAIServerConfig extends ServerSessionConfig {
  apiKey?: string;
}

export function assemblyaiServer(config: AssemblyAIServerConfig = {}): ServerAdapter {
  const getSessionToken = async (overrides: ServerSessionConfig = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = (merged.apiKey as string) || process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) return { error: 'AssemblyAI API key not configured' };

    try {
      const res = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expires_in: (merged.expiresIn as number) || 3600 }),
      });

      if (!res.ok) return { error: `AssemblyAI API error: ${res.status}` };
      const data = await res.json();
      return { token: data.token || '' };
    } catch (err) {
      return { error: String(err) };
    }
  };

  return {
    getSessionToken,
    createSessionHandler(overrides?: ServerSessionConfig) {
      return async (_request?: Request): Promise<Response> => {
        const result = await getSessionToken(overrides);
        if (result.error) {
          return Response.json({ error: result.error }, { status: 500 });
        }
        return Response.json({ ephemeralKey: result.token });
      };
    },
  };
}

export default assemblyai;
