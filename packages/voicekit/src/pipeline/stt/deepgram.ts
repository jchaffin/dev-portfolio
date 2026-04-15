/**
 * Deepgram streaming STT provider.
 *
 * Uses `@deepgram/sdk` v5+ for WebSocket streaming transcription.
 *
 * ```ts
 * const stt = deepgramSTT({ apiKey: '...', model: 'nova-3' });
 * ```
 *
 * Peer dependency: @deepgram/sdk (>= 5.0.0)
 */

import type { STTProvider, STTConfig, TranscriptEvent } from '../types';

export interface DeepgramSTTOptions {
  apiKey: string;
  model?: string;
  language?: string;
  interimResults?: boolean;
  smartFormat?: boolean;
  utteranceEndMs?: number;
  keywords?: string[];
}

class DeepgramSTTImpl implements STTProvider {
  readonly name = 'stt:deepgram';
  private connection: any = null;
  private options: DeepgramSTTOptions;
  private transcriptCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private vadCallbacks: ((speaking: boolean) => void)[] = [];

  constructor(options: DeepgramSTTOptions) {
    this.options = options;
  }

  async connect(config?: STTConfig): Promise<void> {
    const { DeepgramClient } = await import('@deepgram/sdk');
    const client = new DeepgramClient({ key: this.options.apiKey });

    this.connection = client.listen.live({
      model: this.options.model || 'nova-3',
      language: config?.language || this.options.language || 'en',
      punctuate: true,
      interim_results: this.options.interimResults ?? config?.interimResults ?? true,
      smart_format: this.options.smartFormat ?? true,
      encoding: 'linear16',
      sample_rate: config?.sampleRate || 16000,
      channels: 1,
      ...(this.options.utteranceEndMs && { utterance_end_ms: this.options.utteranceEndMs }),
      ...(this.options.keywords?.length && { keywords: this.options.keywords }),
    });

    this.connection.on('Results', (data: any) => {
      const alt = data.channel?.alternatives?.[0];
      if (!alt?.transcript) return;

      const evt: TranscriptEvent = {
        text: alt.transcript,
        isFinal: data.is_final ?? false,
        confidence: alt.confidence,
        endOfTurn: data.speech_final ?? false,
      };
      for (const cb of this.transcriptCallbacks) cb(evt);
    });

    this.connection.on('UtteranceEnd', () => {
      for (const cb of this.transcriptCallbacks) {
        cb({ text: '', isFinal: true, endOfTurn: true });
      }
    });

    this.connection.on('SpeechStarted', () => {
      for (const cb of this.vadCallbacks) cb(true);
    });

    await new Promise<void>((resolve, reject) => {
      this.connection.on('open', () => resolve());
      this.connection.on('error', (err: Error) => reject(err));
    });
  }

  sendAudio(pcm16: Int16Array): void {
    if (this.connection) {
      this.connection.send(Buffer.from(pcm16.buffer));
    }
  }

  onTranscript(cb: (event: TranscriptEvent) => void): void {
    this.transcriptCallbacks.push(cb);
  }

  onVAD(cb: (speaking: boolean) => void): void {
    this.vadCallbacks.push(cb);
  }

  close(): void {
    if (this.connection) {
      this.connection.requestClose();
      this.connection = null;
    }
    this.transcriptCallbacks = [];
    this.vadCallbacks = [];
  }
}

export function deepgramSTT(options: DeepgramSTTOptions): STTProvider {
  return new DeepgramSTTImpl(options);
}
