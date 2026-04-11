'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import type {
  VoiceAdapter,
  VoiceSession,
  VoiceAgentConfig,
} from './core/types';
import { VoiceStatusEnum } from './core/types';
import type {
  VoiceStatus,
  TranscriptMessage,
  VoiceContextValue,
  VoiceProviderProps,
} from './types';

const VoiceContext = createContext<VoiceContextValue | null>(null);

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
export function VoiceProvider({
  children,
  adapter,
  agent,
  sessionEndpoint = '/api/session',
  model,
  language = 'en',
  onStatusChange,
  onTranscriptUpdate,
  onToolCall,
  onError,
}: VoiceProviderProps) {
  const [status, setStatus] = useState<VoiceStatus>(VoiceStatusEnum.DISCONNECTED);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const sessionRef = useRef<VoiceSession | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef<VoiceStatus>(VoiceStatusEnum.DISCONNECTED);
  const currentMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Create audio element on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioRef.current = audio;

    return () => {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Transcript helpers
  const addMessage = useCallback((role: 'user' | 'assistant', text: string, id?: string) => {
    const message: TranscriptMessage = {
      id: id || crypto.randomUUID(),
      role,
      text,
      timestamp: new Date(),
      status: 'pending',
    };

    setTranscript(prev => {
      const updated = [...prev, message];
      onTranscriptUpdate?.(updated);
      return updated;
    });

    return message.id;
  }, [onTranscriptUpdate]);

  const updateMessage = useCallback((id: string, text: string, append = false) => {
    setTranscript(prev => {
      const updated = prev.map(m =>
        m.id === id
          ? { ...m, text: append ? m.text + text : text }
          : m
      );
      onTranscriptUpdate?.(updated);
      return updated;
    });
  }, [onTranscriptUpdate]);

  const completeMessage = useCallback((id: string) => {
    setTranscript(prev => {
      const updated = prev.map(m =>
        m.id === id ? { ...m, status: 'complete' as const } : m
      );
      onTranscriptUpdate?.(updated);
      return updated;
    });
  }, [onTranscriptUpdate]);

  // Wire normalized session events to local state
  const wireSessionEvents = useCallback((session: VoiceSession) => {
    session.on('user_transcript', (data) => {
      if (data.isFinal) {
        addMessage('user', data.text || data.delta || '');
      }
    });

    session.on('assistant_transcript', (data) => {
      if (data.isFinal) {
        if (currentMsgIdRef.current) {
          completeMessage(currentMsgIdRef.current);
          currentMsgIdRef.current = null;
        }
      } else if (data.delta) {
        if (!currentMsgIdRef.current) {
          currentMsgIdRef.current = addMessage('assistant', data.delta);
        } else {
          updateMessage(currentMsgIdRef.current, data.delta, true);
        }
      }
    });

    session.on('tool_call_end', (name, input, output) => {
      onToolCall?.(name, input, output);
    });

    session.on('error', (error) => {
      console.error('VoiceKit session error:', error);
      onError?.(error);
    });
  }, [addMessage, updateMessage, completeMessage, onToolCall, onError]);

  // Fetch session token from backend
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(sessionEndpoint, { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ephemeralKey || data.token || null;
    } catch {
      return null;
    }
  }, [sessionEndpoint]);

  const connect = useCallback(async () => {
    if (statusRef.current !== VoiceStatusEnum.DISCONNECTED) return;
    if (!audioRef.current) return;

    updateStatus(VoiceStatusEnum.CONNECTING);

    try {
      const token = await fetchToken();
      if (!token) {
        onError?.(new Error('Failed to get session key'));
        updateStatus(VoiceStatusEnum.DISCONNECTED);
        return;
      }

      const session = adapter.createSession(agent, { model, language });
      sessionRef.current = session;

      wireSessionEvents(session);

      await session.connect({
        authToken: token,
        audioElement: audioRef.current,
      });

      updateStatus(VoiceStatusEnum.CONNECTED);

      // Trigger initial greeting
      setTimeout(() => {
        session.sendRawEvent?.({ type: 'response.create' });
      }, 500);
    } catch (error) {
      console.error('VoiceKit connection failed:', error);
      try {
        await sessionRef.current?.disconnect();
      } catch {
        // ignore
      }
      sessionRef.current = null;
      currentMsgIdRef.current = null;
      onError?.(error instanceof Error ? error : new Error(String(error)));
      updateStatus(VoiceStatusEnum.DISCONNECTED);
    }
  }, [adapter, agent, model, language, fetchToken, wireSessionEvents, updateStatus, onError]);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.disconnect();
      } catch {
        // Ignore close errors
      }
      sessionRef.current = null;
    }
    currentMsgIdRef.current = null;
    updateStatus(VoiceStatusEnum.DISCONNECTED);
  }, [updateStatus]);

  const sendMessage = useCallback((text: string) => {
    if (!sessionRef.current || statusRef.current !== VoiceStatusEnum.CONNECTED) return;
    sessionRef.current.interrupt();
    sessionRef.current.sendMessage(text);
  }, []);

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const mute = useCallback((muted: boolean) => {
    setIsMuted(muted);
    sessionRef.current?.mute(muted);
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    onTranscriptUpdate?.([]);
  }, [onTranscriptUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        sessionRef.current?.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const value: VoiceContextValue = {
    status,
    connect,
    disconnect,
    transcript,
    clearTranscript,
    sendMessage,
    interrupt,
    mute,
    isMuted,
    agent,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

/**
 * Hook to access voice functionality.
 * Must be used within a VoiceProvider.
 */
export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
