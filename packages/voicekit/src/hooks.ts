/**
 * Hooks barrel file - re-exports from hooks directory
 */

// Tool hooks
export { useToolResults, useToolListener, useToolResult } from './hooks/toolHooks';

// Audio recording
export { useAudioRecorder } from './hooks/useAudioRecorder';

// Realtime session management
export {
  useRealtimeSession,
  type RealtimeSessionCallbacks,
  type ConnectOptions,
} from './hooks/useRealtimeSession';

// Session history
export { useSessionHistory } from './hooks/useSessionHistory';

// VAD (Voice Activity Detection)
export { useVAD, type VADConfig, type VADState, type UseVADReturn } from './hooks/useVAD';

// Barge-in detection
export { useBargeIn, type BargeInConfig, type UseBargeInReturn } from './hooks/useBargeIn';

// Re-export useVoice from VoiceProvider
export { useVoice } from './VoiceProvider';
