/**
 * Pipeline provider interfaces for composable voice agents.
 *
 * Mix and match STT, LLM, and TTS providers:
 * ```ts
 * createVoicePipeline({
 *   stt: deepgramSTT({ apiKey: '...' }),
 *   llm: openaiCompatibleLLM({ baseURL: 'https://openrouter.ai/api/v1', apiKey: '...' }),
 *   tts: cartesiaTTS({ apiKey: '...', voice: '...' }),
 * })
 * ```
 */

// ============================================================================
// Chat message types (OpenAI-compatible)
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

// ============================================================================
// STT Provider
// ============================================================================

export interface STTConfig {
  sampleRate?: number;
  language?: string;
  /** Vocabulary hints for better transcription accuracy */
  prompt?: string;
  /** Whether to enable interim/partial results */
  interimResults?: boolean;
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  /** Confidence score 0-1, if available */
  confidence?: number;
  /** Whether this transcript signals end-of-turn */
  endOfTurn?: boolean;
}

export interface STTProvider {
  readonly name: string;
  connect(config?: STTConfig): Promise<void>;
  /** Send raw PCM16 audio samples */
  sendAudio(pcm16: Int16Array): void;
  /** Register transcript callback. Multiple callbacks are supported. */
  onTranscript(cb: (event: TranscriptEvent) => void): void;
  /** Register VAD event callback */
  onVAD?(cb: (speaking: boolean) => void): void;
  close(): Promise<void> | void;
}

// ============================================================================
// LLM Provider
// ============================================================================

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** System prompt prepended to every request */
  systemPrompt?: string;
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface LLMStreamEvent {
  type: 'delta' | 'tool_call' | 'done';
  /** Text delta for type='delta' */
  delta?: string;
  /** Tool call for type='tool_call' */
  toolCall?: ToolCall;
  /** Usage stats for type='done' */
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LLMProvider {
  readonly name: string;
  /**
   * Stream a chat completion. Yields text deltas, tool calls, and a final done event.
   * The caller is responsible for managing the message history.
   */
  stream(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    config?: LLMConfig,
  ): AsyncIterable<LLMStreamEvent>;
}

// ============================================================================
// TTS Provider
// ============================================================================

export interface TTSConfig {
  voice?: string;
  /** Output sample rate in Hz */
  sampleRate?: number;
  /** Speaking speed multiplier (1.0 = normal) */
  speed?: number;
  /** Output audio encoding */
  encoding?: 'pcm16' | 'pcm32f' | 'mp3' | 'opus';
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface TTSProvider {
  readonly name: string;
  /** Open a persistent connection (for WebSocket-based providers) */
  connect?(config?: TTSConfig): Promise<void>;
  /** Synthesize text into streaming audio chunks (PCM16 by default) */
  synthesize(text: string): AsyncIterable<Int16Array>;
  /** Signal no more text — flush remaining audio */
  flush?(): AsyncIterable<Int16Array>;
  close?(): Promise<void> | void;
}

// ============================================================================
// Pipeline Configuration
// ============================================================================

export interface VoicePipelineConfig {
  stt: STTProvider;
  llm: LLMProvider;
  tts: TTSProvider;
  /** System prompt for the LLM */
  systemPrompt?: string;
  /** Tools available to the LLM */
  tools?: ToolDefinition[];
  /** Local tool executors keyed by tool name */
  toolExecutors?: Record<string, (args: Record<string, unknown>) => Promise<unknown> | unknown>;
  /** Sentence boundary detection for TTS buffering (default: true) */
  sentenceBuffer?: boolean;
  /** VAD-based interruption handling (default: true) */
  interruptOnSpeech?: boolean;
}

// ============================================================================
// Telephony Transport
// ============================================================================

export interface TelephonyConfig {
  /** Audio encoding from the telephony provider */
  encoding?: 'mulaw' | 'alaw' | 'pcm16';
  sampleRate?: number;
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface TelephonyTransport {
  readonly name: string;
  /** Accept an inbound call or initiate outbound */
  connect(config?: TelephonyConfig): Promise<void>;
  /** Register callback for incoming audio */
  onAudio(cb: (audio: Int16Array) => void): void;
  /** Send synthesized audio back to the caller */
  sendAudio(audio: Int16Array): void;
  /** Register callback for call events (hangup, dtmf, etc.) */
  onEvent?(cb: (event: { type: string; [key: string]: unknown }) => void): void;
  close(): Promise<void> | void;
}
