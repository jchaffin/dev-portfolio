/**
 * ElevenLabs streaming TTS provider.
 *
 * Uses `@elevenlabs/elevenlabs-js` SDK for streaming text-to-speech.
 *
 * ```ts
 * const tts = elevenlabsTTS({ apiKey: '...', voice: 'voice-id' });
 * ```
 *
 * Peer dependency: @elevenlabs/elevenlabs-js (>= 1.0.0)
 */

import type { TTSProvider, TTSConfig } from '../types';

export interface ElevenLabsTTSOptions {
  apiKey: string;
  voice: string;
  /** Model (default: eleven_flash_v2_5 for lowest latency) */
  model?: string;
}

class ElevenLabsTTSImpl implements TTSProvider {
  readonly name = 'tts:elevenlabs';
  private client: any = null;
  private options: ElevenLabsTTSOptions;

  constructor(options: ElevenLabsTTSOptions) {
    this.options = options;
  }

  private async getClient() {
    if (!this.client) {
      const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
      this.client = new ElevenLabsClient({ apiKey: this.options.apiKey });
    }
    return this.client;
  }

  async *synthesize(text: string): AsyncIterable<Int16Array> {
    const client = await this.getClient();

    const audioStream = await client.textToSpeech.stream(this.options.voice, {
      text,
      model_id: this.options.model || 'eleven_flash_v2_5',
      output_format: 'pcm_16000',
    });

    for await (const chunk of audioStream) {
      if (chunk instanceof Uint8Array || chunk instanceof Buffer) {
        yield new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / 2));
      }
    }
  }

  close(): void {
    this.client = null;
  }
}

export function elevenlabsTTS(options: ElevenLabsTTSOptions): TTSProvider {
  return new ElevenLabsTTSImpl(options);
}
