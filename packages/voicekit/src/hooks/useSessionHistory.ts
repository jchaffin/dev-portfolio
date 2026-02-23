'use client';

import { useRef, useEffect } from 'react';
import { useTranscript } from '../contexts/TranscriptContext';
import { useEvent } from '../contexts/EventContext';

export function useSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  const accumulatedTextRef = useRef<Map<string, string>>(new Map());
  const pendingDeltasRef = useRef<Map<string, string[]>>(new Map());
  const deltaTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const interruptedItemsRef = useRef<Set<string>>(new Set());
  
  // Audio tracking for barge-in
  const totalAudioDurationRef = useRef<Map<string, number>>(new Map());

  const extractMessageText = (content: unknown[] = []): string => {
    if (!Array.isArray(content)) return '';
    return content
      .map((c: unknown) => {
        if (!c || typeof c !== 'object') return '';
        const item = c as Record<string, unknown>;
        if (item.type === 'input_text') return (item.text as string) ?? '';
        if (item.type === 'audio') return (item.transcript as string) ?? '';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  };

  const extractFunctionCallByName = (name: string, content: unknown[] = []) => {
    if (!Array.isArray(content)) return undefined;
    return content.find(
      (c: unknown) =>
        c && typeof c === 'object' && (c as Record<string, unknown>).type === 'function_call' && (c as Record<string, unknown>).name === name
    );
  };

  const maybeParseJson = (val: unknown) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  const extractLastAssistantMessage = (history: unknown[] = []) => {
    if (!Array.isArray(history)) return undefined;
    return [...history].reverse().find(
      (c: unknown) =>
        c && typeof c === 'object' && (c as Record<string, unknown>).type === 'message' && (c as Record<string, unknown>).role === 'assistant'
    );
  };

  const extractModeration = (obj: unknown): Record<string, unknown> | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    const o = obj as Record<string, unknown>;
    if ('moderationCategory' in o) return o;
    if ('outputInfo' in o) return extractModeration(o.outputInfo);
    if ('output' in o) return extractModeration(o.output);
    if ('result' in o) return extractModeration(o.result);
    return undefined;
  };

  const sketchilyDetectGuardrailMessage = (text: string) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  function handleAgentToolStart(details: Record<string, unknown>, _agent: unknown, functionCall: Record<string, unknown>) {
    const context = details?.context as Record<string, unknown> | undefined;
    const history = context?.history as unknown[];
    const lastFunctionCall = extractFunctionCallByName(functionCall.name as string, history) as Record<string, unknown> | undefined;
    addTranscriptBreadcrumb(`function call: ${lastFunctionCall?.name}`, lastFunctionCall?.arguments as Record<string, unknown>);
  }

  function handleAgentToolEnd(details: Record<string, unknown>, _agent: unknown, functionCall: Record<string, unknown>, result: unknown) {
    const context = details?.context as Record<string, unknown> | undefined;
    const history = context?.history as unknown[];
    const lastFunctionCall = extractFunctionCallByName(functionCall.name as string, history) as Record<string, unknown> | undefined;
    addTranscriptBreadcrumb(`function call result: ${lastFunctionCall?.name}`, maybeParseJson(result) as Record<string, unknown>);
  }

  function handleHistoryAdded(item: Record<string, unknown>) {
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item as {
      itemId: string;
      role: 'user' | 'assistant';
      content: unknown[];
    };
    
    if (itemId && role) {
      let text = extractMessageText(content);
      
      // For assistant messages, start with empty text - deltas will fill it in sync with audio
      if (role === 'assistant' && !text) {
        text = '';
      } else if (role === 'user' && !text) {
        text = '[Transcribing...]';
      }

      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
      }
    }
  }

  function handleHistoryUpdated(items: Record<string, unknown>[]) {
    items.forEach((item) => {
      if (!item || item.type !== 'message') return;
      const { itemId, role, content = [] } = item as { itemId: string; role?: string; content: unknown[] };
      
      // Skip if this item was interrupted
      if (interruptedItemsRef.current.has(itemId)) return;
      
      // For assistant messages, NEVER update from history - let delta handler control everything
      if (role === 'assistant') return;
      
      const text = extractMessageText(content);
      if (text) {
        updateTranscriptMessage(itemId, text, false);
      }
    });
  }

  // Track pending text buffer (not individual deltas)
  const pendingTextRef = useRef<Map<string, string>>(new Map());
  const displayedTextRef = useRef<Map<string, string>>(new Map());
  
  function handleTranscriptionDelta(item: Record<string, unknown>, audioPositionMs?: number) {
    const itemId = item.item_id as string;
    const deltaText = (item.delta as string) || '';
    if (!itemId || !deltaText) return;
    
    // Skip if this item was interrupted
    if (interruptedItemsRef.current.has(itemId)) return;

    // Accumulate and show text
    const text = (accumulatedTextRef.current.get(itemId) || '') + deltaText;
    accumulatedTextRef.current.set(itemId, text);
    pendingTextRef.current.set(itemId, text);
    displayedTextRef.current.set(itemId, text);
    
    // Track audio duration for barge-in
    if (audioPositionMs !== undefined && audioPositionMs > 0) {
      totalAudioDurationRef.current.set(itemId, audioPositionMs);
    }
    
    updateTranscriptMessage(itemId, text, false);
  }

  function handleTranscriptionCompleted(item: Record<string, unknown>) {
    const itemId = item.item_id as string;
    
    // Skip if this item was interrupted
    if (interruptedItemsRef.current.has(itemId)) return;
    
    if (itemId) {
      // Clear any pending timer and buffers
      const timer = deltaTimerRef.current.get(itemId);
      if (timer) clearTimeout(timer);
      deltaTimerRef.current.delete(itemId);
      pendingDeltasRef.current.delete(itemId);
      pendingTextRef.current.delete(itemId);
      displayedTextRef.current.delete(itemId);
      accumulatedTextRef.current.delete(itemId);
      totalAudioDurationRef.current.delete(itemId);
      
      // Use whatever was displayed, or fall back to server transcript
      const displayedText = displayedTextRef.current.get(itemId);
      const finalText = displayedText || (item.transcript as string) || '';
      if (finalText && finalText !== '\n') {
        updateTranscriptMessage(itemId, finalText, false);
      }
      
      updateTranscriptItem(itemId, { status: 'DONE' });
      const transcriptItem = transcriptItems.find((i) => i.itemId === itemId);

      if (transcriptItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: 'DONE',
            category: 'NONE',
            rationale: '',
          },
        });
      }
    }
  }

  function handleGuardrailTripped(details: Record<string, unknown>, _agent: unknown, guardrail: Record<string, unknown>) {
    const result = guardrail.result as Record<string, unknown>;
    const output = result?.output as Record<string, unknown>;
    const outputInfo = output?.outputInfo as Record<string, unknown>;
    const moderation = extractModeration(outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    const context = details?.context as Record<string, unknown>;
    const history = context?.history as unknown[];
    const lastAssistant = extractLastAssistantMessage(history) as Record<string, unknown> | undefined;

    if (lastAssistant && moderation) {
      const category = (moderation.moderationCategory as string) ?? 'NONE';
      const rationale = (moderation.moderationRationale as string) ?? '';
      const offendingText = moderation.testText as string | undefined;

      updateTranscriptItem(lastAssistant.itemId as string, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  // Keep a ref to latest transcriptItems for use in callbacks
  const transcriptItemsRef = useRef(transcriptItems);
  transcriptItemsRef.current = transcriptItems;

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    isInterrupted: (itemId: string) => interruptedItemsRef.current.has(itemId),
    handleTruncation: (itemId: string, audioEndMs: number, totalAudioMs: number) => {
      // Skip if already interrupted
      if (interruptedItemsRef.current.has(itemId)) return;
      // Clear any pending timer for the interrupted item
      const timer = deltaTimerRef.current.get(itemId);
      if (timer) clearTimeout(timer);
      deltaTimerRef.current.delete(itemId);
      
      // Get the full text that was supposed to be spoken
      const fullText = pendingTextRef.current.get(itemId) || accumulatedTextRef.current.get(itemId) || '';
      
      // Clear refs
      pendingDeltasRef.current.delete(itemId);
      pendingTextRef.current.delete(itemId);
displayedTextRef.current.delete(itemId);
      accumulatedTextRef.current.delete(itemId);
      totalAudioDurationRef.current.delete(itemId);

      // Mark as interrupted so future updates are ignored
      interruptedItemsRef.current.add(itemId);
      
      if (!fullText || totalAudioMs <= 0) {
        // No text or audio data - hide
        updateTranscriptItem(itemId, { isHidden: true, status: 'DONE' });
        return;
      }
      
      // Calculate what fraction of audio was actually played
      const fractionSpoken = Math.min(Math.max(audioEndMs / totalAudioMs, 0), 1);
      
      // Estimate text position based on audio fraction
      const estimatedCharPos = Math.floor(fullText.length * fractionSpoken);
      
      // Find nearest word boundary (don't cut mid-word)
      let truncatePos = estimatedCharPos;
      while (truncatePos > 0 && !/\s/.test(fullText[truncatePos - 1])) {
        truncatePos--;
      }
      
      // If we went to 0, try forward instead
      if (truncatePos === 0 && estimatedCharPos > 0) {
        truncatePos = estimatedCharPos;
        while (truncatePos < fullText.length && !/\s/.test(fullText[truncatePos])) {
          truncatePos++;
        }
      }
      
      const truncatedText = fullText.slice(0, truncatePos).trim();
      
      if (truncatedText.length > 0) {
        updateTranscriptMessage(itemId, truncatedText + '...', false);
        updateTranscriptItem(itemId, { status: 'DONE' });
      } else {
        updateTranscriptItem(itemId, { isHidden: true, status: 'DONE' });
      }
    },
    handleGuardrailTripped,
  });

  return handlersRef;
}
