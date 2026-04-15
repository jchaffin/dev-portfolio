/**
 * OpenAI TTS provider (REST-based).
 *
 * ```ts
 * const tts = openaiTTS({ apiKey: '...', voice: 'alloy' });
 * ```
 */

import type { TTSProvider, TTSConfig } from '../types';

export interface OpenAITTSOptions {
  apiKey: string;
  /** Voice (default: alloy). Options: alloy, echo, fable, onyx, nova, shimmer */
  voice?: string;
  /** Model (default: tts-1) */
  model?: string;
  /** Speaking speed 0.25-4.0 (default: 1.0) */
  speed?: number;
}

class OpenAITTSImpl implements TTSProvider {
  readonly name = 'tts:openai';
  private options: OpenAITTSOptions;

  constructor(options: OpenAITTSOptions) {
    this.options = options;
  }

  async *synthesize(text: string): AsyncIterable<Int16Array> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.options.model || 'tts-1',
        input: text,
        voice: this.options.voice || 'alloy',
        response_format: 'pcm',
        speed: this.options.speed || 1.0,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI TTS error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length >= 2) {
          yield new Int16Array(value.buffer, value.byteOffset, Math.floor(value.byteLength / 2));
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export function openaiTTS(options: OpenAITTSOptions): TTSProvider {
  return new OpenAITTSImpl(options);
}
