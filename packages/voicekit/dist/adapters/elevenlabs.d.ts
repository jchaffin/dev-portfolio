import { i as SessionOptions, g as ServerSessionConfig, e as VoiceAdapter, S as ServerAdapter } from '../types-DY31oVB1.js';

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

interface ElevenLabsAdapterOptions extends SessionOptions {
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
declare function elevenlabs(options: ElevenLabsAdapterOptions): VoiceAdapter;
interface ElevenLabsServerConfig extends ServerSessionConfig {
    apiKey?: string;
    agentId?: string;
}
declare function elevenlabsServer(config?: ElevenLabsServerConfig): ServerAdapter;

export { type ElevenLabsAdapterOptions, type ElevenLabsServerConfig, elevenlabs as default, elevenlabs, elevenlabsServer };
