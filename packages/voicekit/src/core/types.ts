import type { ToolDefinition } from '../types';

// ============================================================================
// Voice Status
// ============================================================================

export type VoiceStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

// ============================================================================
// Voice Agent Configuration (provider-agnostic)
// ============================================================================

export interface VoiceAgentConfig {
  name: string;
  instructions: string;
  tools?: ToolDefinition[];
  voice?: string;
  handoffs?: VoiceAgentConfig[];
}

// ============================================================================
// Session Events (normalized across all providers)
// ============================================================================

export interface SessionEvents {
  [event: string]: (...args: any[]) => void;
  status_change: (status: VoiceStatus) => void;
  user_speech_started: () => void;
  user_transcript: (data: TranscriptData) => void;
  assistant_transcript: (data: TranscriptData) => void;
  tool_call_start: (name: string, input: unknown) => void;
  tool_call_end: (name: string, input: unknown, output: unknown) => void;
  agent_handoff: (from: string, to: string) => void;
  guardrail_tripped: (info: unknown) => void;
  audio_delta: (itemId: string, delta: string) => void;
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
