/**
 * Whisper STT provider (REST-based, batch per utterance).
 *
 * Works with OpenAI Whisper and Groq Whisper (any OpenAI-compatible transcription endpoint).
 * Not true streaming -- buffers audio and transcribes on end-of-speech.
 * Best paired with a VAD to detect utterance boundaries.
 *
 * ```ts
 * const stt = whisperSTT({ apiKey: '...', baseURL: 'https://api.groq.com/openai/v1' });
 * ```
 */

import type { STTProvider, STTConfig, TranscriptEvent } from '../types';

export interface WhisperSTTOptions {
  apiKey: string;
  /** Base URL for the API (default: https://api.openai.com/v1) */
  baseURL?: string;
  /** Model name (default: whisper-1 for OpenAI, whisper-large-v3-turbo for Groq) */
  model?: string;
  language?: string;
  /** Vocabulary prompt for better accuracy */
  prompt?: string;
  /** Maximum silence before auto-transcribe (ms, default: 1000) */
  silenceThresholdMs?: number;
  /** Minimum audio length before transcribing (ms, default: 500) */
  minAudioMs?: number;
}

class WhisperSTTImpl implements STTProvider {
  readonly name: string;
  private options: WhisperSTTOptions;
  private transcriptCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private audioChunks: Int16Array[] = [];
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private sampleRate = 16000;
  private connected = false;

  constructor(options: WhisperSTTOptions) {
    this.options = options;
    const baseURL = options.baseURL || 'https://api.openai.com/v1';
    this.name = baseURL.includes('groq.com') ? 'stt:groq-whisper' : 'stt:openai-whisper';
  }

  async connect(config?: STTConfig): Promise<void> {
    this.sampleRate = config?.sampleRate || 16000;
    this.connected = true;
  }

  sendAudio(pcm16: Int16Array): void {
    if (!this.connected) return;
    this.audioChunks.push(pcm16);

    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.transcribeBuffered();
    }, this.options.silenceThresholdMs || 1000);
  }

  onTranscript(cb: (event: TranscriptEvent) => void): void {
    this.transcriptCallbacks.push(cb);
  }

  close(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.transcribeBuffered();
    this.connected = false;
    this.transcriptCallbacks = [];
  }

  private async transcribeBuffered(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    const chunks = this.audioChunks;
    this.audioChunks = [];

    const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0);
    const minSamples = (this.options.minAudioMs || 500) * this.sampleRate / 1000;
    if (totalSamples < minSamples) return;

    const merged = new Int16Array(totalSamples);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const wav = encodeWAV(merged, this.sampleRate);
    const blob = new Blob([wav], { type: 'audio/wav' });

    const baseURL = (this.options.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const defaultModel = baseURL.includes('groq.com') ? 'whisper-large-v3-turbo' : 'whisper-1';

    const form = new FormData();
    form.append('file', blob, 'audio.wav');
    form.append('model', this.options.model || defaultModel);
    if (this.options.language) form.append('language', this.options.language);
    if (this.options.prompt) form.append('prompt', this.options.prompt);

    try {
      const res = await fetch(`${baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.options.apiKey}` },
        body: form,
      });

      if (!res.ok) return;
      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) {
        for (const cb of this.transcriptCallbacks) {
          cb({ text, isFinal: true, endOfTurn: true });
        }
      }
    } catch {
      // Transcription failure is non-fatal
    }
  }
}

function encodeWAV(pcm16: Int16Array, sampleRate: number): ArrayBuffer {
  const dataLength = pcm16.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(44 + i * 2, pcm16[i], true);
  }

  return buffer;
}

export function whisperSTT(options: WhisperSTTOptions): STTProvider {
  return new WhisperSTTImpl(options);
}
