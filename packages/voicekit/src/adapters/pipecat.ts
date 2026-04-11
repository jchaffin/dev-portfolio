/**
 * Pipecat adapter for VoiceKit.
 *
 * Pipecat is a Python framework for building voice and multimodal AI pipelines.
 * This adapter connects to a Pipecat server via WebSocket (Daily transport
 * or raw WebSocket) and normalizes its events into the VoiceKit session interface.
 *
 * Usage:
 * ```ts
 * import { pipecat } from '@jchaffin/voicekit/pipecat';
 *
 * <VoiceProvider
 *   adapter={pipecat({ serverUrl: 'wss://my-pipecat-server/ws' })}
 *   agent={agent}
 * />
 * ```
 *
 * For Daily-based Pipecat deployments, pass the Daily room URL:
 * ```ts
 * adapter={pipecat({ serverUrl: 'wss://my-server/ws', transport: 'daily' })}
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
// Pipecat Session
// ============================================================================

class PipecatSession extends EventEmitter<SessionEvents> implements VoiceSession {
  private serverUrl: string;
  private options: SessionOptions;
  private agent: VoiceAgentConfig;
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private playbackCtx: AudioContext | null = null;

  constructor(agent: VoiceAgentConfig, serverUrl: string, options: SessionOptions) {
    super();
    this.agent = agent;
    this.serverUrl = serverUrl;
    this.options = options;
  }

  async connect(config: ConnectConfig): Promise<void> {
    const url = new URL(this.serverUrl);
    if (config.authToken) url.searchParams.set('token', config.authToken);

    this.ws = new WebSocket(url.toString());

    await new Promise<void>((resolve, reject) => {
      const ws = this.ws!;
      let opened = false;
      ws.onopen = () => { opened = true; resolve(); };
      ws.onerror = () => { if (!opened) reject(new Error('Pipecat WebSocket connection failed')); };
      ws.onclose = () => {
        this.emit('status_change', 'DISCONNECTED');
        if (!opened) reject(new Error('WebSocket closed before open'));
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
      this.emit('error', new Error('Pipecat WebSocket error'));
    };

    this.ws.onclose = () => {
      this.emit('status_change', 'DISCONNECTED');
    };

    // Send pipeline config
    this.ws.send(JSON.stringify({
      type: 'pipeline_config',
      config: {
        agent_name: this.agent.name,
        instructions: this.agent.instructions,
        voice: this.agent.voice || this.options.voice,
        model: this.options.model,
        language: this.options.language,
        tools: (this.agent.tools || []).map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    }));

    // Stream mic audio
    const useRawPcm = (this.options as PipecatAdapterOptions).rawAudio !== false;

    if (useRawPcm) {
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
        this.ws.send(JSON.stringify({
          type: 'audio_input',
          data: btoa(binary),
          sample_rate: 16000,
          encoding: 'pcm16',
        }));
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    } else {
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
      this.mediaRecorder.start(250);
    }

    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    this.scriptProcessor?.disconnect();
    this.audioContext?.close();
    this.mediaRecorder?.stop();
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.playbackCtx?.close();

    this.scriptProcessor = null;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.playbackCtx = null;

    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'disconnect' }));
      this.ws.close();
      this.ws = null;
    }
    this.removeAllListeners();
  }

  sendMessage(text: string): void {
    this.ws?.send(JSON.stringify({ type: 'text_input', text }));
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
    // Pipecat frame types
    switch (msg.type || msg.frame_type) {
      case 'transcription':
      case 'TranscriptionFrame':
        this.emit('user_transcript', {
          itemId: msg.id || String(Date.now()),
          text: msg.text || '',
          isFinal: true,
        });
        break;

      case 'interim_transcription':
      case 'InterimTranscriptionFrame':
        this.emit('user_transcript', {
          itemId: msg.id || String(Date.now()),
          delta: msg.text || '',
          isFinal: false,
        });
        break;

      case 'bot_transcript':
      case 'TextFrame':
        this.emit('assistant_transcript', {
          itemId: msg.id || String(Date.now()),
          delta: msg.text || '',
          isFinal: false,
        });
        break;

      case 'bot_transcript_complete':
      case 'EndFrame':
        this.emit('assistant_transcript', {
          itemId: msg.id || String(Date.now()),
          text: msg.text || '',
          isFinal: true,
        });
        break;

      case 'audio_output':
      case 'AudioRawFrame':
      case 'TTSAudioRawFrame': {
        const audioData = msg.data || msg.audio;
        if (audioData) {
          this.emit('audio_delta', msg.id || '', audioData);
          if (audioElement) this.playAudioChunk(audioData, msg.sample_rate || 16000);
        }
        break;
      }

      case 'function_call':
      case 'LLMFunctionCallFrame':
        this.emit('tool_call_start', msg.function_name || msg.name || '', msg.arguments || msg.input);
        this.executeToolCall(msg);
        break;

      case 'function_call_result':
      case 'LLMFunctionCallResultFrame':
        this.emit('tool_call_end', msg.function_name || msg.name || '', msg.arguments || msg.input, msg.result || msg.output);
        break;

      case 'user_started_speaking':
      case 'UserStartedSpeakingFrame':
        this.emit('user_speech_started');
        break;

      case 'user_stopped_speaking':
      case 'UserStoppedSpeakingFrame':
        this.emit('user_speech_ended', 0);
        break;

      case 'error':
      case 'ErrorFrame':
        this.emit('error', new Error(msg.message || msg.error || 'Pipecat error'));
        break;

      default:
        this.emit('raw_event', msg);
        break;
    }
  }

  private async executeToolCall(msg: any): Promise<void> {
    const name = msg.function_name || msg.name;
    const params = msg.arguments || msg.input || {};
    const callId = msg.tool_call_id || msg.call_id;
    const toolDef = this.agent.tools?.find(t => t.name === name);

    if (!toolDef) {
      this.ws?.send(JSON.stringify({
        type: 'function_call_result',
        tool_call_id: callId,
        function_name: name,
        result: JSON.stringify({ error: `Tool ${name} not found` }),
      }));
      return;
    }

    try {
      const parsedParams = typeof params === 'string' ? JSON.parse(params) : params;
      const result = await toolDef.execute(parsedParams);
      this.emit('tool_call_end', name, parsedParams, result);
      this.ws?.send(JSON.stringify({
        type: 'function_call_result',
        tool_call_id: callId,
        function_name: name,
        result: JSON.stringify(result),
      }));
    } catch (err) {
      const errorResult = { error: String(err) };
      this.emit('tool_call_end', name, params, errorResult);
      this.ws?.send(JSON.stringify({
        type: 'function_call_result',
        tool_call_id: callId,
        function_name: name,
        result: JSON.stringify(errorResult),
      }));
    }
  }

  private playAudioChunk(base64: string, sampleRate: number): void {
    try {
      if (!this.playbackCtx) {
        this.playbackCtx = new AudioContext({ sampleRate });
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const samples = new Float32Array(bytes.length / 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = view.getInt16(i * 2, true) / 32768;
      }

      const buffer = this.playbackCtx.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const src = this.playbackCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.playbackCtx.destination);
      src.start();
    } catch {
      // Non-critical
    }
  }
}

// ============================================================================
// Adapter factory
// ============================================================================

export interface PipecatAdapterOptions extends SessionOptions {
  serverUrl: string;
  /** Transport mode: 'websocket' (default) or 'daily' */
  transport?: 'websocket' | 'daily';
  /** Send raw PCM audio instead of WebM chunks (default: true) */
  rawAudio?: boolean;
}

