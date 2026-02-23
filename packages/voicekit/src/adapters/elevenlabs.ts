/**
 * ElevenLabs Conversational AI adapter for VoiceKit.
 *
 * Uses ElevenLabs' WebSocket-based Conversational AI API.
 *
 * Usage:
 * ```ts
 * import { elevenlabs } from '@jchaffin/voicekit/elevenlabs';
 *
 * <VoiceProvider
 *   adapter={elevenlabs({ agentId: 'your-agent-id' })}
 *   agent={agent}
 * />
 * ```
 *
 * The session endpoint should return `{ ephemeralKey: "<signed_url>" }`.
 * For public agents, pass the agent_id directly.
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

const ELEVENLABS_WS_BASE = 'wss://api.elevenlabs.io/v1/convai/conversation';

// ============================================================================
// ElevenLabs Session
// ============================================================================

class ElevenLabsSession extends EventEmitter<SessionEvents> implements VoiceSession {
  private ws: WebSocket | null = null;
  private agentId: string;
  private options: SessionOptions;
  private agent: VoiceAgentConfig;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private playbackCtx: AudioContext | null = null;

  constructor(agent: VoiceAgentConfig, agentId: string, options: SessionOptions) {
    super();
    this.agent = agent;
    this.agentId = agentId;
    this.options = options;
  }

  async connect(config: ConnectConfig): Promise<void> {
    // authToken may be a signed URL (for private agents) or empty for public agents
    const wsUrl = config.authToken?.startsWith('wss://')
      ? config.authToken
      : `${ELEVENLABS_WS_BASE}?agent_id=${this.agentId}`;

    this.ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('ElevenLabs WebSocket connection failed'));
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg, config.audioElement);
      } catch {
        this.emit('raw_event', event.data);
      }
    };

    this.ws.onclose = () => {
      this.emit('status_change', 'DISCONNECTED');
    };

    this.ws.onerror = () => {
      this.emit('error', new Error('ElevenLabs WebSocket error'));
    };

    // Send initial config with agent instructions/context
    if (this.agent.instructions) {
      this.ws.send(JSON.stringify({
        type: 'contextual_update',
        text: this.agent.instructions,
      }));
    }

    // Capture mic audio and send as base64 PCM
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Use ScriptProcessorNode to get raw PCM samples
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
      const base64 = btoa(binary);
      this.ws.send(JSON.stringify({ user_audio_chunk: base64 }));
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    this.scriptProcessor?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.playbackCtx?.close();

    this.scriptProcessor = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.playbackCtx = null;

    if (this.ws) {
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

  private handleMessage(msg: any, audioElement?: HTMLAudioElement): void {
    // ElevenLabs event types
    switch (msg.type) {
      case 'user_transcript':
        this.emit('user_transcript', {
          itemId: msg.id || '',
          text: msg.user_transcript_event?.user_transcript || msg.text || '',
          isFinal: msg.user_transcript_event?.is_final ?? true,
        });
        break;

      case 'agent_response':
        this.emit('assistant_transcript', {
          itemId: msg.id || '',
          delta: msg.agent_response_event?.agent_response || msg.delta || '',
          isFinal: false,
        });
        break;

      case 'agent_response_correction':
        this.emit('assistant_transcript', {
          itemId: msg.id || '',
          text: msg.agent_response_correction_event?.corrected_text || '',
          isFinal: true,
        });
        break;

      case 'audio': {
        // Base64 audio chunk from ElevenLabs
        const audioData = msg.audio_event?.audio_base_64 || msg.audio;
        if (audioData) {
          this.emit('audio_delta', msg.id || '', audioData);
          this.playAudioChunk(audioData, audioElement);
        }
        break;
      }

      case 'client_tool_call':
        this.emit('tool_call_start', msg.client_tool_call?.tool_name || '', msg.client_tool_call?.parameters);
        // Execute tool locally if we have it
        this.executeToolCall(msg);
        break;

      case 'vad':
        if (msg.vad_event?.type === 'SPEECH_START') {
          this.emit('user_speech_started');
        }
        break;

      case 'error':
        this.emit('error', new Error(msg.message || msg.error || 'ElevenLabs error'));
        break;

      default:
        this.emit('raw_event', msg);
        break;
    }
  }

  private async executeToolCall(msg: any): Promise<void> {
    const toolCall = msg.client_tool_call;
    if (!toolCall) return;

    const toolDef = this.agent.tools?.find(t => t.name === toolCall.tool_name);
    if (!toolDef) {
      // Tool not found, send error result
      this.ws?.send(JSON.stringify({
        type: 'client_tool_result',
        tool_call_id: toolCall.tool_call_id,
        result: JSON.stringify({ error: `Tool ${toolCall.tool_name} not found` }),
      }));
      return;
    }

    try {
      const result = await toolDef.execute(toolCall.parameters || {});
      this.emit('tool_call_end', toolCall.tool_name, toolCall.parameters, result);
      this.ws?.send(JSON.stringify({
        type: 'client_tool_result',
        tool_call_id: toolCall.tool_call_id,
        result: JSON.stringify(result),
      }));
    } catch (err) {
      const errorResult = { error: String(err) };
      this.emit('tool_call_end', toolCall.tool_name, toolCall.parameters, errorResult);
      this.ws?.send(JSON.stringify({
        type: 'client_tool_result',
        tool_call_id: toolCall.tool_call_id,
        result: JSON.stringify(errorResult),
      }));
    }
  }

  private playAudioChunk(base64: string, audioElement?: HTMLAudioElement): void {
    if (!audioElement) return;
    try {
      if (!this.playbackCtx) {
        this.playbackCtx = new AudioContext({ sampleRate: 22050 });
      }
      // Decode base64 to PCM and play
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const samples = new Float32Array(bytes.length / 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = view.getInt16(i * 2, true) / 32768;
      }

      const buffer = this.playbackCtx.createBuffer(1, samples.length, 22050);
      buffer.copyToChannel(samples, 0);
      const src = this.playbackCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.playbackCtx.destination);
      src.start();
    } catch {
      // Audio playback failure is non-critical
    }
  }
}

// ============================================================================
// Adapter factory
// ============================================================================

export interface ElevenLabsAdapterOptions extends SessionOptions {
  /** ElevenLabs agent ID */
  agentId: string;
}

