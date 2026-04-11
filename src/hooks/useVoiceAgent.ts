'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionStatus, PortfolioContext } from '@/types';
import { useTranscript, useRealtimeSession, useAudioRecorder, useSuggestions, emitSuggestions } from '@jchaffin/voicekit';
import { openai } from '@jchaffin/voicekit/openai';
import { meAgent } from '@/agents/MeAgent';
import resumeData from '@/data/resume.json';
import type { ContactFormData, CalendlyData } from '@/components/voice/types';

const adapter = openai();

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
  const [projectPreview, setProjectPreview] = useState<{
    name: string;
    description?: string;
    liveUrl?: string;
    githubUrl?: string;
    tech?: string[];
  } | null>(null);

  const { suggestions: agentSuggestions, clearSuggestions } = useSuggestions();

  // Refs for values that callbacks need fresh access to
  const statusRef = useRef<SessionStatus>('DISCONNECTED');
  const greetingSentRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const pendingSuggestionRef = useRef<string | null>(null);

  useEffect(() => { statusRef.current = sessionStatus; }, [sessionStatus]);

  const isConnectedRef = () => statusRef.current === 'CONNECTED';
  const isConnectingRef = () => statusRef.current === 'CONNECTING';
  const isDisconnectedRef = () => statusRef.current === 'DISCONNECTED';

  const { transcriptItems, clearTranscript } = useTranscript();
  const { startRecording, stopRecording } = useAudioRecorder();
  const { connect, disconnect, mute, sendEvent, sendUserText, interrupt } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
  });

  // Audio element setup
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

  // Fetch ephemeral key
  const fetchEphemeralKey = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ephemeralKey || null;
    } catch { return null; }
  };

  // Connect
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

  // Disconnect
  const disconnectFromRealtime = useCallback(async () => {
    const mic = micStreamRef.current;
    if (mic) {
      mic.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      micStreamRef.current = null;
    }
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

  // Toggle
  const toggleConnection = useCallback(async () => {
    if (isConnectedRef()) await disconnectFromRealtime();
    else if (isDisconnectedRef()) await connectToRealtime();
  }, [disconnectFromRealtime, connectToRealtime]);

  // Send message
  const sendMessage = useCallback((text: string) => {
    if (!isConnectedRef()) return;
    try {
      sendUserText(text);
    } catch {
      const id = Math.random().toString(36).substring(2, 15);
      sendEvent({
        type: 'conversation.item.create',
        item: { id, type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
      });
      sendEvent({ type: 'response.create' });
    }
  }, [sendUserText, sendEvent]);

  // Suggestion click
  const handleSuggestionClick = useCallback(async (message: string) => {
    if (isConnectedRef()) {
      sendMessage(message);
      clearSuggestions();
    } else {
      pendingSuggestionRef.current = message;
      if (isDisconnectedRef()) await connectToRealtime();
    }
  }, [sendMessage, clearSuggestions, connectToRealtime]);

  // Send pending suggestion when connected
  useEffect(() => {
    if (isConnected && pendingSuggestionRef.current) {
      const msg = pendingSuggestionRef.current;
      pendingSuggestionRef.current = null;
      const timeout = setTimeout(() => sendMessage(msg), 2500);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, sendMessage]);

  // Clear suggestions on disconnect
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

      setTimeout(() => sendEvent({ type: 'response.create' }), 1200);
    }
  }, [isConnected, sendEvent]);

  // Reset chat
  const resetChat = useCallback(async () => {
    if (isConnectedRef() || isConnectingRef()) await disconnectFromRealtime();
    clearSuggestions();
    setProjectPreview(null);
    setContactFormOpen(false);
    setContactFormData({});
    greetingSentRef.current = false;
    setTimeout(() => connectToRealtime(), 500);
  }, [clearSuggestions, disconnectFromRealtime, connectToRealtime]);

  // Immediately silence the agent when a UI action fires
  const silenceAgent = useCallback(() => {
    interrupt();
    mute(true);
  }, [interrupt, mute]);

  // Resume mic when overlay closes
  const uiOverlayOpen = contactFormOpen || calendlyModalOpen;
  useEffect(() => {
    if (!isConnectedRef()) return;
    if (!uiOverlayOpen) {
      mute(!isAudioPlaybackEnabled);
    }
  }, [uiOverlayOpen, mute, isAudioPlaybackEnabled]);

  // Agent UI actions (contact form, calendly, project preview)
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
        setCalendlyData({ url: output.calendly_url, details: output.meeting_details });
        setCalendlyModalOpen(true);
      } else if (name === 'show_project_preview' && output.success) {
        setProjectPreview({
          name: output.project.name || '',
          description: output.project.description || '',
          liveUrl: output.project.liveUrl || '',
          githubUrl: output.project.githubUrl || '',
          tech: output.project.tech || [],
        });
      }
    };
    window.addEventListener('agent-tool-response', handler);
    return () => window.removeEventListener('agent-tool-response', handler);
  }, [silenceAgent]);

  // Audio playback
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

  // Recording control
  useEffect(() => {
    if (isConnected && audioElementRef.current?.srcObject) {
      startRecording(audioElementRef.current.srcObject as MediaStream);
    }
    if (isDisconnected) stopRecording();
  }, [isConnected, isDisconnected, startRecording, stopRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopRecording();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
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
    projectPreview,
    setProjectPreview,
    handleSuggestionClick,
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
  };
}

export default useVoiceAgent;
