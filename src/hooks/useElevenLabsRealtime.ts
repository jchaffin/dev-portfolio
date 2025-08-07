import { useCallback, useRef, useState } from 'react';
import { useRealtimeSession, ConnectOptions } from './useRealtimeSession';
import { useElevenLabsVoice } from './useElevenLabsVoice';
import { SessionStatus } from '@/types';

interface UseElevenLabsRealtimeProps {
  elevenlabsApiKey: string;
  voiceId?: string;
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export function useElevenLabsRealtime({
  elevenlabsApiKey,
  voiceId = '21m00Tcm4TlvDq8ikWAM', // Rachel voice ID
  onConnectionChange,
  onAgentHandoff,
}: UseElevenLabsRealtimeProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef(false);

  const { synthesizeSpeech, playAudio, isLoading: elevenlabsLoading } = useElevenLabsVoice({
    apiKey: elevenlabsApiKey,
    defaultVoiceId: voiceId,
  });

  const {
    status,
    connect: originalConnect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } = useRealtimeSession({
    onConnectionChange,
    onAgentHandoff,
  });

  // Intercept text responses and convert to ElevenLabs speech
  const handleTextResponse = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setCurrentText(text);
    setIsProcessing(true);

    try {
      // Synthesize speech using ElevenLabs
      const audioBlob = await synthesizeSpeech(text, voiceId);
      
      if (audioBlob) {
        // Create audio element and add to queue
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audioQueueRef.current.push(audio);
        
        // Play audio if not currently playing
        if (!isPlayingRef.current) {
          playNextInQueue();
        }
      }
    } catch (error) {
      console.error('Failed to synthesize speech:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [synthesizeSpeech, voiceId]);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audio = audioQueueRef.current.shift()!;

    try {
      await audio.play();
      
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        playNextInQueue();
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        URL.revokeObjectURL(audio.src);
        playNextInQueue();
      };
    } catch (error) {
      console.error('Failed to play audio:', error);
      URL.revokeObjectURL(audio.src);
      playNextInQueue();
    }
  }, []);

  // Override connect to add text response handling
  const connect = useCallback(async (options: ConnectOptions) => {
    // Add event listener for text responses
    const originalOnConnectionChange = options.extraContext?.onConnectionChange;
    
    const enhancedOptions = {
      ...options,
      extraContext: {
        ...options.extraContext,
        onConnectionChange: (status: SessionStatus) => {
          originalOnConnectionChange?.(status);
          onConnectionChange?.(status);
        },
        onTextResponse: handleTextResponse,
      },
    };

    return originalConnect(enhancedOptions);
  }, [originalConnect, handleTextResponse, onConnectionChange]);

  // Clear audio queue
  const clearAudioQueue = useCallback(() => {
    audioQueueRef.current.forEach(audio => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // Enhanced disconnect that clears audio queue
  const enhancedDisconnect = useCallback(() => {
    clearAudioQueue();
    disconnect();
  }, [clearAudioQueue, disconnect]);

  // Enhanced interrupt that clears audio queue
  const enhancedInterrupt = useCallback(() => {
    clearAudioQueue();
    interrupt();
  }, [clearAudioQueue, interrupt]);

  return {
    // Realtime session methods
    status,
    connect,
    disconnect: enhancedDisconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt: enhancedInterrupt,
    
    // ElevenLabs specific methods
    isProcessing: isProcessing || elevenlabsLoading,
    currentText,
    clearAudioQueue,
    
    // Voice control
    setVoiceId: (newVoiceId: string) => {
      // This would need to be implemented to change voice during session
      console.log('Voice ID changed to:', newVoiceId);
    },
  };
}
