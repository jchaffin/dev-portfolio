'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import type { VoiceSession, BargeInEvent } from '../core/types';

export interface BargeInConfig {
  /** Automatically interrupt the assistant when user starts speaking. Default: true */
  autoInterrupt?: boolean;
  /** Minimum ms of assistant audio before barge-in is allowed. Default: 500 */
  minAssistantAudioMs?: number;
  /** Debounce: ignore rapid speech-start events within this window (ms). Default: 300 */
  debounceMs?: number;
}

export interface UseBargeInReturn {
  /** Whether barge-in is currently active (user interrupted assistant) */
  isBargedIn: boolean;
  /** Last barge-in event details */
  lastBargeIn: BargeInEvent | null;
  /** Total number of barge-ins this session */
  bargeInCount: number;
  /** Manually trigger a barge-in */
  triggerBargeIn: () => void;
  /** Reset barge-in state */
  reset: () => void;
}

export function useBargeIn(
  session: VoiceSession | null,
  config: BargeInConfig = {},
  callbacks?: {
    onBargeIn?: (event: BargeInEvent) => void;
  }
): UseBargeInReturn {
  const {
    autoInterrupt = true,
    minAssistantAudioMs = 500,
    debounceMs = 300,
  } = config;

  const [isBargedIn, setIsBargedIn] = useState(false);
  const [lastBargeIn, setLastBargeIn] = useState<BargeInEvent | null>(null);
  const [bargeInCount, setBargeInCount] = useState(0);

  const assistantAudioStartRef = useRef<number | null>(null);
  const currentAssistantItemRef = useRef<string | null>(null);
  const lastBargeInTimeRef = useRef(0);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const triggerBargeIn = useCallback(() => {
    if (!session) return;
    const now = Date.now();

    if (now - lastBargeInTimeRef.current < debounceMs) return;

    const audioStart = assistantAudioStartRef.current;
    const audioPlayedMs = audioStart ? now - audioStart : 0;

    if (audioPlayedMs < minAssistantAudioMs) return;

    lastBargeInTimeRef.current = now;

    const event: BargeInEvent = {
      interruptedItemId: currentAssistantItemRef.current || '',
      audioPlayedMs,
      fractionSpoken: 0, // Caller can refine this
      timestamp: now,
    };

    if (autoInterrupt) {
      session.interrupt();
    }

    setIsBargedIn(true);
    setLastBargeIn(event);
    setBargeInCount(c => c + 1);
    callbacksRef.current?.onBargeIn?.(event);
  }, [session, autoInterrupt, minAssistantAudioMs, debounceMs]);

  const reset = useCallback(() => {
    setIsBargedIn(false);
    setLastBargeIn(null);
    setBargeInCount(0);
    assistantAudioStartRef.current = null;
    currentAssistantItemRef.current = null;
  }, []);

  useEffect(() => {
    if (!session) return;

    const onAssistantTranscript = (data: { itemId: string; isFinal: boolean }) => {
      if (!data.isFinal) {
        if (currentAssistantItemRef.current !== data.itemId) {
          currentAssistantItemRef.current = data.itemId;
          assistantAudioStartRef.current = Date.now();
          setIsBargedIn(false);
        }
      } else {
        assistantAudioStartRef.current = null;
        currentAssistantItemRef.current = null;
      }
    };

    const onUserSpeechStarted = () => {
      if (assistantAudioStartRef.current) {
        triggerBargeIn();
      }
    };

    session.on('assistant_transcript', onAssistantTranscript as any);
    session.on('user_speech_started', onUserSpeechStarted);

    return () => {
      session.off('assistant_transcript', onAssistantTranscript as any);
      session.off('user_speech_started', onUserSpeechStarted);
    };
  }, [session, triggerBargeIn]);

  return {
    isBargedIn,
    lastBargeIn,
    bargeInCount,
    triggerBargeIn,
    reset,
  };
}
