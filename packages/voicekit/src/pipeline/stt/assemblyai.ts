/**
 * AssemblyAI streaming STT provider.
 *
 * Uses `assemblyai` SDK for WebSocket streaming with neural turn detection.
 *
 * ```ts
 * const stt = assemblyaiSTT({ apiKey: '...' });
 * ```
 *
 * Peer dependency: assemblyai (>= 4.29.0)
 */

import type { STTProvider, STTConfig, TranscriptEvent } from '../types';

export interface AssemblyAISTTOptions {
  apiKey: string;
  /** Speech model (default: u3-rt-pro) */
  speechModel?: string;
  /** End-of-turn confidence threshold (default: 0.4) */
  endOfTurnThreshold?: number;
  /** Token expiry in seconds for browser usage (default: 300) */
  tokenExpiresIn?: number;
}

class AssemblyAISTTImpl implements STTProvider {
  readonly name = 'stt:assemblyai';
  private transcriber: any = null;
  private options: AssemblyAISTTOptions;
  private transcriptCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private vadCallbacks: ((speaking: boolean) => void)[] = [];

  constructor(options: AssemblyAISTTOptions) {
    this.options = options;
  }

  async connect(config?: STTConfig): Promise<void> {
    const { AssemblyAI, StreamingTranscriber } = await import('assemblyai');

    const client = new AssemblyAI({ apiKey: this.options.apiKey });
    const token = await client.streaming.createTemporaryToken({
      expires_in_seconds: this.options.tokenExpiresIn || 300,
    });

    this.transcriber = new StreamingTranscriber({
      token: token.token,
      sampleRate: config?.sampleRate || 16000,
      speechModel: this.options.speechModel || 'u3-rt-pro',
      ...(this.options.endOfTurnThreshold != null && {
        endOfTurnConfidenceThreshold: this.options.endOfTurnThreshold,
      }),
    });

    this.transcriber.on('turn', (data: any) => {
      const evt: TranscriptEvent = {
        text: data.transcript || '',
        isFinal: data.turn_is_formatted ?? true,
        endOfTurn: data.end_of_turn ?? false,
      };
      if (evt.text) {
        for (const cb of this.transcriptCallbacks) cb(evt);
      }
    });

    this.transcriber.on('error', (err: Error) => {
      console.error('AssemblyAI STT error:', err);
    });

    await this.transcriber.connect();
  }

  sendAudio(pcm16: Int16Array): void {
    if (this.transcriber) {
      this.transcriber.sendAudio(Buffer.from(pcm16.buffer));
    }
  }

  onTranscript(cb: (event: TranscriptEvent) => void): void {
    this.transcriptCallbacks.push(cb);
  }

  onVAD(cb: (speaking: boolean) => void): void {
    this.vadCallbacks.push(cb);
  }

  close(): void {
    if (this.transcriber) {
      this.transcriber.close();
      this.transcriber = null;
    }
    this.transcriptCallbacks = [];
    this.vadCallbacks = [];
  }
}

export function assemblyaiSTT(options: AssemblyAISTTOptions): STTProvider {
  return new AssemblyAISTTImpl(options);
}
