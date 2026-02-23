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

// Re-export useVoice from VoiceProvider
export { useVoice } from './VoiceProvider';
