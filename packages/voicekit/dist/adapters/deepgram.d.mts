import { i as SessionOptions, g as ServerSessionConfig, e as VoiceAdapter, S as ServerAdapter } from '../types-DY31oVB1.mjs';

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

interface DeepgramAdapterOptions extends SessionOptions {
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
declare function deepgram(options: DeepgramAdapterOptions): VoiceAdapter;
interface DeepgramServerConfig extends ServerSessionConfig {
    apiKey?: string;
}
declare function deepgramServer(config?: DeepgramServerConfig): ServerAdapter;

export { type DeepgramAdapterOptions, type DeepgramServerConfig, deepgram, deepgramServer, deepgram as default };
