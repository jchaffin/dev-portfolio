import { V as VoiceProviderProps, a as VoiceContextValue, T as TranscriptMessage, A as AgentConfig, b as VoiceAgentConfig, c as ToolDefinition, d as ToolParamDefinition, e as VoiceAdapter, f as VoiceStatus } from './types-DY31oVB1.js';
export { C as ConnectConfig, S as ServerAdapter, g as ServerSessionConfig, h as SessionEvents, i as SessionOptions, j as TranscriptData, k as VoiceConfig, l as VoiceSession } from './types-DY31oVB1.js';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React from 'react';
import React__default, { FC, PropsWithChildren } from 'react';
import { z } from 'zod';

/**
 * Provider component that enables voice functionality.
 * Pass a provider adapter (e.g. `openai()`, `livekit()`) to connect to
 * different voice backends without changing any other code.
 *
 * @example
 * ```tsx
 * import { VoiceProvider, createAgent } from '@jchaffin/voicekit';
 * import { openai } from '@jchaffin/voicekit/openai';
 *
 * const agent = createAgent({
 *   name: 'Assistant',
 *   instructions: 'You are helpful.'
 * });
 *
 * function App() {
 *   return (
 *     <VoiceProvider adapter={openai()} agent={agent}>
 *       <MyChat />
 *     </VoiceProvider>
 *   );
 * }
 * ```
 */
