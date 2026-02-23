export { S as ServerAdapter, g as ServerSessionConfig } from './types-DY31oVB1.js';

/**
 * Server-side utilities for VoiceKit
 * Use these in your API routes (Next.js, Express, etc.)
 *
 * This module provides the legacy OpenAI-specific helpers.
 * For provider-agnostic server adapters, import from the adapter entrypoints:
 *   import { openaiServer } from '@jchaffin/voicekit/openai'
 *   import { livekitServer } from '@jchaffin/voicekit/livekit'
 */

interface SessionConfig {
    /** OpenAI API key (defaults to OPENAI_API_KEY env var) */
    apiKey?: string;
    /** Model to use */
    model?: string;
    /** Voice ID */
    voice?: string;
    /** Instructions for the agent */
    instructions?: string;
    /** Expiration time in seconds (default: 600 = 10 minutes) */
    expiresIn?: number;
}
/**
 * Create an ephemeral session key for OpenAI Realtime API
 *
 * @example Next.js App Router
 * ```ts
 * // app/api/session/route.ts
 * import { createSessionHandler } from '@jchaffin/voicekit/server';
 * export const POST = createSessionHandler();
 * ```
 *
 * @example Next.js with config
 * ```ts
 * export const POST = createSessionHandler({
 *   model: 'gpt-realtime',
 *   voice: 'alloy'
 * });
 * ```
 */
declare function createSessionHandler(config?: SessionConfig): (request?: Request) => Promise<Response>;
/**
 * Get an ephemeral key directly (for custom server implementations)
 *
 * @example Express
 * ```ts
 * import { getEphemeralKey } from '@jchaffin/voicekit/server';
 *
 * app.post('/api/session', async (req, res) => {
 *   const result = await getEphemeralKey();
 *   if (result.error) {
 *     return res.status(500).json({ error: result.error });
 *   }
 *   res.json({ ephemeralKey: result.ephemeralKey });
 * });
 * ```
 */
declare function getEphemeralKey(config?: SessionConfig): Promise<{
    ephemeralKey: string;
    error?: never;
} | {
    ephemeralKey?: never;
    error: string;
}>;
/**
 * Create CORS headers for API routes
 */
declare function corsHeaders(origin?: string): {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
};
/**
 * Handle OPTIONS preflight request
 */
declare function handleOptions(origin?: string): Response;

export { type SessionConfig, corsHeaders, createSessionHandler, getEphemeralKey, handleOptions };
