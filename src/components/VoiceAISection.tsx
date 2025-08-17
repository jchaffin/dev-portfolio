'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Activity, FileText, Volume2, Repeat, Filter } from 'lucide-react'
import CalendlyModal from './CalendlyModal'
// Removed CopilotKit imports - using voice agent only
import { experiences, skills } from '@/data/portfolio'
import { getProjects, type Project } from '@/lib/getProjects'
import resumeData from '@/data/resume.json'
import ReactMarkdown from "react-markdown";

// Types
import { SessionStatus, PortfolioContext } from "@/types";
import { VOICE_AI_CONSTANTS } from "@/lib/constants";

import { EventProvider } from "@/contexts/EventContext";
import { useTranscript, TranscriptProvider } from '@/contexts/TranscriptContext'
import { useRealtimeSession } from "@/hooks/useRealtimeSession";

// Agent configs
import { meAgent } from "@/agents/MeAgent";

import useAudioDownload from "@/hooks/useAudioDownload";

// Error Boundary for CopilotKit
class CopilotErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('CopilotKit Error (non-critical):', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render without CopilotKit if there's an error
      return this.props.children;
    }

    return this.props.children;
  }
}

// Voice AI Section - Using voice agent only
const VoiceAISection = () => {
  return (
    <EventProvider>
      <TranscriptProvider>
        <VoiceAIContent />
      </TranscriptProvider>
    </EventProvider>
  );
}

