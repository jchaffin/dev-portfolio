/**
 * Cartesia Sonic TTS provider.
 *
 * Uses `@cartesia/cartesia-js` SDK for WebSocket streaming TTS with sub-100ms latency.
 *
 * ```ts
 * const tts = cartesiaTTS({ apiKey: '...', voice: 'voice-id', model: 'sonic-3' });
 * ```
 *
 * Peer dependency: @cartesia/cartesia-js (>= 3.0.0)
 */

import type { TTSProvider, TTSConfig } from '../types';

export interface CartesiaTTSOptions {
  apiKey: string;
  voice: string;
  model?: string;
  sampleRate?: number;
  language?: string;
}

class CartesiaTTSImpl implements TTSProvider {
  readonly name = 'tts:cartesia';
  private ws: any = null;
  private options: CartesiaTTSOptions;

  constructor(options: CartesiaTTSOptions) {
    this.options = options;
  }

  async connect(_config?: TTSConfig): Promise<void> {
    const Cartesia = (await import('@cartesia/cartesia-js')).default;
    const client = new Cartesia({ apiKey: this.options.apiKey });
    this.ws = await client.tts.websocket();
  }

  async *synthesize(text: string): AsyncIterable<Int16Array> {
    if (!this.ws) await this.connect();

    const ctx = this.ws.context({
      model_id: this.options.model || 'sonic-3',
      voice: { mode: 'id', id: this.options.voice },
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: this.options.sampleRate || 16000,
      },
      ...(this.options.language && { language: this.options.language }),
    });

    await ctx.push({ transcript: text });
    await ctx.no_more_inputs();

    for await (const event of ctx.receive()) {
      if (event.type === 'chunk' && event.audio) {
        const buffer = event.audio instanceof ArrayBuffer
          ? event.audio
          : (event.audio as { buffer: ArrayBuffer }).buffer || event.audio;
        yield new Int16Array(buffer);
      }
      if (event.type === 'done') break;
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export function cartesiaTTS(options: CartesiaTTSOptions): TTSProvider {
  return new CartesiaTTSImpl(options);
}
