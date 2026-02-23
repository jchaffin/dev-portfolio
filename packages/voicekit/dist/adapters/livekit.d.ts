import { i as SessionOptions, g as ServerSessionConfig, e as VoiceAdapter, S as ServerAdapter } from '../types-DY31oVB1.js';

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

interface LiveKitAdapterOptions extends SessionOptions {
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
declare function livekit(options: LiveKitAdapterOptions): VoiceAdapter;
interface LiveKitServerConfig extends ServerSessionConfig {
    apiKey?: string;
    apiSecret?: string;
    /** Room name to grant access to */
    roomName?: string;
    /** Participant identity */
    identity?: string;
    /** Token TTL in seconds (default 600) */
    ttl?: number;
}
declare function livekitServer(config?: LiveKitServerConfig): ServerAdapter;

export { type LiveKitAdapterOptions, type LiveKitServerConfig, livekit as default, livekit, livekitServer };
