'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { rmsEnergy } from '../utils/audio';

export interface VADConfig {
  /** RMS energy threshold to consider speech (0..1). Default: 0.01 */
  speechThreshold?: number;
  /** RMS energy threshold to consider silence (0..1). Default: 0.005 */
  silenceThreshold?: number;
  /** How long silence must persist before triggering speech_end (ms). Default: 800 */
  silenceDebounceMs?: number;
  /** Minimum speech duration to be considered valid (ms). Default: 200 */
  minSpeechMs?: number;
  /** FFT size for the analyser node. Default: 2048 */
  fftSize?: number;
}

export interface VADState {
  isSpeaking: boolean;
  energy: number;
  speechStartedAt: number | null;
  lastSpeechAt: number | null;
}

export interface UseVADReturn {
  state: VADState;
  start: (stream: MediaStream) => void;
  stop: () => void;
  isRunning: boolean;
}

export function useVAD(
  config: VADConfig = {},
  callbacks?: {
    onSpeechStart?: () => void;
    onSpeechEnd?: (durationMs: number) => void;
    onEnergyChange?: (energy: number) => void;
  }
): UseVADReturn {
  const {
    speechThreshold = 0.01,
    silenceThreshold = 0.005,
    silenceDebounceMs = 800,
    minSpeechMs = 200,
    fftSize = 2048,
  } = config;

  const [state, setState] = useState<VADState>({
    isSpeaking: false,
    energy: 0,
    speechStartedAt: null,
    lastSpeechAt: null,
  });

  const [isRunning, setIsRunning] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  stateRef.current = state;

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const processFrame = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const energy = rmsEnergy(buffer);
    const now = Date.now();
    const prev = stateRef.current;

    callbacksRef.current?.onEnergyChange?.(energy);

    if (!prev.isSpeaking && energy >= speechThreshold) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setState({
        isSpeaking: true,
        energy,
        speechStartedAt: now,
        lastSpeechAt: now,
      });
      callbacksRef.current?.onSpeechStart?.();
    } else if (prev.isSpeaking && energy >= silenceThreshold) {
      setState(s => ({ ...s, energy, lastSpeechAt: now }));
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (prev.isSpeaking && energy < silenceThreshold) {
      setState(s => ({ ...s, energy }));
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          const current = stateRef.current;
          if (current.isSpeaking && current.speechStartedAt) {
            const duration = Date.now() - current.speechStartedAt;
            if (duration >= minSpeechMs) {
              callbacksRef.current?.onSpeechEnd?.(duration);
            }
          }
          setState(s => ({
            ...s,
            isSpeaking: false,
            speechStartedAt: null,
          }));
          silenceTimerRef.current = null;
        }, silenceDebounceMs);
      }
    } else {
      setState(s => ({ ...s, energy }));
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [speechThreshold, silenceThreshold, silenceDebounceMs, minSpeechMs]);

  const start = useCallback((stream: MediaStream) => {
    if (audioCtxRef.current) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = fftSize;
    source.connect(analyser);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    setIsRunning(true);

    rafRef.current = requestAnimationFrame(processFrame);
  }, [fftSize, processFrame]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    analyserRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsRunning(false);
    setState({
      isSpeaking: false,
      energy: 0,
      speechStartedAt: null,
      lastSpeechAt: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { state, start, stop, isRunning };
}
