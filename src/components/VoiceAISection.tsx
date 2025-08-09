'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useSearchParams } from "next/navigation";
import { Activity, FileText, Volume2, Send } from 'lucide-react'
import { experiences, projects, skills } from '@/data/portfolio'
import resumeData from '@/data/sample-resume.json'
import ReactMarkdown from "react-markdown";

// Types
import { SessionStatus, PortfolioContext, VoiceAIState, VoiceAIActions, MessageItem } from "@/types";
import { VOICE_AI_CONSTANTS, SESSION_STATUS } from "@/lib/constants";

import { useEvent, EventProvider } from "@/contexts/EventContext";
import { useTranscript, TranscriptProvider } from '@/contexts/TranscriptContext'
import { useRealtimeSession } from "@/hooks/useRealtimeSession";

// Agent configs
import { meAgent } from "@/app/agentConfigs/MeAgent";

import useAudioDownload from "@/hooks/useAudioDownload";
import { useHandleSessionHistory } from "@/hooks/useHandleSessionHistory";

// Voice AI Section
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

  const [userText, setUserText] = useState<string>('')

  // Portfolio data for context
  const portfolioContext: PortfolioContext = {
    experiences: experiences as any,
    projects: projects.filter(p => p.featured) as any,
    skills: skills.slice(0, VOICE_AI_CONSTANTS.TOP_SKILLS_COUNT) as any, // Top skills
    summary: "Dynamic Voice AI Engineer with 5+ years of experience specializing in real-time voice AI infrastructure and conversational technologies.",
    resume: {
      workExperience: experiences as any,
      technicalSkills: skills as any,
      projects: projects as any,
      summary: "Open to opportunities in realtime voice AI, MCP and AG-UI protocol implementations, and agentic systems."
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
  const searchParams = useSearchParams()!;
  const urlCodec = searchParams.get("codec") || VOICE_AI_CONSTANTS.DEFAULT_CODEC;
  
  const { loggedEvents } = useEvent();
  const { transcriptItems, addTranscriptBreadcrumb, clearTranscript } = useTranscript();

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    el.volume = VOICE_AI_CONSTANTS.AUDIO_VOLUME; // Ensure volume is set
    document.body.appendChild(el);
    console.log("🎵 Audio element created:", el);
    return el;
  }, []);

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);

  // Initialize agent selection from URL parameters
  useEffect(() => {
    console.log("🎯 MEAGENT SELECTED - Portfolio assistant ready");
    console.log("MeAgent config:", meAgent);
  }, []);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
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
  
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();
  
  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  // Fetch ephemeral key for realtime session
  const fetchEphemeralKey = async (): Promise<string | null> => {
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();

    if (!data.client_secret?.value) {
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  // Connect to realtime session
  const connectToRealtime = async () => {
    console.log("🚀 CONNECT ATTEMPT - Agent config: meAgent");
    console.log("Current sessionStatus:", sessionStatus);
    
    if (sessionStatus !== "DISCONNECTED") {
      console.log("❌ CONNECTION BLOCKED - Session status:", sessionStatus);
      return;
    }
    console.log("Setting status to CONNECTING");
    setSessionStatus("CONNECTING");

    try {
      console.log("Fetching ephemeral key...");
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        console.error("No ephemeral key received");
        return;
      }
      console.log("Ephemeral key received successfully");

      console.log("🤖 CONNECTING - Agent config set: meAgent");
      console.log("🎵 Audio element for connection:", sdkAudioElement);
      
      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: [meAgent],
        audioElement: sdkAudioElement,
        outputGuardrails: [], // Temporarily disable guardrails
        extraContext: {
          addTranscriptBreadcrumb,
          portfolioContext,
        },
      });
      console.log("✅ CONNECTION SUCCESSFUL - Agent connected");
      
      // Trigger initial greeting after connection is established
      setTimeout(() => {
        console.log("🎤 Triggering initial greeting");
        sendClientEvent({ type: "response.create" });
      }, VOICE_AI_CONSTANTS.INITIAL_GREETING_DELAY);
      
    } catch (err) {
      console.error("Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  //  disconnect from realtime session
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
    
    // Disconnect from the realtime session
    try {
      await disconnect();
      console.log("✅ Realtime session disconnected");
    } catch (error) {
      console.error('Error disconnecting from realtime session:', error);
    } finally {
      setSessionStatus("DISCONNECTED");
      clearTranscript();
      console.log("🧹 Disconnect process completed");
    }
  };

  // send text message to realtime session
  const handleSendTextMessage = () => {
    if (!userText.trim() || sessionStatus !== "CONNECTED") return;
    
    // Send the text message using the SDK
    sendUserText(userText.trim());
    setUserText('');
  };

  // Removed talk button functionality - using continuous listening instead

  const onToggleConnection = async () => {
    console.log("Connect button clicked, current status:", sessionStatus);
    
    if (sessionStatus === "CONNECTED") {
      console.log("Disconnecting...");
      await disconnectFromRealtime();
    } else {
      console.log("Starting connection...");
      
      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone permission granted");
        setMicrophoneStream(stream); // Store the stream for later cleanup
        
        // Ensure audio element is ready for autoplay
        if (sdkAudioElement) {
          sdkAudioElement.muted = false;
          sdkAudioElement.volume = VOICE_AI_CONSTANTS.AUDIO_VOLUME;
          console.log("🎵 Audio element prepared for autoplay");
        }
        
        connectToRealtime();
      } catch (error) {
        console.error("Microphone permission denied:", error);
        alert("Microphone permission is required for voice interaction. Please allow microphone access and try again.");
      }
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
        audioElementRef.current.volume = VOICE_AI_CONSTANTS.AUDIO_VOLUME;
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
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Only stop recording when session is disconnecting
    if (sessionStatus === "DISCONNECTED") {
      stopRecording();
    }
  }, [sessionStatus]);

  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting, cleaning up...");
      
      // Stop recording
      stopRecording();
      
      if (microphoneStream) {
        console.log("🧹 CLEANUP - Stopping microphone on component unmount");
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
            OpenAI Realtime API powered voice assistant with portfolio data access
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
                  <h3 className="text-xl font-semibold text-theme-primary">Jacob's AI Assistant</h3>
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
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6">
              <div className="flex flex-col gap-y-4">
                {transcriptItems
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
                  })}
              </div>
            </div>
            {/* Controls */}
            <div className="p-6 border-t border-theme-primary/20 bg-transparent backdrop-blur-xl">
              {/* Text Input */}
              <div className="flex gap-2">
                <input
                
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 bg-theme-tertiary border border-theme-secondary text-theme-primary placeholder-theme-secondary px-4 py-2 rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendTextMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendTextMessage}
                  disabled={sessionStatus !== 'CONNECTED'}
                  className="px-4 py-2 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
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
              icon: <Activity className="h-6 w-6" />,
              title: "OpenAI Realtime",
              description: "Advanced AI conversation with portfolio context"
            },
            {
              icon: <FileText className="h-6 w-6" />,
              title: "Resume Access",
              description: "Real-time access to work experience and projects"
            },
            {
              icon: <Volume2 className="h-6 w-6" />,
              title: "Voice Synthesis",
              description: "Natural AI voice responses"
            }
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
    </section>
  );
}

export default VoiceAISection 