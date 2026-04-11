import type { VoiceAgentConfig, VoiceAdapter, VoiceStatus } from './core/types';

// ============================================================================
// Status & Connection
// ============================================================================

// Re-export from core so consumers don't need two imports
export type { VoiceStatus } from './core/types';
export { VoiceStatusEnum } from './core/types';

// ============================================================================
// Transcript
// ============================================================================

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  status: 'pending' | 'complete';
}

// ============================================================================
// Tools
// ============================================================================

export type ToolParamType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface ToolParamDefinition {
  type: ToolParamType;
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParamDefinition>;
    required?: string[];
  };
  execute: (params: TParams) => Promise<TResult> | TResult;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  name: string;
  instructions: string;
  tools?: ToolDefinition[];
  voice?: string;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface VoiceConfig {
  /** API endpoint that returns session token */
  sessionEndpoint?: string;
  /** Model identifier (provider-specific) */
  model?: string;
  /** Audio codec preference */
  codec?: 'opus' | 'pcmu' | 'pcma';
  /** Language for transcription */
  language?: string;
  onStatusChange?: (status: VoiceStatus) => void;
  onTranscriptUpdate?: (messages: TranscriptMessage[]) => void;
  onToolCall?: (toolName: string, params: unknown, result: unknown) => void;
  onError?: (error: Error) => void;
}

export interface VoiceProviderProps extends VoiceConfig {
  /** Provider adapter (e.g. openai(), livekit(), deepgram()) */
  adapter: VoiceAdapter;
  /** Agent configuration */
  agent: VoiceAgentConfig;
  children: React.ReactNode;
}

// ============================================================================
// Context Value
// ============================================================================

export interface VoiceContextValue {
  status: VoiceStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  transcript: TranscriptMessage[];
  clearTranscript: () => void;

  sendMessage: (text: string) => void;
  interrupt: () => void;

  mute: (muted: boolean) => void;
  isMuted: boolean;

  agent: VoiceAgentConfig;
}
