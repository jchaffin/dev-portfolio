'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useEvent } from '../contexts/EventContext';
import { useSessionHistory } from './useSessionHistory';
import { VoiceStatusEnum } from '../core/types';
import type { VoiceStatus } from '../types';
import type { VoiceAdapter, VoiceSession, VoiceAgentConfig } from '../core/types';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: VoiceStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  /** Agent config or array of agent configs. First entry is the root agent. */
  initialAgents: VoiceAgentConfig[];
  audioElement?: HTMLAudioElement;
  extraContext?: Record<string, unknown>;
  outputGuardrails?: unknown[];
  /** Provider adapter to use. Required for new-style usage. */
  adapter?: VoiceAdapter;
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<VoiceSession | null>(null);
  const [status, setStatus] = useState<VoiceStatus>(VoiceStatusEnum.DISCONNECTED);
  const { logClientEvent, logServerEvent } = useEvent();
  const codecParamRef = useRef<string>('opus');
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const updateStatus = useCallback(
    (s: VoiceStatus) => {
      setStatus(s);
      callbacksRef.current.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [logClientEvent]
  );

  const historyHandlers = useSessionHistory().current;
  const interruptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codec = params.get('codec');
      if (codec) {
        codecParamRef.current = codec.toLowerCase();
      }
    }
  }, []);

  const wireNormalizedEvents = useCallback((session: VoiceSession) => {
    session.on('status_change', (status: unknown) => {
      if (status === 'DISCONNECTED' && sessionRef.current === session) {
        sessionRef.current = null;
        updateStatus(VoiceStatusEnum.DISCONNECTED);
      }
    });

    // Barge-in: user started speaking, mark current assistant item as interrupted
    session.on('user_speech_started', () => {});

    session.on('user_transcript', (data) => {
      if (data.isFinal) {
        const text = data.text || data.delta || '';
        if (text.replace(/[\s.…,!?]+/g, '').length === 0) return;
        historyHandlers.handleTranscriptionCompleted({
          item_id: data.itemId,
          transcript: text,
          role: 'user',
        });
      } else if (data.delta) {
        historyHandlers.handleTranscriptionDelta({
          item_id: data.itemId,
          delta: data.delta,
          role: 'user',
        });
      }
    });

    session.on('assistant_transcript', (data) => {
      if (interruptedRef.current.has(data.itemId)) return;
      if (data.isFinal) {
        historyHandlers.handleTranscriptionCompleted({
          item_id: data.itemId,
          transcript: data.text || '',
          role: 'assistant',
        });
      } else if (data.delta) {
        historyHandlers.handleTranscriptionDelta({
          item_id: data.itemId,
          delta: data.delta,
          role: 'assistant',
        });
      }
    });

    session.on('tool_call_start', (name, input) => {
      historyHandlers.handleAgentToolStart(
        {} as Record<string, unknown>,
        undefined,
        { name, arguments: input } as Record<string, unknown>
      );
    });

    session.on('tool_call_end', (name, input, result) => {
      historyHandlers.handleAgentToolEnd(
        {} as Record<string, unknown>,
        undefined,
        { name, arguments: input } as Record<string, unknown>,
        result
      );
    });

    session.on('agent_handoff', (_from, to) => {
      callbacksRef.current.onAgentHandoff?.(to);
    });

    session.on('guardrail_tripped', (info) => {
      historyHandlers.handleGuardrailTripped(
        {} as Record<string, unknown>,
        undefined,
        { result: info } as Record<string, unknown>
      );
    });

    session.on('raw_event', (event) => {
      const ev = event as Record<string, unknown>;

      if (ev.type === 'conversation.item.truncated') {
        const itemId = ev.item_id as string;
        if (itemId) {
          interruptedRef.current.add(itemId);

          // The server already truncated the model's conversation history.
          // handleTruncation uses the accumulated transcript deltas as
          // ground truth — whatever the STT stream confirmed = what was
          // spoken. No audio-fraction estimation.
          const truncResult = historyHandlers.handleTruncation(itemId);

          if (truncResult) {
            logServerEvent({
              type: 'barge_in',
              interruptedItemId: itemId,
              spokenText: truncResult.spokenText,
            });
          }
        }
        return;
      }

      if (ev.type === 'history_updated') {
        historyHandlers.handleHistoryUpdated(ev.items as Record<string, unknown>[]);
        return;
      }
      if (ev.type === 'history_added') {
        historyHandlers.handleHistoryAdded(ev.item as Record<string, unknown>);
        return;
      }

      logServerEvent(ev);
    });

    session.on('error', (error) => {
      const e = error as any;
      const msg = (e instanceof Error) ? e.message : (typeof e === 'string') ? e : JSON.stringify(e);
      const errObj = typeof e === 'object' && e?.error ? e.error : e;
      const code = (typeof errObj === 'object' && errObj?.code) ? String(errObj.code) : '';
      const msgStr = typeof msg === 'string' ? msg : '';
      const isBenign =
        code === 'response_cancel_not_active' ||
        code === 'conversation_already_has_active_response' ||
        msgStr.includes('response_cancel_not_active') ||
        msgStr.includes('conversation_already_has_active_response');
      if (isBenign) return;
      console.error('Session error:', msg);
      logServerEvent({ type: 'error', message: msg });
    });
  }, [historyHandlers, logServerEvent]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
      outputGuardrails,
      adapter,
    }: ConnectOptions) => {
      if (sessionRef.current) return;

      if (!adapter) {
        throw new Error(
          'useRealtimeSession: `adapter` is required in ConnectOptions. ' +
          'Pass an adapter like openai() from @jchaffin/voicekit/openai.'
        );
      }
      if (!initialAgents?.length) {
        throw new Error('useRealtimeSession: `initialAgents` must be a non-empty array.');
      }

      updateStatus(VoiceStatusEnum.CONNECTING);

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];
      const codecParam = codecParamRef.current;

      const session = adapter.createSession(rootAgent, {
        codec: codecParam,
        language: 'en',
      });

      sessionRef.current = session;
      wireNormalizedEvents(session);

      try {
        await session.connect({
          authToken: ek,
          audioElement,
          context: extraContext,
          outputGuardrails,
        });
        updateStatus(VoiceStatusEnum.CONNECTED);
      } catch (connectError) {
        console.error('Connection error:', connectError);
        sessionRef.current = null;
        updateStatus(VoiceStatusEnum.DISCONNECTED);
        throw connectError;
      }
    },
    [updateStatus, wireNormalizedEvents]
  );

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.disconnect();
      } catch (error) {
        console.error('Error closing session:', error);
      } finally {
        sessionRef.current = null;
        updateStatus(VoiceStatusEnum.DISCONNECTED);
      }
    } else {
      updateStatus(VoiceStatusEnum.DISCONNECTED);
    }
  }, [updateStatus]);

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const sendUserText = useCallback((text: string) => {
    if (!sessionRef.current) throw new Error('Session not connected');
    sessionRef.current.sendMessage(text);
  }, []);

  const sendEvent = useCallback((ev: Record<string, unknown>) => {
    sessionRef.current?.sendRawEvent?.(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    sessionRef.current?.sendRawEvent?.({ type: 'input_audio_buffer.clear' });
  }, []);

  const pushToTalkStop = useCallback(() => {
    sessionRef.current?.sendRawEvent?.({ type: 'input_audio_buffer.commit' });
    sessionRef.current?.sendRawEvent?.({ type: 'response.create' });
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } as const;
}