const VoiceAIContent = () => {
  // Dynamic projects state
  const [projects, setProjects] = useState<Project[]>([])
  
  // Copilot modals state
  const [contactFormOpen, setContactFormOpen] = useState(false)
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false)
  const [contactFormData, setContactFormData] = useState<{subject?: string, context?: string}>({})
  const [formSubmissionState, setFormSubmissionState] = useState<{
    name: string,
    email: string,
    subject: string,
    message: string,
    isSubmitting: boolean,
    submitStatus: 'idle' | 'success' | 'error'
  }>({
    name: '',
    email: '',
    subject: '',
    message: '',
    isSubmitting: false,
    submitStatus: 'idle'
  })
  const [calendlyData, setCalendlyData] = useState<{url: string, details?: {type: string, duration: string}}>({url: ''})

  // Voice agent UI control handlers - triggered by agent tool responses
  const handleAgentUIAction = (toolName: string, response: any) => {
    console.log("🚀 Voice agent triggered UI action:", { toolName, response });
    
    if (toolName === 'send_email' && response.success && response.action === 'show_contact_form') {
      setContactFormData({
        subject: response.form_data?.subject || '',
        context: response.form_data?.context || ''
      });
      setContactFormOpen(true);
    } else if (toolName === 'set_meeting' && response.success && response.action === 'open_calendly') {
      setCalendlyData({
        url: response.calendly_url,
        details: response.meeting_details
      });
      setCalendlyModalOpen(true);
    }
  };

  // Handle contact form submission
  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmissionState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formSubmissionState.name,
          email: formSubmissionState.email,
          subject: formSubmissionState.subject,
          message: formSubmissionState.message
        })
      });
      
      if (response.ok) {
        setFormSubmissionState(prev => ({ 
          ...prev, 
          submitStatus: 'success',
          isSubmitting: false 
        }));
        setTimeout(() => {
          setContactFormOpen(false);
          setFormSubmissionState({
            name: '',
            email: '',
            subject: '',
            message: '',
            isSubmitting: false,
            submitStatus: 'idle'
          });
        }, 2000);
      } else {
        setFormSubmissionState(prev => ({ 
          ...prev, 
          submitStatus: 'error',
          isSubmitting: false 
        }));
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setFormSubmissionState(prev => ({ 
        ...prev, 
        submitStatus: 'error',
        isSubmitting: false 
      }));
    }
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormSubmissionState(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Listen for voice agent tool responses
  useEffect(() => {
    const handleToolResponse = (event: any) => {
      if (event.detail && event.detail.type === 'agent_tool_end') {
        const { name, output } = event.detail;
        if (name === 'send_email' || name === 'set_meeting') {
          handleAgentUIAction(name, output);
        }
      }
    };

    window.addEventListener('agent-tool-response', handleToolResponse);
    return () => window.removeEventListener('agent-tool-response', handleToolResponse);
  }, []);

  // Fetch dynamic projects
  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  // Portfolio data for context - fully dynamic from resume and GitHub
  const portfolioContext: PortfolioContext = {
    experiences: experiences as any,
    projects: projects as any, // Dynamic projects from GitHub API
    skills: skills.slice(0, VOICE_AI_CONSTANTS.TOP_SKILLS_COUNT) as any, // Dynamic skills from resume
    summary: resumeData.summary, // Dynamic summary from resume
    resume: {
      workExperience: experiences as any,
      technicalSkills: skills as any,
      projects: projects as any,
      summary: resumeData.summary // Dynamic summary from resume
    },
    // Complete resume data
    completeResume: {
      summary: resumeData.summary,
      skills: resumeData.skills as any,
      experience: resumeData.experience as any,
      education: resumeData.education as any,
      contact: resumeData.contact,
    }
  }
  const { transcriptItems, clearTranscript } = useTranscript();

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    el.volume = 1.0; // Ensure volume is set
    document.body.appendChild(el);
    console.log("🎵 Audio element created:", el);
    return el;
  }, []);

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
      console.log("🎵 Audio element attached to ref:", sdkAudioElement);
      
      // Add event listeners to debug audio
      sdkAudioElement.addEventListener('loadedmetadata', () => {
        console.log("🎵 Audio metadata loaded");
      });
      
      sdkAudioElement.addEventListener('play', () => {
        console.log("🎵 Audio started playing");
      });
      
      sdkAudioElement.addEventListener('pause', () => {
        console.log("🎵 Audio paused");
      });
      
      sdkAudioElement.addEventListener('error', (e) => {
        console.error("🎵 Audio error:", e);
      });
    }
  }, [sdkAudioElement]);



  // Initialize agent selection from URL parameters
  useEffect(() => {
    // Agent selection initialization logic can be added here if needed
  }, []);

  const {
    connect,
    disconnect,
    mute,
    sendEvent,
  } = useRealtimeSession({
    onConnectionChange: (s) => {
      console.log("🔄 Session status changed:", s);
      setSessionStatus(s as SessionStatus);
    },
  });

  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );

  const { startRecording, stopRecording } = useAudioDownload();
  
  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  const fetchEphemeralKey = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.ephemeralKey || null;
    } catch {
      return null;
    }
  };

  const connectToRealtime = async () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      return;
    }

    try {
      // Clear previous transcript on fresh connect
      clearTranscript();
      console.log("Fetching ephemeral key...");
      const ephemeralKey = await fetchEphemeralKey();
      if (!ephemeralKey) {
        console.error("No ephemeral key received");
        return;
      }
      console.log("Ephemeral key received successfully");

      const sdkAudioElement = audioElementRef.current;
      console.log("🤖 AGENT NAMES:", [meAgent.name]);
      console.log("🎵 Audio element for connection:", sdkAudioElement);
      
      if (!sdkAudioElement) {
        throw new Error("Audio element not available");
      }
      
      await connect({
        getEphemeralKey: () => Promise.resolve(ephemeralKey),
        initialAgents: [meAgent],
        audioElement: sdkAudioElement,
        extraContext: {
          portfolio: portfolioContext,
        },
        outputGuardrails: [],
      });
      console.log("✅ CONNECTION SUCCESSFUL - Agent connected");
      
      // Trigger initial greeting after connection is established
      setTimeout(() => {
        console.log("🎤 Triggering initial greeting");
        sendClientEvent({ type: "response.create" });
      }, 1000);
      
    } catch (error) {
      console.error("❌ Connection failed:", error);
      console.error("❌ Connection error details:", {
        sessionStatus,
        audioElement: sdkAudioElement ? "present" : "missing",
        error
      });
    }
  };

  const disconnectFromRealtime = async () => {
    console.log("🔌 Starting disconnect process...");
    
    // First, stop the active microphone stream
      if (microphoneStream) {
      console.log("🎤 Stopping microphone stream...");
      try {
        // Stop all tracks and disable them
        microphoneStream.getTracks().forEach(track => {
          console.log("Stopping microphone track:", track.kind, track.id);
          track.stop();
          track.enabled = false;
        });
        
        // Clear the stream reference
        setMicrophoneStream(null);
        console.log("✅ Microphone stream stopped successfully");
      } catch (error) {
        console.error("Error stopping microphone stream:", error);
      }
    }
    
    // Stop any recording that might be active
    try {
      stopRecording();
      console.log("✅ Recording stopped");
    } catch (error) {
      console.error("Error stopping recording:", error);
    }

    // Immediately clear any audio element streams
    try {
      if (audioElementRef.current) {
        const src = audioElementRef.current.srcObject as MediaStream | null;
        audioElementRef.current.srcObject = null;
        if (src) {
          src.getTracks().forEach((t) => { try { t.stop(); } catch { /* no-op */ } });
        }
        try { audioElementRef.current.pause(); } catch { /* no-op */ }
      }
    } catch { /* no-op */ }

    // Force-release microphone by acquiring and immediately stopping a fresh stream
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach((t) => { try { t.stop(); } catch { /* no-op */ } });
    } catch { /* ignore */ }
    
    // Disconnect from the realtime session
    try {
      await disconnect();
      console.log("✅ Realtime session disconnected");
    } catch (error) {
      console.error('Error disconnecting from realtime session:', error);
    } finally {
      setSessionStatus("DISCONNECTED");
      console.log("🧹 Disconnect process completed");
    }
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Use server-side voice activity detection for continuous listening
    const turnDetection = { type: "server_vad" as const };

    sendClientEvent({
      type: "session.update",
      session: {
        turn_detection: turnDetection,
        audio_playback: {
          mode: isAudioPlaybackEnabled ? "enabled" : "disabled",
        },
      },
    });

    if (shouldTriggerResponse) {
      sendClientEvent({ type: "response.create" });
    }
  };


  // Removed talk button functionality - using continuous listening instead

  const onToggleConnection = async () => {
    if (sessionStatus === "CONNECTED") {
      await disconnectFromRealtime();
    } else {
      // Ensure audio element is ready for autoplay; SDK will request mic
      if (sdkAudioElement) {
        sdkAudioElement.muted = false;
        sdkAudioElement.volume = 1.0;
        console.log("🎵 Audio element prepared for autoplay");
      }

      connectToRealtime();
    }
  };

  useEffect(() => {
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      console.log("🔊 Audio playback setting:", isAudioPlaybackEnabled);
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.volume = 1.0;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
        console.log("🔊 Audio unmuted and playing");
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
        console.log("🔇 Audio muted and paused");
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch {
    }
  }, [isAudioPlaybackEnabled, mute]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch {
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled, mute]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Only stop recording when session is disconnecting
    if (sessionStatus === "DISCONNECTED") {
      stopRecording();
      // Ensure microphone stream is fully released on any disconnect path
      if (microphoneStream) {
        try {
          microphoneStream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch {
          // no-op
        } finally {
          setMicrophoneStream(null);
        }
      }

      // Also clear any srcObject on the audio element
      if (audioElementRef.current) {
        try {
          const src = audioElementRef.current.srcObject as MediaStream | null;
          audioElementRef.current.srcObject = null;
          if (src) {
            src.getTracks().forEach((t) => {
              try { t.stop(); } catch { /* no-op */ }
            });
          }
        } catch { /* no-op */ }
        try { audioElementRef.current.pause(); } catch { /* no-op */ }
      }

      // Final fallback removed to avoid re-acquiring the mic in effects
    }
  }, [sessionStatus, startRecording, stopRecording, microphoneStream]);

  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting, cleaning up...");
      
      // Stop recording
      stopRecording();
      
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => {
          track.stop();
        });
        setMicrophoneStream(null);
      }
      
      if (sessionStatus === "CONNECTED") {
        console.log("🧹 CLEANUP - Disconnecting session on component unmount");
        disconnect().catch(error => {
          console.error('Error during cleanup disconnect:', error);
        });
      }
    };
  }, []); // Empty dependency array - only run on unmount

  return (
    <section id="voice-ai" className="py-20 bg-gradient-primary dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-accent-secondary rounded-full blur-xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-24 h-24 bg-accent-primary rounded-full blur-xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
          Voice Agent
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            Realtime Conversational AI.
          </p>
        </motion.div>

        {/* Voice Agent Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full flex justify-center"
        >
          <div className="w-full max-w-4xl bg-blue-400 glass rounded-xl border border-theme-primary/30 overflow-hidden shadow-lg">
            {/* Header */}
            <div className="bg-transparent backdrop-blur-xl p-6 border-b border-theme-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${sessionStatus === 'CONNECTED' ? 'bg-accent-success' : 'bg-accent-error'} animate-pulse`}></div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onToggleConnection}
                    className={`text-xs font-medium transition-all duration-300 cursor-pointer ${
                      sessionStatus === 'CONNECTED' 
                        ? 'text-red-500 hover:text-red-400' 
                        : 'text-blue-500 hover:text-blue-400'
                    }`}
                  >
                    {sessionStatus === 'CONNECTED' ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
            {/* Voice Conversation Messages */}
            <div className="h-96 overflow-y-auto p-6">
              <div className="flex flex-col gap-y-4">
                {transcriptItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-theme-secondary">
                    <div className="text-center">
                      <p className="mb-2">🎤 Connect to start your voice conversation</p>
                      <p className="text-sm">The AI can help you learn about Jacob's work and even open contact forms or schedule meetings!</p>
                    </div>
                  </div>
                ) : (
                  transcriptItems
                    .filter(item => item.type === "MESSAGE" && !item.isHidden)
                    .sort((a, b) => a.createdAtMs - b.createdAtMs)
                    .map((item) => {
                      const isUser = item.role === "user";
                      const title = item.title || "";
                      const displayTitle = title.startsWith("[") && title.endsWith("]") 
                        ? title.slice(1, -1) 
                        : title;

                      return (
                        <div key={item.itemId} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-lg p-3 rounded-xl ${
                            isUser 
                              ? "bg-accent-secondary text-white" 
                              : "bg-theme-tertiary text-theme-primary"
                          }`}>
                            <div className={`text-xs font-mono mb-1 ${
                              isUser ? "text-white/80" : "text-theme-secondary"
                            }`}>
                              {item.timestamp}
                            </div>
                            <div className="whitespace-pre-wrap">
                              <ReactMarkdown>{displayTitle}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Voice Actions Card - Shows when connected */}
            {sessionStatus === 'CONNECTED' && !contactFormOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-theme-tertiary border border-theme-secondary rounded-lg"
              >
                <h3 className="text-lg font-semibold text-theme-primary mb-3">
                  🎤 Voice Commands Available
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setContactFormData({ subject: '', context: '' });
                      setContactFormOpen(true);
                    }}
                    className="flex-1 flex items-center gap-3 p-3 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg transition-colors"
                  >
                    <FileText className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Send Email</div>
                      <div className="text-sm opacity-90">Say "I want to contact Jacob"</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setCalendlyData({
                        url: 'https://calendly.com/jacobchaffin/general-meeting',
                        details: { type: 'general', duration: '30min' }
                      });
                      setCalendlyModalOpen(true);
                    }}
                    className="flex-1 flex items-center gap-3 p-3 bg-purple-600 hover:bg-purple-600/80 text-white rounded-lg transition-colors"
                  >
                    <Activity className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Schedule Meeting</div>
                      <div className="text-sm opacity-90">Say "I want to schedule a meeting"</div>
                    </div>
                  </button>
                </div>
                
                <p className="text-sm text-theme-secondary mt-3 text-center">
                  Ask me anything about Jacob's work, or request actions using voice commands!
                </p>
              </motion.div>
            )}

            {/* Inline Contact Form */}
            {contactFormOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 p-6 bg-theme-tertiary border border-theme-secondary rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-theme-primary">Contact Jacob</h3>
                  <button
                    onClick={() => setContactFormOpen(false)}
                    className="text-theme-secondary hover:text-theme-primary"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={handleContactFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formSubmissionState.name}
                      onChange={handleFormInputChange}
                      className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formSubmissionState.email}
                      onChange={handleFormInputChange}
                      className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formSubmissionState.subject}
                      onChange={handleFormInputChange}
                      className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm"
                      placeholder="What's this about?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      value={formSubmissionState.message}
                      onChange={handleFormInputChange}
                      className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm resize-none"
                      placeholder="Tell Jacob what you'd like to discuss..."
                    />
                  </div>
                  
                  {formSubmissionState.submitStatus === 'success' && (
                    <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                      ✅ Message sent successfully! We'll get back to you soon.
                    </div>
                  )}
                  
                  {formSubmissionState.submitStatus === 'error' && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                      ❌ Failed to send message. Please try again.
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setContactFormOpen(false)}
                      className="flex-1 px-4 py-2 border border-theme-secondary text-theme-secondary rounded-lg hover:bg-theme-secondary hover:text-theme-primary transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmissionState.isSubmitting || formSubmissionState.submitStatus === 'success'}
                      className="flex-1 px-4 py-2 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {formSubmissionState.isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </div>
        </motion.div>
        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: <Volume2 className="h-6 w-6" />,
              title: "Realtime STS",
              description: "Sub 200ms latency STS AI with real-time voice synthesis"
            },
            {
              icon: <FileText className="h-6 w-6" />,
              title: "Retrieval Augmented Generation",
              description: "Uses RAG to retrieve project details and code snippets"
            },
            {
              icon: <Repeat className="h-6 w-6" />,
              title: "UG-AI Protocol",
              description: "Uses Human-in-the-loop to improve agentic systems"
            },
      
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-theme-primary">{feature.title}</h3>
              </div>
              <p className="text-theme-secondary">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Calendly Modal */}
      <CalendlyModal
        isOpen={calendlyModalOpen}
        onClose={() => setCalendlyModalOpen(false)}
        calendlyUrl={calendlyData.url}
        meetingDetails={calendlyData.details}
      />
    </section>
  );
}

export default VoiceAISection 