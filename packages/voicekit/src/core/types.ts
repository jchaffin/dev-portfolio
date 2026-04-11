import type { ToolDefinition } from '../types';

// ============================================================================
// Voice Status
// ============================================================================

export const VoiceStatusEnum = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
} as const;

export type VoiceStatus = (typeof VoiceStatusEnum)[keyof typeof VoiceStatusEnum];

// ============================================================================
// Audio Format Metadata
// ============================================================================

export type AudioEncoding =
  | 'pcm16'
  | 'pcm32f'
  | 'g711_ulaw'
  | 'g711_alaw'
  | 'opus'
  | 'mp3'
  | 'aac';

export interface AudioFormat {
  encoding: AudioEncoding;
  sampleRate: number;
  channels: number;
}

// ============================================================================
// Voice Agent Configuration (provider-agnostic)
// ============================================================================

export interface VoiceAgentConfig {
  name: string;
  instructions: string;
  tools?: ToolDefinition[];
  voice?: string;
  handoffs?: VoiceAgentConfig[];
  /** Lifecycle hooks */
  onConnect?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  /** Middleware that wraps every tool execution */
  toolMiddleware?: ToolMiddleware[];
  /** Initial greeting to send on connect (set to false to disable) */
  greeting?: string | false;
  /** Turn detection mode */
  turnDetection?: 'server_vad' | 'push_to_talk' | 'none';
  /** Input audio format hint */
  inputAudioFormat?: Partial<AudioFormat>;
  /** Output audio format hint */
  outputAudioFormat?: Partial<AudioFormat>;
}

export type ToolMiddleware = (
  toolName: string,
  params: unknown,
  next: (params: unknown) => Promise<unknown>
) => Promise<unknown>;

// ============================================================================
// Session Events (normalized across all providers)
// ============================================================================

export interface SessionEvents {
  [event: string]: (...args: any[]) => void;
  status_change: (status: VoiceStatus) => void;
  user_speech_started: () => void;
  user_speech_ended: (durationMs: number) => void;
  user_transcript: (data: TranscriptData) => void;
  assistant_transcript: (data: TranscriptData) => void;
  tool_call_start: (name: string, input: unknown) => void;
  tool_call_end: (name: string, input: unknown, output: unknown) => void;
  agent_handoff: (from: string, to: string) => void;
  guardrail_tripped: (info: unknown) => void;
  audio_delta: (itemId: string, delta: string) => void;
  vad: (event: VADEvent) => void;
  barge_in: (info: BargeInEvent) => void;
  error: (error: Error) => void;
  /** Escape hatch for provider-specific events not covered by normalized types */
  raw_event: (event: unknown) => void;
}

export interface TranscriptData {
  itemId: string;
  delta?: string;
  text?: string;
  isFinal: boolean;
}

export interface VADEvent {
  type: 'speech_start' | 'speech_end' | 'silence';
  /** RMS energy level (0..1) at the time of the event */
  energy?: number;
  /** Duration of the speech or silence segment in ms */
  durationMs?: number;
  timestamp: number;
}

export interface BargeInEvent {
  /** ID of the assistant item that was interrupted */
  interruptedItemId: string;
  /** How many ms of audio the assistant had played before interruption */
  audioPlayedMs: number;
  /** Estimated fraction of the response that was spoken (0..1) */
  fractionSpoken: number;
  /** The full text the assistant intended to speak */
  fullText?: string;
  /** The truncated text that was actually heard by the user */
  spokenText?: string;
  timestamp: number;
}

// ============================================================================
// Voice Session (what the provider creates)
// ============================================================================

export interface VoiceSession {
  connect(config: ConnectConfig): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(text: string): void | Promise<void>;
  interrupt(): void;
  mute(muted: boolean): void;
  sendRawEvent?(event: Record<string, unknown>): void;

  on<E extends string & keyof SessionEvents>(event: E, handler: SessionEvents[E]): void;
  off<E extends string & keyof SessionEvents>(event: E, handler: SessionEvents[E]): void;
}

export interface ConnectConfig {
  /** Authentication token/key obtained from server handler */
  authToken: string;
  /** HTML audio element for playback */
  audioElement?: HTMLAudioElement;
  /** Extra context passed to the session */
  context?: Record<string, unknown>;
  /** Output guardrails */
  outputGuardrails?: unknown[];
}

// ============================================================================
// Voice Adapter (the provider factory)
// ============================================================================

export interface SessionOptions {
  model?: string;
  language?: string;
  codec?: string;
  voice?: string;
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface VoiceAdapter {
  /** Unique name for this adapter (e.g. 'openai', 'livekit') */
  readonly name: string;
  /** Create a session for the given agent */
  createSession(agent: VoiceAgentConfig, options?: SessionOptions): VoiceSession;
}

// ============================================================================
// Server-side types
// ============================================================================

export interface ServerSessionConfig {
  /** Provider-specific API key */
  apiKey?: string;
  model?: string;
  voice?: string;
  instructions?: string;
  expiresIn?: number;
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface ServerAdapter {
  createSessionHandler(config?: ServerSessionConfig): (request?: Request) => Promise<Response>;
  getSessionToken(config?: ServerSessionConfig): Promise<
    { token: string; error?: string } | { token?: string; error: string }
  >;
}
