/**
 * Server-side utilities for VoiceKit
 * Use these in your API routes (Next.js, Express, etc.)
 *
 * This module provides the legacy OpenAI-specific helpers.
 * For provider-agnostic server adapters, import from the adapter entrypoints:
 *   import { openaiServer } from '@jchaffin/voicekit/openai'
 *   import { livekitServer } from '@jchaffin/voicekit/livekit'
 */

export type { ServerAdapter, ServerSessionConfig } from './core/types';

// ============================================================================
// Session Handler - Creates ephemeral keys for OpenAI Realtime
// ============================================================================

export interface SessionConfig {
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
export function createSessionHandler(config: SessionConfig = {}) {
  return async function handler(request?: Request): Promise<Response> {
    try {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return Response.json(
          { error: 'OpenAI API key not configured' }, 
          { status: 500 }
        );
      }

      // Use the new client_secrets endpoint
      const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_after: {
            anchor: 'created_at',
            seconds: config.expiresIn || 600,
          },
          session: {
            type: 'realtime',
            model: config.model || 'gpt-realtime',
            ...(config.voice && { 
              audio: { 
                output: { voice: config.voice } 
              } 
            }),
            ...(config.instructions && { instructions: config.instructions }),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI client_secrets error:', error);
        return Response.json(
          { error: `OpenAI API error: ${response.status}` }, 
          { status: 500 }
        );
      }

      const data = await response.json();
      
      // New API returns { value: "ek_...", expires_at: ..., session: {...} }
      if (!data.value) {
        return Response.json(
          { error: 'Invalid response from OpenAI' }, 
          { status: 500 }
        );
      }

      return Response.json({ ephemeralKey: data.value });
    } catch (error) {
      console.error('Session handler error:', error);
      return Response.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
  };
}

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
export async function getEphemeralKey(config: SessionConfig = {}): Promise<
  { ephemeralKey: string; error?: never } | { ephemeralKey?: never; error: string }
> {
  try {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return { error: 'OpenAI API key not configured' };
    }

    // Use the new client_secrets endpoint
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: {
          anchor: 'created_at',
          seconds: config.expiresIn || 600,
        },
        session: {
          type: 'realtime',
          model: config.model || 'gpt-realtime',
          ...(config.voice && { 
            audio: { 
              output: { voice: config.voice } 
            } 
          }),
          ...(config.instructions && { instructions: config.instructions }),
        },
      }),
    });

    if (!response.ok) {
      return { error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    
    // New API returns { value: "ek_...", expires_at: ..., session: {...} }
    if (!data.value) {
      return { error: 'Invalid response from OpenAI' };
    }

    return { ephemeralKey: data.value };
  } catch (error) {
    return { error: String(error) };
  }
}

// ============================================================================
// CORS Helper
// ============================================================================

/**
 * Create CORS headers for API routes
 */
export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * Handle OPTIONS preflight request
 */
export function handleOptions(origin = '*'): Response {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(origin),
  });
}
