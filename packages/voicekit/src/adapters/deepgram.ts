/**
 * Deepgram adapter for VoiceKit.
 *
 * Peer dependency: @deepgram/sdk (>= 3.0.0)
 *
 * Deepgram provides STT (listen) and TTS (speak) but does not offer a
 * single "conversational AI" socket like OpenAI or ElevenLabs. This adapter
 * wires Deepgram live transcription for the user's mic audio and expects
 * a server-side agent (e.g. your own LLM pipeline) to handle the assistant
 * logic and push assistant transcripts/audio back via a companion WebSocket.
 *
 * Usage:
 * ```ts
 * import { deepgram } from '@jchaffin/voicekit/deepgram';
 *
 * <VoiceProvider
 *   adapter={deepgram({ agentUrl: 'wss://my-backend/agent' })}
 *   agent={agent}
 * />
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
  ServerSessionConfig,
  ServerAdapter,
} from '../core/types';

// ============================================================================
// Deepgram Session
// ============================================================================

class DeepgramSession extends EventEmitter<SessionEvents> implements VoiceSession {
  private agentUrl: string;
  private options: SessionOptions;
  private agent: VoiceAgentConfig;
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  constructor(agent: VoiceAgentConfig, agentUrl: string, options: SessionOptions) {
    super();
    this.agent = agent;
    this.agentUrl = agentUrl;
    this.options = options;
  }

  async connect(config: ConnectConfig): Promise<void> {
    // Open WebSocket to the backend agent endpoint
    const url = new URL(this.agentUrl);
    url.searchParams.set('token', config.authToken);
    if (this.options.model) url.searchParams.set('model', this.options.model as string);
    if (this.options.language) url.searchParams.set('language', this.options.language as string);

    this.ws = new WebSocket(url.toString());

    await new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      let opened = false;
      ws.onopen = () => {
        opened = true;
        resolve();
      };
      ws.onerror = () => {
        if (!opened) reject(new Error('WebSocket connection failed'));
      };
      ws.onclose = () => {
        this.emit('status_change', 'DISCONNECTED');
        if (!opened) reject(new Error('WebSocket closed before connection opened'));
      };
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg, config.audioElement);
      } catch {
        this.emit('raw_event', event.data);
      }
    };

    this.ws.onerror = () => {
      this.emit('error', new Error('Deepgram WebSocket error'));
    };

    // Send agent config so the server knows the instructions/tools
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

    // Capture mic and stream audio to the server
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(e.data);
      }
    };

    this.mediaRecorder.start(250); // Send chunks every 250ms
    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    this.mediaRecorder?.stop();
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaRecorder = null;
    this.mediaStream = null;

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
        if (msg.data && audioElement) {
          // Assume base64 PCM or WAV; play via audio element
          this.emit('audio_delta', msg.itemId || '', msg.data);
        }
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
        this.emit('error', new Error(msg.message || 'Deepgram error'));
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

export interface DeepgramAdapterOptions extends SessionOptions {
  /** WebSocket URL of your agent backend that orchestrates Deepgram STT + LLM + TTS */
  agentUrl: string;
}

/**
 * Create a Deepgram adapter.
 *
 * ```ts
 * import { deepgram } from '@jchaffin/voicekit/deepgram';
 * <VoiceProvider adapter={deepgram({ agentUrl: 'wss://...' })} agent={agent} />
 * ```
 */
export function deepgram(options: DeepgramAdapterOptions): VoiceAdapter {
  return {
    name: 'deepgram',
    createSession(agent: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      return new DeepgramSession(agent, options.agentUrl, { ...options, ...sessionOpts });
    },
  };
}

// ============================================================================
// Server adapter
// ============================================================================

export interface DeepgramServerConfig extends ServerSessionConfig {
  apiKey?: string;
}

export function deepgramServer(config: DeepgramServerConfig = {}): ServerAdapter {
  const getSessionToken = async (overrides: ServerSessionConfig = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = (merged.apiKey as string) || process.env.DEEPGRAM_API_KEY;

    if (!apiKey) return { error: 'Deepgram API key not configured' };

    // Deepgram doesn't have ephemeral keys — the API key itself is the token.
    // In production you'd create a short-lived project key via the Deepgram API.
    return { token: apiKey };
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

export default deepgram;
