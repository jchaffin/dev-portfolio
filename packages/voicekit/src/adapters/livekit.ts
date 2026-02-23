/**
 * LiveKit adapter for VoiceKit.
 *
 * Peer dependency: livekit-client (>= 2.0.0)
 *
 * Usage:
 * ```ts
 * import { livekit } from '@jchaffin/voicekit/livekit';
 *
 * <VoiceProvider adapter={livekit({ serverUrl: 'wss://my-livekit.example.com' })} agent={agent}>
 * ```
 *
 * Server-side: generate an access token containing room name + participant identity
 * and return it from your session endpoint.
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
// LiveKit Session
// ============================================================================

class LiveKitSession extends EventEmitter<SessionEvents> implements VoiceSession {
  private room: any = null;
  private serverUrl: string;
  private options: SessionOptions;
  private agent: VoiceAgentConfig;

  constructor(agent: VoiceAgentConfig, serverUrl: string, options: SessionOptions) {
    super();
    this.agent = agent;
    this.serverUrl = serverUrl;
    this.options = options;
  }

  async connect(config: ConnectConfig): Promise<void> {
    // Lazy-load livekit-client so it's not required at import time
    const { Room, RoomEvent, Track } = await import('livekit-client');

    this.room = new Room();

    // Wire events before connecting
    this.room.on(RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
      if (track.kind === Track.Kind.Audio) {
        const el = config.audioElement || document.createElement('audio');
        track.attach(el);
        if (!config.audioElement) {
          el.autoplay = true;
          el.style.display = 'none';
          document.body.appendChild(el);
        }
      }
    });

    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any, kind: any) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        this.handleDataMessage(msg, participant);
      } catch {
        this.emit('raw_event', { payload, participant, kind });
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.emit('status_change', 'DISCONNECTED');
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      this.emit('status_change', 'CONNECTING');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      this.emit('status_change', 'CONNECTED');
    });

    await this.room.connect(this.serverUrl, config.authToken);

    // Publish local microphone
    await this.room.localParticipant.setMicrophoneEnabled(true);

    this.emit('status_change', 'CONNECTED');
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.removeAllListeners();
  }

  sendMessage(text: string): void {
    if (!this.room) throw new Error('Not connected');
    const data = new TextEncoder().encode(JSON.stringify({ type: 'user_message', text }));
    this.room.localParticipant.publishData(data, { reliable: true });
  }

  interrupt(): void {
    if (!this.room) return;
    const data = new TextEncoder().encode(JSON.stringify({ type: 'interrupt' }));
    this.room.localParticipant.publishData(data, { reliable: true });
  }

  mute(muted: boolean): void {
    this.room?.localParticipant?.setMicrophoneEnabled(!muted);
  }

  sendRawEvent(event: Record<string, unknown>): void {
    if (!this.room) return;
    const data = new TextEncoder().encode(JSON.stringify(event));
    this.room.localParticipant.publishData(data, { reliable: true });
  }

  private handleDataMessage(msg: any, _participant: any): void {
    switch (msg.type) {
      case 'user_transcript':
        this.emit('user_transcript', {
          itemId: msg.itemId || msg.id || '',
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.isFinal ?? !!msg.text,
        });
        break;

      case 'assistant_transcript':
        this.emit('assistant_transcript', {
          itemId: msg.itemId || msg.id || '',
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.isFinal ?? !!msg.text,
        });
        break;

      case 'tool_call_start':
        this.emit('tool_call_start', msg.name, msg.input);
        break;

      case 'tool_call_end':
        this.emit('tool_call_end', msg.name, msg.input, msg.output);
        break;

      case 'agent_handoff':
        this.emit('agent_handoff', msg.from || '', msg.to || '');
        break;

      case 'error':
        this.emit('error', new Error(msg.message || 'LiveKit error'));
        break;

      case 'speech_started':
        this.emit('user_speech_started');
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

export interface LiveKitAdapterOptions extends SessionOptions {
  /** LiveKit server WebSocket URL (e.g. wss://my-app.livekit.cloud) */
  serverUrl: string;
}

/**
 * Create a LiveKit adapter.
 *
 * ```ts
 * import { livekit } from '@jchaffin/voicekit/livekit';
 * <VoiceProvider adapter={livekit({ serverUrl: 'wss://...' })} agent={agent} />
 * ```
 */
export function livekit(options: LiveKitAdapterOptions): VoiceAdapter {
  return {
    name: 'livekit',
    createSession(agent: VoiceAgentConfig, sessionOpts?: SessionOptions): VoiceSession {
      return new LiveKitSession(agent, options.serverUrl, { ...options, ...sessionOpts });
    },
  };
}

// ============================================================================
// Server adapter
// ============================================================================

export interface LiveKitServerConfig extends ServerSessionConfig {
  apiKey?: string;
  apiSecret?: string;
  /** Room name to grant access to */
  roomName?: string;
  /** Participant identity */
  identity?: string;
  /** Token TTL in seconds (default 600) */
  ttl?: number;
}

export function livekitServer(config: LiveKitServerConfig = {}): ServerAdapter {
  const getSessionToken = async (overrides: ServerSessionConfig = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = (merged.apiKey as string) || process.env.LIVEKIT_API_KEY;
    const apiSecret = (merged.apiSecret as string) || process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return { error: 'LiveKit API key and secret are required' };
    }

    try {
      const { AccessToken } = await import('livekit-server-sdk');
      const roomName = (merged.roomName as string) || `room-${Date.now()}`;
      const identity = (merged.identity as string) || `user-${Date.now()}`;

      const at = new AccessToken(apiKey, apiSecret, {
        identity,
        ttl: ((merged.ttl as number) || 600).toString() + 's',
      });
      at.addGrant({ roomJoin: true, room: roomName });

      return { token: await at.toJwt() };
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

export default livekit;
