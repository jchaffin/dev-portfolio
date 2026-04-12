/**
 * VoiceKit - A provider-agnostic React library for building voice-enabled AI agents.
 *
 * @packageDocumentation
 *
 * @example
 * ```tsx
 * import { VoiceProvider, useVoice, createAgent, defineTool } from '@jchaffin/voicekit';
 * import { openai } from '@jchaffin/voicekit/openai';
 *
 * const searchTool = defineTool({
 *   name: 'search',
 *   description: 'Search the knowledge base',
 *   parameters: {
 *     query: { type: 'string', description: 'Search query' }
 *   },
 *   required: ['query'],
 *   execute: async ({ query }) => {
 *     const res = await fetch(`/api/search?q=${query}`);
 *     return res.json();
 *   }
 * });
 *
 * const agent = createAgent({
 *   name: 'Assistant',
 *   instructions: 'You help users find information.',
 *   tools: [searchTool]
 * });
 *
 * function App() {
 *   return (
 *     <VoiceProvider adapter={openai()} agent={agent}>
 *       <Chat />
 *     </VoiceProvider>
 *   );
 * }
 *
 * function Chat() {
 *   const { status, connect, disconnect, transcript, sendMessage } = useVoice();
 *   return (
 *     <div>
 *       <button onClick={status === 'CONNECTED' ? disconnect : connect}>
 *         {status === 'CONNECTED' ? 'End' : 'Start'}
 *       </button>
 *       <div>
 *         {transcript.map(msg => (
 *           <p key={msg.id}><strong>{msg.role}:</strong> {msg.text}</p>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */

// Provider & Core Hook
export { VoiceProvider, useVoice } from './VoiceProvider';

// UI Components
export {
  VoiceChat,
  Transcript,
  StatusIndicator,
  ConnectButton,
  ChatInput,
  type VoiceChatProps,
} from './components';

// Agent Creation
export {
  createAgent,
  createAgentFromTemplate,
  AgentBuilder,
  agent,
  loggingMiddleware,
  rateLimitMiddleware,
  retryMiddleware,
  timeoutMiddleware,
} from './createAgent';

// Tool Utilities
export {
  defineTool,
  createNavigationTool,
  createEventTool,
  createAPITool,
  createSearchTool,
  createRAGTool,
  emitToolResult,
  TOOL_RESULT_EVENT,
} from './tools';

// Hooks
export {
  useToolResults,
  useToolListener,
  useToolResult,
  useAudioRecorder,
  useRealtimeSession,
  useSessionHistory,
  useVAD,
  useBargeIn,
  type RealtimeSessionCallbacks,
  type ConnectOptions,
  type VADConfig,
  type VADState,
  type UseVADReturn,
  type BargeInConfig,
  type UseBargeInReturn,
} from './hooks';

// Contexts
export {
  TranscriptProvider,
  useTranscript,
  EventProvider,
  useEvent,
  type TranscriptItem,
  type LoggedEvent,
} from './contexts';

// Guardrails
export {
  runGuardrailClassifier,
  createModerationGuardrail,
  createCustomGuardrail,
  GuardrailOutputZod,
  ModerationCategoryZod,
  MODERATION_CATEGORIES,
  type ModerationCategory,
  type GuardrailOutput,
  type GuardrailResult,
  type OutputGuardrail,
  type OutputGuardrailResult,
  type OutputGuardrailArgs,
  type GuardrailClassifierConfig,
} from './guardrails';

// Suggestions (user-in-the-loop chips)
export {
  SuggestionProvider,
  useSuggestions,
  SuggestionChips,
  emitSuggestions,
  clearSuggestions,
  SUGGESTION_EVENT,
  type SuggestionItem,
  type SuggestionGroup,
  type SuggestionType,
  type SuggestionsContextValue,
  type SuggestionChipsProps,
  type SuggestionEventDetail,
} from './suggestions';

// Audio Utilities
export {
  // WAV
  convertWebMToWav,
  encodeWAV,
  encodeWAVFromPcm16,
  // PCM conversion
  float32ToPcm16,
  pcm16ToFloat32,
  pcm16ToBytes,
  bytesToPcm16,
  // Base64
  pcm16ToBase64,
  base64ToPcm16,
  float32ToBase64,
  base64ToFloat32,
  // Resampling (windowed sinc)
  resample,
  resamplePcm16,
  upsample8kTo16k,
  upsample8kTo16kPcm16,
  downsample16kTo8k,
  upsample8kTo48k,
  // Pitch / speed
  shiftPitch,
  shiftPitchSemitones,
  changeSpeed,
  // Gain / normalization
  applyGain,
  normalize,
  // Filters / EQ
  lowpass,
  highpass,
  bandpass,
  peakingEQ,
  voicePresenceBoost,
  deEss,
  telephoneFilter,
  // G.711 codecs
  encodeMulaw,
  decodeMulaw,
  encodeAlaw,
  decodeAlaw,
  // Energy / analysis
  rmsEnergy,
  rmsEnergyPcm16,
  dbFS,
  // Codec helpers
  audioFormatForCodec,
  applyCodecPreferences,
  // Channel mixing
  stereoToMono,
  monoToStereo,
} from './utils';

// Types (local)
export type {
  VoiceStatus,
  TranscriptMessage,
  ToolDefinition,
  ToolParamDefinition,
  AgentConfig,
  VoiceConfig,
  VoiceContextValue,
  VoiceProviderProps,
} from './types';

export { VoiceStatusEnum } from './types';

// Core types (provider-agnostic interfaces)
export type {
  VoiceAdapter,
  VoiceSession,
  VoiceAgentConfig,
  ToolMiddleware,
  SessionEvents,
  TranscriptData,
  VADEvent,
  BargeInEvent,
  AudioEncoding,
  AudioFormat,
  ConnectConfig,
  SessionOptions,
  ServerAdapter,
  ServerSessionConfig,
} from './core';

export { EventEmitter } from './core';

/**
 * @deprecated Use `VoiceAgentConfig` instead. `RealtimeAgent` was the OpenAI-specific type.
 */
export type RealtimeAgent = import('./core/types').VoiceAgentConfig;