/**
 * Create an ElevenLabs Conversational AI adapter.
 *
 * ```ts
 * import { elevenlabs } from '@jchaffin/voicekit/elevenlabs';
 * <VoiceProvider adapter={elevenlabs({ agentId: '...' })} agent={agent} />
 * ```
 */
export function elevenlabs(options: ElevenLabsAdapterOptions): VoiceAdapter {
  return {
    name: 'elevenlabs',
    createSession(agent: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      return new ElevenLabsSession(agent, options.agentId, { ...options, ...sessionOpts });
    },
  };
}

// ============================================================================
// Server adapter
// ============================================================================

export interface ElevenLabsServerConfig extends ServerSessionConfig {
  apiKey?: string;
  agentId?: string;
}

export function elevenlabsServer(config: ElevenLabsServerConfig = {}): ServerAdapter {
  const getSessionToken = async (overrides: ServerSessionConfig = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = (merged.apiKey as string) || process.env.ELEVENLABS_API_KEY;
    const agentId = (merged.agentId as string) || process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey) return { error: 'ElevenLabs API key not configured' };
    if (!agentId) return { error: 'ElevenLabs agent ID not configured' };

    try {
      // Get a signed URL for private agents
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: 'GET',
          headers: { 'xi-api-key': apiKey },
        }
      );

      if (!res.ok) {
        return { error: `ElevenLabs API error: ${res.status}` };
      }

      const data = await res.json();
      return { token: data.signed_url || '' };
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

export default elevenlabs;
