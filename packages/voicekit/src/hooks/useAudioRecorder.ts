'use client';

import { useRef, useCallback } from 'react';
import { convertWebMToWav } from '../utils/audio';

/**
 * Hook for recording audio from a MediaStream
 * 
 * @example
 * ```tsx
 * const { startRecording, stopRecording, downloadRecording } = useAudioRecorder();
 * 
 * // Start recording from audio element
 * const stream = audioElement.srcObject as MediaStream;
 * startRecording(stream);
 * 
 * // Later...
 * stopRecording();
 * await downloadRecording(); // Downloads as WAV
 * ```
 */
export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (stream: MediaStream) => {
    if (mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data?.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.requestData();
      } catch {}
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
  }, []);

  const downloadRecording = useCallback(async (filename?: string) => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.requestData();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (recordedChunksRef.current.length === 0) {
      return null;
    }

    const webmBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });

    try {
      const wavBlob = await convertWebMToWav(webmBlob);
      const url = URL.createObjectURL(wavBlob);
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      const name = filename || `voice_recording_${now}.wav`;

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      return wavBlob;
    } catch (error) {
      console.error('Failed to convert recording:', error);
      throw error;
    }
  }, []);

  const getRecordingBlob = useCallback(async (): Promise<Blob | null> => {
    if (recordedChunksRef.current.length === 0) {
      return null;
    }
    const webmBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
    return convertWebMToWav(webmBlob);
  }, []);

  const clearRecording = useCallback(() => {
    recordedChunksRef.current = [];
  }, []);

  return {
    startRecording,
    stopRecording,
    downloadRecording,
    getRecordingBlob,
    clearRecording,
    isRecording: () => mediaRecorderRef.current?.state === 'recording',
  };
}