export function pipecat(options: PipecatAdapterOptions): VoiceAdapter {
  return {
    name: 'pipecat',
    createSession(agent: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      return new PipecatSession(agent, options.serverUrl, { ...options, ...sessionOpts });
    },
  };
}

// ============================================================================
// Server adapter
// ============================================================================

export interface PipecatServerConfig extends ServerSessionConfig {
  apiKey?: string;
  serverUrl?: string;
}

export function pipecatServer(config: PipecatServerConfig = {}): ServerAdapter {
  const getSessionToken = async (overrides: ServerSessionConfig = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = (merged.apiKey as string) || process.env.PIPECAT_API_KEY;
    const serverUrl = (merged.serverUrl as string) || process.env.PIPECAT_SERVER_URL;

    if (!serverUrl) return { error: 'Pipecat server URL not configured' };

    // If your Pipecat server requires auth, exchange the API key for a session token
    if (apiKey) {
      try {
        const res = await fetch(`${serverUrl}/token`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expires_in: (merged.expiresIn as number) || 3600,
          }),
        });
        if (!res.ok) return { error: `Pipecat token error: ${res.status}` };
        const data = await res.json();
        return { token: data.token || data.session_token || '' };
      } catch (err) {
        return { error: String(err) };
      }
    }

    // No auth required — return the server URL itself as the "token"
    return { token: serverUrl };
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

export default pipecat;
