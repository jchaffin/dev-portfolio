import { i as SessionOptions, g as ServerSessionConfig, e as VoiceAdapter, S as ServerAdapter } from '../types-DY31oVB1.js';

/**
 * OpenAI Realtime API adapter for VoiceKit.
 *
 * Usage:
 * ```ts
 * import { openai } from '@jchaffin/voicekit/openai';
 *
 * <VoiceProvider adapter={openai({ model: 'gpt-realtime' })} agent={agent}>
 * ```
 *
 * Peer dependency: @openai/agents (>= 0.0.15)
 */

interface OpenAIAdapterOptions extends SessionOptions {
    model?: string;
    language?: string;
    codec?: string;
    voice?: string;
    transcriptionModel?: string;
}
/**
 * Create an OpenAI Realtime adapter.
 *
 * ```ts
 * import { openai } from '@jchaffin/voicekit/openai';
 * <VoiceProvider adapter={openai()} agent={agent} />
 * ```
 */
declare function openai(options?: OpenAIAdapterOptions): VoiceAdapter;
interface OpenAIServerConfig extends ServerSessionConfig {
    apiKey?: string;
    model?: string;
    voice?: string;
    instructions?: string;
    expiresIn?: number;
}
declare function openaiServer(config?: OpenAIServerConfig): ServerAdapter;

export { type OpenAIAdapterOptions, type OpenAIServerConfig, openai as default, openai, openaiServer };
