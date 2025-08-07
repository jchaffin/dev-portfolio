import { useState, useCallback } from 'react';

interface VoiceSettings {
  stability: number;
  similarityBoost: number;
}

interface UseElevenLabsVoiceProps {
  apiKey: string;
  defaultVoiceId?: string;
  defaultSettings?: VoiceSettings;
}

export function useElevenLabsVoice({
  apiKey,
  defaultVoiceId = '21m00Tcm4TlvDq8ikWAM', // Rachel voice ID
  defaultSettings = { stability: 0.5, similarityBoost: 0.5 }
}: UseElevenLabsVoiceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const synthesizeSpeech = useCallback(async (
    text: string,
    voiceId: string = defaultVoiceId,
    settings: VoiceSettings = defaultSettings
  ): Promise<Blob | null> => {
    if (!apiKey) {
      setError('ElevenLabs API key is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId,
          apiKey,
          settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to synthesize speech');
      }

      const audioBlob = await response.blob();
      return audioBlob;
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize speech');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, defaultVoiceId, defaultSettings]);

  const getVoices = useCallback(async (): Promise<any[]> => {
    if (!apiKey) {
      setError('ElevenLabs API key is required');
      return [];
    }

    try {
      const response = await fetch(`/api/elevenlabs?apiKey=${encodeURIComponent(apiKey)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch voices');
      }

      const voices = await response.json();
      return voices;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch voices');
      return [];
    }
  }, [apiKey]);

  const playAudio = useCallback(async (audioBlob: Blob): Promise<void> => {
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      await audio.play();
      
      // Clean up the URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (err: any) {
      setError(err.message || 'Failed to play audio');
    }
  }, []);

  return {
    synthesizeSpeech,
    getVoices,
    playAudio,
    isLoading,
    error,
  };
}
