import { useCallback, useRef, useState, useEffect } from 'react';
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { audioFormatForCodec, applyCodecPreferences } from '@/lib/codecUtils';
import { useEvent } from '@/contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';
import { SessionStatus } from '@/types';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (_status: SessionStatus, _agentName?: string) => void;
  onAgentHandoff?: (_agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  initialAgents: RealtimeAgent[];
  audioElement?: HTMLAudioElement;
  extraContext?: Record<string, any>;
  outputGuardrails?: any[];
}

interface TransportEvent {
  type: string;
  [key: string]: unknown;
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<
    SessionStatus
  >('DISCONNECTED');
  const { logClientEvent } = useEvent();

  const setConnectionStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks, logClientEvent],
  );

  const { logServerEvent } = useEvent();

  const historyHandlers = useHandleSessionHistory().current;

  const handleTransportEvent = useCallback((event: TransportEvent) => {
    console.log("🚀 Transport event received:", event.type, event);
    
    // Handle additional server events that aren't managed by the session
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        console.log("🎤 Transcription completed:", event);
        historyHandlers.handleTranscriptionCompleted(event as any);
        break;
      }
      case "response.audio_transcript.done": {
        console.log("🎵 Response transcript done:", event);
        historyHandlers.handleTranscriptionCompleted(event as any);
        break;
      }
      case "response.audio_transcript.delta": {
        console.log("🎵 Response transcript delta:", event);
        historyHandlers.handleTranscriptionDelta(event as any);
        break;
      }
      case "conversation.item.input_audio_transcription.delta": {
        console.log("🎤 Input transcription delta:", event);
        historyHandlers.handleTranscriptionDelta(event as any);
        break;
      }
      case "response.audio": {
        console.log("🎵 Audio response received:", event);
        break;
      }
      case "response.audio.done": {
        console.log("🎵 Audio response completed:", event);
        break;
      }
      default: {
        logServerEvent(event);
        break;
      } 
    }
  }, [historyHandlers, logServerEvent]);

  const codecParamRef = useRef<string>(
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('codec') ?? 'opus')
      : 'opus')
      .toLowerCase(),
  );

  // Wrapper to pass current codec param
  const applyCodec = useCallback(
    (pc: RTCPeerConnection) => applyCodecPreferences(pc, codecParamRef.current),
    [codecParamRef],
  );

  const handleAgentHandoff = useCallback((item: any) => {
    const history = item.context?.history || [];
    const lastMessage = history[history.length - 1];
    const _agentName = lastMessage?.name?.split("transfer_to_")[1] || '';
    callbacks.onAgentHandoff?.(_agentName);
  }, [callbacks]);

  useEffect(() => {
    if (sessionRef.current) {
      // Log server errors
      sessionRef.current.on("error", (...args: unknown[]) => {
        console.error("❌ Session error:", args[0]);
        logServerEvent({
          type: "error",
          message: args[0],
        });
      });

      // history events
      sessionRef.current.on("agent_handoff", handleAgentHandoff as any);
      sessionRef.current.on("agent_tool_start", historyHandlers.handleAgentToolStart as any);
      sessionRef.current.on("agent_tool_end", historyHandlers.handleAgentToolEnd as any);
      sessionRef.current.on("history_updated", historyHandlers.handleHistoryUpdated as any);
      sessionRef.current.on("history_added", historyHandlers.handleHistoryAdded as any);
      sessionRef.current.on("guardrail_tripped", historyHandlers.handleGuardrailTripped as any);

      // additional transport events
      sessionRef.current.on("transport_event", handleTransportEvent);
    }
  }, [handleAgentHandoff, handleTransportEvent, historyHandlers, logServerEvent]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
      outputGuardrails,
    }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      setConnectionStatus('CONNECTING');

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      // This lets you use the codec selector in the UI to force narrow-band (8 kHz) codecs to
      //  simulate how the voice agent sounds over a PSTN/SIP phone call.
      const codecParam = codecParamRef.current;
      const audioFormat = audioFormatForCodec(codecParam);

      sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          // Set preferred codec before offer creation
          changePeerConnection: async (pc: RTCPeerConnection) => {
            applyCodec(pc);
            return pc;
          },
        }),
        model: 'gpt-4o-realtime-preview-2025-06-03',
        config: {
          inputAudioFormat: audioFormat,
          outputAudioFormat: audioFormat,
          inputAudioTranscription: {
            model: 'gpt-4o-transcribe',
            language: 'en',
          },
        },
        outputGuardrails: outputGuardrails ?? [],
        context: extraContext ?? {},
      });

      console.log("🔗 Connecting session with API key...");
      await sessionRef.current.connect({ apiKey: ek });
      console.log("✅ Session connected successfully");
      setConnectionStatus('CONNECTED');
    },
    [setConnectionStatus, applyCodec],
  );

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
      } catch {
        // Removed console.error
      } finally {
        sessionRef.current = null;
        setConnectionStatus('DISCONNECTED');
      }
    } else {
      setConnectionStatus('DISCONNECTED');
    }
  }, [setConnectionStatus]);

  const assertconnected = () => {
    if (!sessionRef.current) throw new Error('RealtimeSession not connected');
  };
  

  /* ----------------------- message helpers ------------------------- */

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);
  
  const sendUserText = useCallback((text: string) => {
    assertconnected();
    sessionRef.current!.sendMessage(text);
  }, []);

  const sendEvent = useCallback((ev: TransportEvent) => {
    sessionRef.current?.transport.sendEvent(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.clear' } as TransportEvent);
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.commit' } as TransportEvent);
    sessionRef.current.transport.sendEvent({ type: 'response.create' } as TransportEvent);
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
