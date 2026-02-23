type VoiceStatus$1 = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
interface TranscriptMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    status: 'pending' | 'complete';
}
type ToolParamType = 'string' | 'number' | 'boolean' | 'array' | 'object';
interface ToolParamDefinition {
    type: ToolParamType;
    description?: string;
    enum?: string[];
    default?: unknown;
}
interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, ToolParamDefinition>;
        required?: string[];
    };
    execute: (params: TParams) => Promise<TResult> | TResult;
}
interface AgentConfig {
    name: string;
    instructions: string;
    tools?: ToolDefinition[];
    voice?: string;
}
interface VoiceConfig {
    /** API endpoint that returns session token */
    sessionEndpoint?: string;
    /** Model identifier (provider-specific) */
    model?: string;
    /** Audio codec preference */
    codec?: 'opus' | 'pcmu' | 'pcma';
    /** Language for transcription */
    language?: string;
    onStatusChange?: (status: VoiceStatus$1) => void;
    onTranscriptUpdate?: (messages: TranscriptMessage[]) => void;
    onToolCall?: (toolName: string, params: unknown, result: unknown) => void;
    onError?: (error: Error) => void;
}
interface VoiceProviderProps extends VoiceConfig {
    /** Provider adapter (e.g. openai(), livekit(), deepgram()) */
    adapter: VoiceAdapter;
    /** Agent configuration */
    agent: VoiceAgentConfig;
    children: React.ReactNode;
}
interface VoiceContextValue {
    status: VoiceStatus$1;
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

type VoiceStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
interface VoiceAgentConfig {
    name: string;
    instructions: string;
    tools?: ToolDefinition[];
    voice?: string;
    handoffs?: VoiceAgentConfig[];
}
interface SessionEvents {
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
interface TranscriptData {
    itemId: string;
    delta?: string;
    text?: string;
    isFinal: boolean;
}
interface VoiceSession {
    connect(config: ConnectConfig): Promise<void>;
    disconnect(): Promise<void>;
    sendMessage(text: string): void;
    interrupt(): void;
    mute(muted: boolean): void;
    sendRawEvent?(event: Record<string, unknown>): void;
    on<E extends string & keyof SessionEvents>(event: E, handler: SessionEvents[E]): void;
    off<E extends string & keyof SessionEvents>(event: E, handler: SessionEvents[E]): void;
}
interface ConnectConfig {
    /** Authentication token/key obtained from server handler */
    authToken: string;
    /** HTML audio element for playback */
    audioElement?: HTMLAudioElement;
    /** Extra context passed to the session */
    context?: Record<string, unknown>;
    /** Output guardrails */
    outputGuardrails?: unknown[];
}
interface SessionOptions {
    model?: string;
    language?: string;
    codec?: string;
    voice?: string;
    /** Provider-specific options */
    [key: string]: unknown;
}
interface VoiceAdapter {
    /** Unique name for this adapter (e.g. 'openai', 'livekit') */
    readonly name: string;
    /** Create a session for the given agent */
    createSession(agent: VoiceAgentConfig, options?: SessionOptions): VoiceSession;
}
interface ServerSessionConfig {
    /** Provider-specific API key */
    apiKey?: string;
    model?: string;
    voice?: string;
    instructions?: string;
    expiresIn?: number;
    /** Provider-specific options */
    [key: string]: unknown;
}
interface ServerAdapter {
    createSessionHandler(config?: ServerSessionConfig): (request?: Request) => Promise<Response>;
    getSessionToken(config?: ServerSessionConfig): Promise<{
        token: string;
        error?: never;
    } | {
        token?: never;
        error: string;
    }>;
}

export type { AgentConfig as A, ConnectConfig as C, ServerAdapter as S, TranscriptMessage as T, VoiceProviderProps as V, VoiceContextValue as a, VoiceAgentConfig as b, ToolDefinition as c, ToolParamDefinition as d, VoiceAdapter as e, VoiceStatus$1 as f, ServerSessionConfig as g, SessionEvents as h, SessionOptions as i, TranscriptData as j, VoiceConfig as k, VoiceSession as l };
