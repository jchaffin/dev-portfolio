/**
 * Deepgram Aura TTS provider (REST-based).
 *
 * Sends text, receives full audio response. Not true streaming but fast enough
 * for sentence-buffered pipelines.
 *
 * ```ts
 * const tts = deepgramAuraTTS({ apiKey: '...', model: 'aura-asteria-en' });
 * ```
 */

import type { TTSProvider, TTSConfig } from '../types';

export interface DeepgramAuraTTSOptions {
  apiKey: string;
  /** Model name (default: aura-asteria-en) */
  model?: string;
  /** Sample rate (default: 16000) */
  sampleRate?: number;
}

class DeepgramAuraTTSImpl implements TTSProvider {
  readonly name = 'tts:deepgram-aura';
  private options: DeepgramAuraTTSOptions;

  constructor(options: DeepgramAuraTTSOptions) {
    this.options = options;
  }

  async *synthesize(text: string): AsyncIterable<Int16Array> {
    const model = this.options.model || 'aura-asteria-en';
    const sampleRate = this.options.sampleRate || 16000;

    const params = new URLSearchParams({
      model,
      encoding: 'linear16',
      sample_rate: String(sampleRate),
      container: 'none',
    });

    const res = await fetch(`https://api.deepgram.com/v1/speak?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error(`Deepgram TTS error: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    yield new Int16Array(arrayBuffer);
  }
}

export function deepgramAuraTTS(options: DeepgramAuraTTSOptions): TTSProvider {
  return new DeepgramAuraTTSImpl(options);
}