declare function VoiceProvider({ children, adapter, agent, sessionEndpoint, model, language, onStatusChange, onTranscriptUpdate, onToolCall, onError, }: VoiceProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access voice functionality.
 * Must be used within a VoiceProvider.
 */
declare function useVoice(): VoiceContextValue;

interface TranscriptProps {
    messages: TranscriptMessage[];
    userClassName?: string;
    assistantClassName?: string;
    emptyMessage?: React__default.ReactNode;
}
declare function Transcript({ messages, userClassName, assistantClassName, emptyMessage }: TranscriptProps): react_jsx_runtime.JSX.Element;
interface StatusIndicatorProps {
    className?: string;
    connectedText?: string;
    connectingText?: string;
    disconnectedText?: string;
}
declare function StatusIndicator({ className, connectedText, connectingText, disconnectedText }: StatusIndicatorProps): react_jsx_runtime.JSX.Element;
interface ConnectButtonProps {
    className?: string;
    connectText?: string;
    disconnectText?: string;
    connectingText?: string;
    children?: React__default.ReactNode;
}
declare function ConnectButton({ className, connectText, disconnectText, connectingText, children, }: ConnectButtonProps): react_jsx_runtime.JSX.Element;
interface ChatInputProps {
    placeholder?: string;
    className?: string;
    buttonText?: string;
    onSend?: (text: string) => void;
}
declare function ChatInput({ placeholder, className, buttonText, onSend, }: ChatInputProps): react_jsx_runtime.JSX.Element;
interface VoiceChatProps {
    /** Custom class for the container */
    className?: string;
    /** Height of the chat area */
    height?: string;
    /** Show header with status */
    showHeader?: boolean;
    /** Show input field */
    showInput?: boolean;
    /** Custom empty state */
    emptyState?: React__default.ReactNode;
    /** Custom header content */
    header?: React__default.ReactNode;
    /** Custom footer content */
    footer?: React__default.ReactNode;
}
/**
 * Complete voice chat interface component
 *
 * @example
 * ```tsx
 * <VoiceProvider agent={agent}>
 *   <VoiceChat height="400px" />
 * </VoiceProvider>
 * ```
 */
declare function VoiceChat({ className, height, showHeader, showInput, emptyState, header, footer, }: VoiceChatProps): react_jsx_runtime.JSX.Element;

/**
 * Create a voice agent config with simplified configuration.
 * Returns a plain object; the provider adapter converts it to the
 * provider-specific format at connection time.
 *
 * @example
 * ```ts
 * const agent = createAgent({
 *   name: 'Assistant',
 *   instructions: 'You are a helpful assistant.',
 *   tools: [weatherTool, navigationTool]
 * });
 * ```
 */
declare function createAgent(config: AgentConfig): VoiceAgentConfig;
/**
 * Create an agent using a structured template.
 *
 * @example
 * ```ts
 * const agent = createAgentFromTemplate({
 *   name: 'Support Bot',
 *   role: 'customer support agent for an e-commerce site',
 *   personality: 'Friendly, patient, solution-oriented',
 *   capabilities: ['Answer product questions', 'Help with order status'],
 *   tools: [orderTool, productTool]
 * });
 * ```
 */
declare function createAgentFromTemplate(config: {
    name: string;
    role: string;
    personality?: string;
    capabilities?: string[];
    constraints?: string[];
    tools?: ToolDefinition[];
    context?: Record<string, unknown>;
}): VoiceAgentConfig;

type InferParamType<T extends ToolParamDefinition> = T['type'] extends 'string' ? string : T['type'] extends 'number' ? number : T['type'] extends 'boolean' ? boolean : T['type'] extends 'array' ? unknown[] : T['type'] extends 'object' ? Record<string, unknown> : unknown;
type InferParams<T extends Record<string, ToolParamDefinition>> = {
    [K in keyof T]: InferParamType<T[K]>;
};
/**
 * Define a tool with full type inference
 *
 * @example
 * ```ts
 * const weatherTool = defineTool({
 *   name: 'get_weather',
 *   description: 'Get current weather for a location',
 *   parameters: {
 *     location: { type: 'string', description: 'City name' },
 *     unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
 *   },
 *   required: ['location'],
 *   execute: async ({ location, unit }) => {
 *     return { temp: 72, unit, location };
 *   }
 * });
 * ```
 */
declare function defineTool<TParams extends Record<string, ToolParamDefinition>, TResult = unknown>(config: {
    name: string;
    description: string;
    parameters: TParams;
    required?: (keyof TParams)[];
    execute: (params: InferParams<TParams>) => Promise<TResult> | TResult;
}): ToolDefinition<InferParams<TParams>, TResult>;
/**
 * Create a navigation tool for single-page apps
 *
 * @example
 * ```ts
 * const navTool = createNavigationTool(['about', 'projects', 'contact']);
 * ```
 */
declare function createNavigationTool(sections: string[]): ToolDefinition<{
    section: string;
}, {
    success: boolean;
    section?: string;
    error?: string;
}>;
/**
 * Create a tool that dispatches a custom event for UI updates
 *
 * @example
 * ```ts
 * const showModalTool = createEventTool({
 *   name: 'show_modal',
 *   description: 'Show a modal dialog',
 *   parameters: { title: { type: 'string' } },
 *   eventType: 'voice:show-modal'
 * });
 *
 * // Listen in React:
 * useEffect(() => {
 *   const handler = (e) => setModal(e.detail.params);
 *   window.addEventListener('voice:show-modal', handler);
 *   return () => window.removeEventListener('voice:show-modal', handler);
 * }, []);
 * ```
 */
declare function createEventTool<TParams extends Record<string, ToolParamDefinition>>(config: {
    name: string;
    description: string;
    parameters: TParams;
    required?: (keyof TParams)[];
    eventType: string;
}): ToolDefinition<InferParams<TParams>, {
    success: boolean;
}>;
/**
 * Create a tool that calls an API endpoint
 *
 * @example
 * ```ts
 * const searchTool = createAPITool({
 *   name: 'search',
 *   description: 'Search the database',
 *   parameters: { query: { type: 'string' } },
 *   required: ['query'],
 *   endpoint: '/api/search',
 *   method: 'POST'
 * });
 * ```
 */
declare function createAPITool<TParams extends Record<string, ToolParamDefinition>, TResult = unknown>(config: {
    name: string;
    description: string;
    parameters: TParams;
    required?: (keyof TParams)[];
    endpoint: string | ((params: InferParams<TParams>) => string);
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    transform?: (response: unknown) => TResult;
}): ToolDefinition<InferParams<TParams>, TResult | {
    success: false;
    error: string;
}>;
/**
 * Create a tool that searches projects/content by technology or keyword
 *
 * @example
 * ```ts
 * const findProjectsTool = createSearchTool({
 *   name: 'find_projects_by_tech',
 *   description: 'Find projects that use a specific technology',
 *   searchParam: 'technology',
 *   endpoint: '/api/search',
 *   // OR custom fetch function:
 *   fetch: async (query) => {
 *     const res = await fetch(`/api/rag?q=${query}`);
 *     return res.json();
 *   }
 * });
 * ```
 */
declare function createSearchTool<TResult = unknown>(config: {
    name: string;
    description: string;
    /** Parameter name shown to the model (e.g. 'technology', 'query', 'keyword') */
    searchParam?: string;
    /** Simple endpoint - will POST { query: value } */
    endpoint?: string;
    /** Custom fetch function for complex queries */
    fetch?: (query: string) => Promise<TResult>;
    /** Transform the response */
    transform?: (response: TResult) => unknown;
    /** Event to dispatch with results (for UI updates) */
    eventType?: string;
}): ToolDefinition;
/**
 * Create a RAG-powered search tool
 *
 * @example
 * ```ts
 * const ragTool = createRAGTool({
 *   name: 'search_codebase',
 *   description: 'Search the codebase for relevant code snippets',
 *   endpoint: '/api/rag'
 * });
 * ```
 */
declare function createRAGTool(config: {
    name: string;
    description: string;
    endpoint: string;
    /** Optional: filter by repo name */
    repo?: string;
    /** Number of results to return */
    limit?: number;
    /** Event to dispatch with results */
    eventType?: string;
}): ToolDefinition;
/** Event name for tool results */
declare const TOOL_RESULT_EVENT = "voicekit:tool-result";

interface ToolResult<T = unknown> {
    name: string;
    input: unknown;
    result: T;
    timestamp: number;
}
/**
 * Hook to listen for all tool results
 *
 * @example
 * ```tsx
 * function ToolDebugger() {
 *   const { results, lastResult } = useToolResults();
 *
 *   return (
 *     <div>
 *       <h3>Last Tool: {lastResult?.name}</h3>
 *       <pre>{JSON.stringify(lastResult?.result, null, 2)}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
declare function useToolResults(): {
    results: ToolResult<unknown>[];
    lastResult: ToolResult<unknown>;
    clear: () => void;
};
type ToolHandler<T = unknown> = (input: unknown, result: T) => void;
/**
 * Hook to register handlers for specific tools
 *
 * @example
 * ```tsx
 * function ProjectDisplay() {
 *   const [projects, setProjects] = useState([]);
 *
 *   useToolListener('get_projects', (input, result) => {
 *     if (result.success) {
 *       setProjects(result.projects);
 *     }
 *   });
 *
 *   return <ProjectList projects={projects} />;
 * }
 * ```
 */
declare function useToolListener<T = unknown>(toolName: string, handler: ToolHandler<T>): void;
/**
 * Hook to get the latest result from a specific tool
 *
 * @example
 * ```tsx
 * function ContactModal() {
 *   const { result, input, clear } = useToolResult('open_contact');
 *
 *   if (!result) return null;
 *
 *   return (
 *     <Modal onClose={clear}>
 *       <ContactForm prefill={input} />
 *     </Modal>
 *   );
 * }
 * ```
 */
declare function useToolResult<T = unknown>(toolName: string): {
    input: {} | null;
    result: NonNullable<T> | null;
    hasResult: boolean;
    clear: () => void;
};

/**
 * Hook for recording audio from a MediaStream
 *
 * @example
 * ```tsx
 * const { startRecording, stopRecording, downloadRecording } = useAudioRecorder();
 *
 * // Start recording from audio element
 * const stream = audioElement.srcObject as MediaStream;
 * startRecording(stream);
 *
 * // Later...
 * stopRecording();
 * await downloadRecording(); // Downloads as WAV
 * ```
 */
declare function useAudioRecorder(): {
    startRecording: (stream: MediaStream) => Promise<void>;
    stopRecording: () => void;
    downloadRecording: (filename?: string) => Promise<Blob | null>;
    getRecordingBlob: () => Promise<Blob | null>;
    clearRecording: () => void;
    isRecording: () => boolean;
};

interface RealtimeSessionCallbacks {
    onConnectionChange?: (status: VoiceStatus) => void;
    onAgentHandoff?: (agentName: string) => void;
}
interface ConnectOptions {
    getEphemeralKey: () => Promise<string>;
    /** Agent config or array of agent configs. First entry is the root agent. */
    initialAgents: VoiceAgentConfig[];
    audioElement?: HTMLAudioElement;
    extraContext?: Record<string, unknown>;
    outputGuardrails?: unknown[];
    /** Provider adapter to use. Required for new-style usage. */
    adapter?: VoiceAdapter;
}
declare function useRealtimeSession(callbacks?: RealtimeSessionCallbacks): {
    readonly status: VoiceStatus;
    readonly connect: ({ getEphemeralKey, initialAgents, audioElement, extraContext, outputGuardrails, adapter, }: ConnectOptions) => Promise<void>;
    readonly disconnect: () => Promise<void>;
    readonly sendUserText: (text: string) => void;
    readonly sendEvent: (ev: Record<string, unknown>) => void;
    readonly mute: (m: boolean) => void;
    readonly pushToTalkStart: () => void;
    readonly pushToTalkStop: () => void;
    readonly interrupt: () => void;
};

declare function useSessionHistory(): React.MutableRefObject<{
    handleAgentToolStart: (details: Record<string, unknown>, _agent: unknown, functionCall: Record<string, unknown>) => void;
    handleAgentToolEnd: (details: Record<string, unknown>, _agent: unknown, functionCall: Record<string, unknown>, result: unknown) => void;
    handleHistoryUpdated: (items: Record<string, unknown>[]) => void;
    handleHistoryAdded: (item: Record<string, unknown>) => void;
    handleTranscriptionDelta: (item: Record<string, unknown>, audioPositionMs?: number) => void;
    handleTranscriptionCompleted: (item: Record<string, unknown>) => void;
    isInterrupted: (itemId: string) => boolean;
    handleTruncation: (itemId: string, audioEndMs: number, totalAudioMs: number) => void;
    handleGuardrailTripped: (details: Record<string, unknown>, _agent: unknown, guardrail: Record<string, unknown>) => void;
}>;

interface TranscriptItem {
    itemId: string;
    type: 'MESSAGE' | 'BREADCRUMB';
    role?: 'user' | 'assistant';
    title: string;
    data?: Record<string, unknown>;
    expanded: boolean;
    timestamp: string;
    createdAtMs: number;
    status: 'IN_PROGRESS' | 'DONE';
    isHidden: boolean;
    guardrailResult?: {
        status: 'IN_PROGRESS' | 'DONE';
        category: string;
        rationale: string;
        testText?: string;
    };
}
interface TranscriptContextValue {
    transcriptItems: TranscriptItem[];
    addTranscriptMessage: (itemId: string, role: 'user' | 'assistant', text: string, isHidden?: boolean) => void;
    updateTranscriptMessage: (itemId: string, text: string, isDelta: boolean) => void;
    addTranscriptBreadcrumb: (title: string, data?: Record<string, unknown>) => void;
    toggleTranscriptItemExpand: (itemId: string) => void;
    updateTranscriptItem: (itemId: string, updatedProperties: Partial<TranscriptItem>) => void;
    clearTranscript: () => void;
}
declare const TranscriptProvider: FC<PropsWithChildren>;
declare function useTranscript(): TranscriptContextValue;

interface LoggedEvent {
    id: number | string;
    direction: 'client' | 'server';
    eventName: string;
    eventData: Record<string, unknown>;
    timestamp: string;
    expanded: boolean;
}
interface EventData {
    [key: string]: unknown;
    event_id?: string | number;
    type?: string;
}
interface HistoryItem {
    type: string;
    role: string;
    content: unknown[];
    status?: string;
    name?: string;
}
interface EventContextValue {
    loggedEvents: LoggedEvent[];
    logClientEvent: (eventObj: EventData, eventNameSuffix?: string) => void;
    logServerEvent: (eventObj: EventData, eventNameSuffix?: string) => void;
    logHistoryItem: (item: HistoryItem) => void;
    toggleExpand: (id: number | string) => void;
    clearEvents: () => void;
}
declare const EventProvider: FC<PropsWithChildren>;
declare function useEvent(): EventContextValue;

declare const MODERATION_CATEGORIES: readonly ["OFFENSIVE", "OFF_BRAND", "VIOLENCE", "NONE"];
type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];
declare const ModerationCategoryZod: z.ZodEnum<{
    NONE: "NONE";
    OFFENSIVE: "OFFENSIVE";
    OFF_BRAND: "OFF_BRAND";
    VIOLENCE: "VIOLENCE";
}>;
declare const GuardrailOutputZod: z.ZodObject<{
    moderationRationale: z.ZodString;
    moderationCategory: z.ZodEnum<{
        NONE: "NONE";
        OFFENSIVE: "OFFENSIVE";
        OFF_BRAND: "OFF_BRAND";
        VIOLENCE: "VIOLENCE";
    }>;
    testText: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
type GuardrailOutput = z.infer<typeof GuardrailOutputZod>;
interface GuardrailResult {
    status: 'IN_PROGRESS' | 'DONE';
    testText?: string;
    category?: ModerationCategory;
    rationale?: string;
}
interface OutputGuardrailResult {
    tripwireTriggered: boolean;
    outputInfo: GuardrailOutput | {
        error: string;
    };
}
interface OutputGuardrailArgs {
    agentOutput: string;
    agent?: unknown;
    context?: unknown;
}
interface OutputGuardrail {
    name: string;
    execute: (args: OutputGuardrailArgs) => Promise<OutputGuardrailResult>;
}
interface GuardrailClassifierConfig {
    apiEndpoint?: string;
    model?: string;
    categories?: readonly string[];
    companyName?: string;
}
/**
 * Run the guardrail classifier against a message
 */
declare function runGuardrailClassifier(message: string, config?: GuardrailClassifierConfig): Promise<GuardrailOutput | null>;
/**
 * Create a moderation guardrail for output filtering
 */
declare function createModerationGuardrail(config?: GuardrailClassifierConfig): OutputGuardrail;
/**
 * Create a custom guardrail with your own classifier function
 */
declare function createCustomGuardrail(name: string, classifier: (output: string) => Promise<{
    triggered: boolean;
    info: unknown;
}>): OutputGuardrail;

/**
 * User-in-the-loop suggestion system.
 *
 * Tools can emit structured suggestions that render as interactive chips.
 * When a user clicks one, a message is sent back to the voice agent,
 * closing the loop.
 */
interface SuggestionItem {
    id: string;
    label: string;
    /** Text message to send to the agent when selected */
    message: string;
    /** Optional icon identifier for the consumer to map */
    icon?: string;
    /** Optional secondary text */
    description?: string;
    /** Freeform metadata the consumer can use for rendering */
    meta?: Record<string, unknown>;
}
type SuggestionType = 'action' | 'project' | 'experience' | 'skill' | 'section' | string;
interface SuggestionGroup {
    /** Category of these suggestions */
    type: SuggestionType;
    /** Items to display */
    items: SuggestionItem[];
    /** Optional heading shown above the chips */
    prompt?: string;
}
interface SuggestionsContextValue {
    /** Current suggestion group (null when none are active) */
    suggestions: SuggestionGroup | null;
    /** Push a new suggestion group (typically called from a tool) */
    setSuggestions: (group: SuggestionGroup | null) => void;
    /** Handle a user clicking a suggestion: sends the message and clears */
    selectSuggestion: (item: SuggestionItem) => void;
    /** Clear current suggestions */
    clearSuggestions: () => void;
}
declare const SUGGESTION_EVENT = "voicekit:suggestions";

interface SuggestionProviderProps {
    children: React__default.ReactNode;
    /**
     * Called when the user clicks a suggestion.
     * Typically wired to `sendMessage(item.message)` on the voice session.
     */
    onSelect?: (item: SuggestionItem) => void;
    /** If true, auto-clear suggestions on select (default: true) */
    autoClear?: boolean;
}
declare function SuggestionProvider({ children, onSelect, autoClear, }: SuggestionProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Access the suggestion system from any component inside a SuggestionProvider.
 */
declare function useSuggestions(): SuggestionsContextValue;

/**
 * Emit a suggestion group from a tool.
 * Works in both React (via DOM event → SuggestionProvider) and vanilla contexts.
 *
 * @example
 * ```ts
 * import { emitSuggestions } from '@jchaffin/voicekit';
 *
 * const getProjects = defineTool({
 *   name: 'get_projects',
 *   execute: async () => {
 *     const projects = await fetchProjects();
 *     emitSuggestions({
 *       type: 'project',
 *       prompt: 'Projects:',
 *       items: projects.map(p => ({
 *         id: p.name,
 *         label: p.name,
 *         message: `Tell me about the ${p.name} project`,
 *         description: p.description,
 *         meta: { url: p.url, github: p.github },
 *       })),
 *     });
 *     return { success: true, projects };
 *   }
 * });
 * ```
 */
declare function emitSuggestions(group: SuggestionGroup): void;
/**
 * Clear the current suggestions.
 */
declare function clearSuggestions(): void;

interface SuggestionChipsProps {
    /** Override the group from context (optional; defaults to useSuggestions()) */
    group?: SuggestionGroup | null;
    /** Custom renderer for each item. Receives the item and a click handler. */
    renderItem?: (item: SuggestionItem, onSelect: () => void) => React__default.ReactNode;
    /** Extra CSS class on the outer wrapper */
    className?: string;
    /** Extra CSS class on each chip button */
    chipClassName?: string;
}
declare function SuggestionChips({ group: groupOverride, renderItem, className, chipClassName, }: SuggestionChipsProps): react_jsx_runtime.JSX.Element | null;

/**
 * Encodes a Float32Array as a WAV file.
 */
declare function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer;
/**
 * Converts a WebM audio blob to a WAV blob.
 */
declare function convertWebMToWav(blob: Blob): Promise<Blob>;
/**
 * Get audio format for codec
 */
declare function audioFormatForCodec(codec: string): "pcm16" | "g711_ulaw";
/**
 * Apply codec preferences to RTCPeerConnection
 */
declare function applyCodecPreferences(pc: RTCPeerConnection, codec: string): RTCPeerConnection;

type Handler = (...args: any[]) => void;
type EventMap = {
    [event: string]: Handler;
};
/**
 * Minimal typed event emitter for adapter session implementations.
 */
declare class EventEmitter<Events extends EventMap = EventMap> {
    private handlers;
    on<E extends string & keyof Events>(event: E, handler: Events[E]): void;
    off<E extends string & keyof Events>(event: E, handler: Events[E]): void;
    protected emit<E extends string & keyof Events>(event: E, ...args: Parameters<Events[E]>): void;
    removeAllListeners(): void;
}

/**
 * @deprecated Use `VoiceAgentConfig` instead. `RealtimeAgent` was the OpenAI-specific type.
 */
type RealtimeAgent = VoiceAgentConfig;

export { AgentConfig, ChatInput, ConnectButton, type ConnectOptions, EventEmitter, EventProvider, type GuardrailClassifierConfig, type GuardrailOutput, GuardrailOutputZod, type GuardrailResult, type LoggedEvent, MODERATION_CATEGORIES, type ModerationCategory, ModerationCategoryZod, type OutputGuardrail, type OutputGuardrailArgs, type OutputGuardrailResult, type RealtimeAgent, type RealtimeSessionCallbacks, SUGGESTION_EVENT, StatusIndicator, SuggestionChips, type SuggestionChipsProps, type SuggestionGroup, type SuggestionItem, SuggestionProvider, type SuggestionType, type SuggestionsContextValue, TOOL_RESULT_EVENT, ToolDefinition, ToolParamDefinition, Transcript, type TranscriptItem, TranscriptMessage, TranscriptProvider, VoiceAdapter, VoiceAgentConfig, VoiceChat, type VoiceChatProps, VoiceContextValue, VoiceProvider, VoiceProviderProps, VoiceStatus, applyCodecPreferences, audioFormatForCodec, clearSuggestions, convertWebMToWav, createAPITool, createAgent, createAgentFromTemplate, createCustomGuardrail, createEventTool, createModerationGuardrail, createNavigationTool, createRAGTool, createSearchTool, defineTool, emitSuggestions, encodeWAV, runGuardrailClassifier, useAudioRecorder, useEvent, useRealtimeSession, useSessionHistory, useSuggestions, useToolListener, useToolResult, useToolResults, useTranscript, useVoice };
