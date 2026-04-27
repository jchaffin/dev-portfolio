'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionStatus, PortfolioContext } from '@/types';
import { useTranscript, useRealtimeSession, useAudioRecorder, useSuggestions, emitSuggestions } from '@jchaffin/voicekit';
import { openai } from '@jchaffin/voicekit/openai';
import { meAgent } from '@/agents/MeAgent';
import resumeData from '@/data/resume.json';
import type { ContactFormData, CalendlyData, RichItem } from '@/components/voice/types';

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 768);
}

function createAdapter() {
  const mobile = isMobile();
  return openai({
    turnDetection: {
      type: 'server_vad',
      // On mobile, speaker output bleeds into the mic causing echo-triggered
      // barge-in loops. Use stricter settings to avoid false VAD triggers.
      threshold: mobile ? 0.98 : 0.9,
      prefix_padding_ms: mobile ? 300 : 500,
      silence_duration_ms: mobile ? 2500 : 1200,
    },
  });
}

let _adapter: ReturnType<typeof openai> | null = null;
function getAdapter() {
  if (!_adapter) _adapter = createAdapter();
  return _adapter;
}

interface UseVoiceAgentOptions {
  portfolioContext: PortfolioContext;
}

export function useVoiceAgent({ portfolioContext }: UseVoiceAgentOptions) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const isConnected = sessionStatus === 'CONNECTED';
  const isDisconnected = sessionStatus === 'DISCONNECTED';

  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('audioPlaybackEnabled');
    return stored ? stored === 'true' : true;
  });

  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>({});
  const [calendlyData, setCalendlyData] = useState<CalendlyData>({ url: '' });
  const [richItems, setRichItems] = useState<RichItem[]>([]);

  const { suggestions: agentSuggestions, clearSuggestions } = useSuggestions();

  const statusRef = useRef<SessionStatus>('DISCONNECTED');
  const greetingSentRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const pendingSuggestionRef = useRef<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { statusRef.current = sessionStatus; }, [sessionStatus]);

  const isConnectedRef = () => statusRef.current === 'CONNECTED';
  const isConnectingRef = () => statusRef.current === 'CONNECTING';
  const isDisconnectedRef = () => statusRef.current === 'DISCONNECTED';

  const { transcriptItems, clearTranscript } = useTranscript();
  const { startRecording, stopRecording } = useAudioRecorder();
  const { connect, disconnect, mute, sendEvent, sendUserText, interrupt } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.style.display = 'none';
    el.volume = 1.0;
    document.body.appendChild(el);
    audioElementRef.current = el;
    return () => { try { el.pause(); el.srcObject = null; el.remove(); } catch {} };
  }, []);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('Session API error:', res.status, body);
        return null;
      }
      const data = await res.json();
      return data.ephemeralKey || null;
    } catch (err) {
      console.error('Failed to fetch ephemeral key:', err);
      return null;
    }
  };

  const connectToRealtime = useCallback(async () => {
    if (isConnectedRef() || isConnectingRef()) return;
    const audioEl = audioElementRef.current;
    if (!audioEl) return;

    try {
      setSessionStatus('CONNECTING');
      clearTranscript();
      const ephemeralKey = await fetchEphemeralKey();
      if (!ephemeralKey) { setSessionStatus('DISCONNECTED'); return; }

      audioEl.muted = false;
      audioEl.volume = 1.0;
      // Kick the audio element within the user-gesture call stack so mobile
      // browsers unlock it before WebRTC attaches a stream.
      audioEl.play().catch(() => {});

      await connect({
        getEphemeralKey: () => Promise.resolve(ephemeralKey),
        initialAgents: [meAgent],
        audioElement: audioEl,
        extraContext: { portfolio: portfolioContext },
        outputGuardrails: [],
        adapter: getAdapter(),
      });
    } catch (error) {
      console.error('Connection failed:', error);
      setSessionStatus('DISCONNECTED');
    }
  }, [clearTranscript, connect, portfolioContext]);

  const disconnectFromRealtime = useCallback(async () => {
    stopRecording();

    if (audioElementRef.current) {
      const src = audioElementRef.current.srcObject as MediaStream | null;
      audioElementRef.current.srcObject = null;
      if (src) src.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      try { audioElementRef.current.pause(); } catch {}
    }

    try { await disconnect(); } catch {}
    setSessionStatus('DISCONNECTED');
  }, [stopRecording, disconnect]);

  const toggleConnection = useCallback(async () => {
    if (isConnectedRef()) await disconnectFromRealtime();
    else if (isDisconnectedRef()) await connectToRealtime();
  }, [disconnectFromRealtime, connectToRealtime]);

  const sendMessage = useCallback((text: string) => {
    if (!isConnectedRef()) return;
    try {
      sendUserText(text);
    } catch {
      sendEvent({
        type: 'conversation.item.create',
        item: { id: crypto.randomUUID(), type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
      });
      sendEvent({ type: 'response.create' });
    }
  }, [sendUserText, sendEvent]);

  const handleSuggestionClick = useCallback(async (message: string) => {
    if (isConnectedRef()) {
      sendMessage(message);
      clearSuggestions();
    } else {
      pendingSuggestionRef.current = message;
      if (isDisconnectedRef()) await connectToRealtime();
    }
  }, [sendMessage, clearSuggestions, connectToRealtime]);

  // Send pending suggestion after greeting has had time to start
  useEffect(() => {
    if (isConnected && pendingSuggestionRef.current) {
      const msg = pendingSuggestionRef.current;
      pendingSuggestionRef.current = null;
      const timeout = setTimeout(() => {
        interrupt();
        sendMessage(msg);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, sendMessage, interrupt]);

  useEffect(() => {
    if (isDisconnected) {
      clearSuggestions();
      greetingSentRef.current = false;
    }
  }, [isDisconnected, clearSuggestions]);

  // Greeting + seed suggestion chips on connect
  useEffect(() => {
    if (isConnected && !greetingSentRef.current) {
      greetingSentRef.current = true;

      const featuredProjects = ((resumeData as any).projects || []);
      emitSuggestions({
        type: 'project',
        prompt: 'Projects:',
        items: featuredProjects.map((p: any) => ({
          id: p.name.toLowerCase().replace(/\s+/g, '-'),
          label: p.name,
          message: `Tell me about the ${p.name} project`,
          description: p.description,
          meta: { url: p.website, github: p.github, tech: p.keywords },
        })),
      });

      // Skip greeting if a suggestion is already pending — it will trigger its own response
      if (pendingSuggestionRef.current) return;

      const greetingTimer = setTimeout(() => sendEvent({ type: 'response.create' }), 1200);
      return () => clearTimeout(greetingTimer);
    }
  }, [isConnected, sendEvent]);

  const resetChat = useCallback(async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (isConnectedRef() || isConnectingRef()) await disconnectFromRealtime();
    clearSuggestions();
    setRichItems([]);
    setContactFormOpen(false);
    setContactFormData({});
    greetingSentRef.current = false;
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      connectToRealtime();
    }, 500);
  }, [clearSuggestions, disconnectFromRealtime, connectToRealtime]);

  const silenceAgent = useCallback(() => {
    interrupt();
    mute(true);
  }, [interrupt, mute]);

  const uiOverlayOpen = contactFormOpen || calendlyModalOpen;
  useEffect(() => {
    if (!isConnectedRef()) return;
    if (!uiOverlayOpen) {
      mute(!isAudioPlaybackEnabled);
    }
  }, [uiOverlayOpen, mute, isAudioPlaybackEnabled]);

  useEffect(() => {
    const handler = (event: any) => {
      if (event.detail?.type !== 'agent_tool_end') return;
      const { name, output } = event.detail;

      if (name === 'send_email' && output.success && output.action === 'show_contact_form') {
        silenceAgent();
        setContactFormData({ subject: output.subject || '', context: output.context || '' });
        setContactFormOpen(true);
      } else if (name === 'set_meeting' && output.success && output.action === 'open_calendly') {
        silenceAgent();
        setCalendlyData({ url: output.calendly_url });
        setCalendlyModalOpen(true);
      } else if (name === 'render_project_card' && output.success) {
        setRichItems((prev) => [
          ...prev,
          { id: crypto.randomUUID(), type: 'project_card', createdAtMs: Date.now(), data: output.data },
        ]);
      } else if (name === 'render_mermaid' && output.success) {
        setRichItems((prev) => [
          ...prev,
          { id: crypto.randomUUID(), type: 'mermaid', createdAtMs: Date.now(), data: output.data },
        ]);
      }
    };
    window.addEventListener('agent-tool-response', handler);
    return () => window.removeEventListener('agent-tool-response', handler);
  }, [silenceAgent]);

  useEffect(() => {
    localStorage.setItem('audioPlaybackEnabled', isAudioPlaybackEnabled.toString());
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.volume = 1.0;
        audioElementRef.current.play().catch(() => {});
      } else {
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }
    try { mute(!isAudioPlaybackEnabled); } catch {}
  }, [isAudioPlaybackEnabled, mute]);

  useEffect(() => {
    if (isConnected && audioElementRef.current?.srcObject) {
      startRecording(audioElementRef.current.srcObject as MediaStream);
    }
    if (isDisconnected) stopRecording();
  }, [isConnected, isDisconnected, startRecording, stopRecording]);

  // Mobile half-duplex: mute the mic while the assistant is speaking to prevent
  // speaker output from bleeding into the mic and triggering VAD barge-in.
  const isMobileRef = useRef(false);
  useEffect(() => { isMobileRef.current = isMobile(); }, []);

  useEffect(() => {
    if (!isConnected || !isMobileRef.current) return;

    const assistantSpeaking = transcriptItems.some(
      (item) => item.role === 'assistant' && item.status === 'IN_PROGRESS'
    );

    if (assistantSpeaking) {
      mute(true);
      return;
    }

    // Unmute after a short echo decay window
    const timer = setTimeout(() => {
      if (isConnectedRef() && isAudioPlaybackEnabled) mute(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [transcriptItems, isConnected, isAudioPlaybackEnabled, mute]);

  // On mobile, backgrounding the tab kills WebRTC. Disconnect cleanly so
  // the session doesn't end up in a broken half-connected state.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && isConnectedRef()) {
        disconnectFromRealtime();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [disconnectFromRealtime]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return {
    sessionStatus,
    isConnected,
    isDisconnected,
    transcriptItems,
    richItems,
    toggleConnection,
    sendMessage,
    resetChat,
    contactFormOpen,
    setContactFormOpen,
    calendlyModalOpen,
    setCalendlyModalOpen,
    contactFormData,
    setContactFormData,
    calendlyData,
    setCalendlyData,
    agentSuggestions,
    handleSuggestionClick,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
  };
}

export default useVoiceAgent;
