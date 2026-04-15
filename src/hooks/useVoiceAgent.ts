'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SessionStatus, PortfolioContext } from '@/types';
import { useTranscript, useRealtimeSession, useAudioRecorder, useSuggestions, emitSuggestions, createVoiceAdapter } from '@jchaffin/voicekit';
import type { VoiceProviderName } from '@jchaffin/voicekit';
import { meAgent } from '@/agents/MeAgent';
import resumeData from '@/data/resume.json';
import type { ContactFormData, CalendlyData } from '@/components/voice/types';

function buildTranscriptionPrompt(): string {
  const terms: Set<string> = new Set();
  if (resumeData.name) terms.add(resumeData.name);
  for (const exp of resumeData.experience || []) {
    if (exp.company) terms.add(exp.company);
    for (const alias of (exp as any).aliases || []) terms.add(alias);
    for (const kw of exp.keywords || []) terms.add(kw);
  }
  for (const skill of resumeData.skills || []) terms.add(skill);
  for (const proj of (resumeData as any).projects || []) {
    if (proj.name) terms.add(proj.name);
    for (const kw of proj.keywords || []) terms.add(kw);
  }
  return Array.from(terms).join(', ');
}

const PROVIDER_OPTIONS: Record<VoiceProviderName, Record<string, unknown>> = {
  openai: {
    transcriptionPrompt: buildTranscriptionPrompt(),
    turnDetection: {
      type: 'server_vad',
      threshold: 0.6,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
  },
  elevenlabs: {
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '',
  },
  livekit: {},
  deepgram: {},
  pipecat: {},
};

interface UseVoiceAgentOptions {
  portfolioContext: PortfolioContext;
  provider?: VoiceProviderName;
}

export function useVoiceAgent({ portfolioContext, provider = 'openai' }: UseVoiceAgentOptions) {
  const adapter = useMemo(
    () => createVoiceAdapter(provider, PROVIDER_OPTIONS[provider] || {}),
    [provider],
  );
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
    el.autoplay = true;
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

      await connect({
        getEphemeralKey: () => Promise.resolve(ephemeralKey),
        initialAgents: [meAgent],
        audioElement: audioEl,
        extraContext: { portfolio: portfolioContext },
        outputGuardrails: [],
        adapter,
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

      const greetingTimer = setTimeout(() => sendEvent({ type: 'response.create' }), 1200);
      return () => clearTimeout(greetingTimer);
    }
  }, [isConnected, sendEvent]);

  const resetChat = useCallback(async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (isConnectedRef() || isConnectingRef()) await disconnectFromRealtime();
    clearSuggestions();
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
