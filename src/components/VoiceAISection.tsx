'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useSearchParams } from "next/navigation";
import { Activity, FileText, Volume2, Code } from 'lucide-react'
import { experiences, projects, skills } from '@/data/portfolio'
import { v4 as uuidv4 } from "uuid";

import Transcript from './Transcript'

// Types
import { SessionStatus } from "@/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

import { useEvent, EventProvider } from "@/contexts/EventContext";
import { useTranscript, TranscriptProvider } from '@/contexts/TranscriptContext'
import Events from "@/components/Events";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";

// Agent configs
import { meAgent } from "@/app/agentConfigs/MeAgent";
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

import useAudioDownload from "@/hooks/useAudioDownload";
import { useHandleSessionHistory } from "@/hooks/useHandleSessionHistory";

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
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('')
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>('')
  const [userText, setUserText] = useState<string>('')

  // Portfolio data for context
  const portfolioContext = {
    experiences,
    projects: projects.filter(p => p.featured),
    skills: skills.slice(0, 8), // Top skills
    summary: "Dynamic Fullstack Engineer with 5+ years of experience specializing in Voice AI and conversational technologies."
  }
  const searchParams = useSearchParams()!;
  const urlCodec = searchParams.get("codec") || "opus";
  
  const { loggedEvents } = useEvent();
  const { transcriptItems, addTranscriptBreadcrumb } = useTranscript();

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    RealtimeAgent[] | null
  >(null);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  // Initialize agent selection from URL parameters
  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    
    // Debug logging
    console.log("Available agent sets:", Object.keys(allAgentSets));
    console.log("Requested agent config:", finalAgentConfig);
    console.log("Agent exists check:", finalAgentConfig && allAgentSets[finalAgentConfig]);
    console.log("All agent sets content:", allAgentSets);
    
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      console.log("Agent not found, redirecting to default:", defaultAgentSetKey);
          console.log("Final agent config before redirect:", finalAgentConfig);
    console.log("allAgentSets[finalAgentConfig]:", finalAgentConfig ? allAgentSets[finalAgentConfig] : "undefined");
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
  });

  const [isSuggestionsPaneExpanded, setIsSuggestionsPaneExpanded] =
    useState<boolean>(true);
  const [isLogsPopupVisible, setIsLogsPopupVisible] = useState<boolean>(false);
  // Removed push-to-talk - using continuous listening
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

  // Fetch API keys from server
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch('/api/get-api-keys')
        if (response.ok) {
          const data = await response.json()
          setOpenaiApiKey(data.openaiApiKey || '')
          setElevenlabsApiKey(data.elevenlabsApiKey || '')
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error)
      }
    }
    fetchApiKeys()
  }, [])

  const connectToRealtime = async () => {
    const agentSetKey = searchParams.get("agentConfig") || defaultAgentSetKey;
    console.log("Attempting to connect with agent config:", agentSetKey);
    console.log("Current sessionStatus:", sessionStatus);
    
    if (!selectedAgentConfigSet || sessionStatus !== "DISCONNECTED") {
      console.log("No agent config set or already connected, returning");
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

      console.log("Calling connect with selected agents:", selectedAgentConfigSet.map(a => a.name));
      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: selectedAgentConfigSet,
        audioElement: sdkAudioElement,
        outputGuardrails: [], // Temporarily disable guardrails
        extraContext: {
          addTranscriptBreadcrumb,
          systemMessage: "You are an English-speaking interviewer. Always respond in English only.",
        },
      });
      console.log("Connect call completed successfully");
      
      // Trigger initial greeting after connection is established
      setTimeout(() => {
        console.log("Triggering initial greeting");
        sendClientEvent({ type: "response.create" });
      }, 1000);
      
    } catch (err) {
      console.error("Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);

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

  const handleSendTextMessage = () => {
    if (!userText.trim() || sessionStatus !== "CONNECTED") return;
    
    sendUserText(userText);
    setUserText('');
  };

  // Removed talk button functionality - using continuous listening instead

  const onToggleConnection = async () => {
    console.log("Connect button clicked, current status:", sessionStatus);
    
    if (sessionStatus === "CONNECTED") {
      console.log("Disconnecting...");
      disconnectFromRealtime();
    } else {
      console.log("Starting connection...");
      
      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone permission granted");
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
        
        connectToRealtime();
      } catch (error) {
        console.error("Microphone permission denied:", error);
        alert("Microphone permission is required for voice interaction. Please allow microphone access and try again.");
      }
    }
  };

  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    // Removed push-to-talk storage - using continuous listening
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsSuggestionsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  // Removed push-to-talk localStorage - using continuous listening

  useEffect(() => {
    localStorage.setItem("logsExpanded", isSuggestionsPaneExpanded.toString());
  }, [isSuggestionsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
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

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  return (
    <section id="voice-ai" className="py-20 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-purple-500 rounded-full blur-xl"
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
          className="absolute bottom-20 right-20 w-24 h-24 bg-blue-500 rounded-full blur-xl"
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
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Jacob's Voice Agent
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            OpenAI Realtime API powered voice assistant with portfolio data access
          </p>
        </motion.div>

        {/* Voice Agent Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-700/50 p-6 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${sessionStatus === 'CONNECTED' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                  <h3 className="text-xl font-semibold text-white">Jacob's AI Assistant</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-400">
                    {sessionStatus === 'CONNECTED' ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div className="h-96 overflow-y-auto p-6">
              <Transcript 
                userText={userText}
                setUserText={setUserText}
                onSendMessage={handleSendTextMessage}
                downloadRecording={downloadRecording}
                canSend={sessionStatus === "CONNECTED"}
              />
            </div>

            {/* Controls */}
            <div className="p-6 border-t border-gray-600">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={onToggleConnection}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                    sessionStatus === 'CONNECTED'
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  {sessionStatus === 'CONNECTED' ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              {/* Text Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-4 py-2 rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendTextMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendTextMessage}
                  disabled={sessionStatus !== 'CONNECTED'}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  Send
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
              className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default VoiceAISection 