'use client';

import { useRef } from 'react';
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

  const transcriptItemsRef = useRef(transcriptItems);
  transcriptItemsRef.current = transcriptItems;

  const { logServerEvent } = useEvent();

  // The transcription ground truth: text confirmed by the STT/transcript
  // delta stream. On barge-in, this is exactly what was spoken — no guessing.
  const accumulatedTextRef = useRef<Map<string, string>>(new Map());

  const pendingDeltasRef = useRef<Map<string, string[]>>(new Map());
  const deltaTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const interruptedItemsRef = useRef<Set<string>>(new Set());

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
      // The transcript-delta path owns this item — don't let history overwrite it.
      if (accumulatedTextRef.current.has(itemId)) return;

      let text = extractMessageText(content);
      
      if (role === 'assistant' && !text) {
        text = '';
      } else if (role === 'user' && !text) {
        return;
      }

      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        try {
          const failureDetails = JSON.parse(guardrailMessage);
          addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
        } catch {
          addTranscriptBreadcrumb('Output Guardrail Active', { raw: guardrailMessage });
        }
      } else {
        addTranscriptMessage(itemId, role, text);
      }
    }
  }

  function handleHistoryUpdated(items: Record<string, unknown>[]) {
    items.forEach((item) => {
      if (!item || item.type !== 'message') return;
      const { itemId, role, content = [] } = item as { itemId: string; role?: string; content: unknown[] };
      
      if (interruptedItemsRef.current.has(itemId)) return;
      if (role !== 'user') return;
      // The transcript-delta path owns this item while it's accumulating.
      if (accumulatedTextRef.current.has(itemId)) return;
      
      const text = extractMessageText(content);
      if (text) {
        updateTranscriptMessage(itemId, text, false, 'user');
      }
    });
  }

  function handleTranscriptionDelta(item: Record<string, unknown>) {
    const itemId = item.item_id as string;
    const role = (item.role as 'user' | 'assistant') || 'user';
    const deltaText = (item.delta as string) || '';
    if (!itemId || !deltaText) return;
    
    if (interruptedItemsRef.current.has(itemId)) return;

    const text = (accumulatedTextRef.current.get(itemId) || '') + deltaText;
    accumulatedTextRef.current.set(itemId, text);

    if (text.replace(/[\s.…]+/g, '').length === 0) return;
    updateTranscriptMessage(itemId, text, false, role);
  }

  function handleTranscriptionCompleted(item: Record<string, unknown>) {
    const itemId = item.item_id as string;
    const role = (item.role as 'user' | 'assistant') || 'user';
    
    if (interruptedItemsRef.current.has(itemId)) return;
    
    if (itemId) {
      const accumulatedText = accumulatedTextRef.current.get(itemId);

      const timer = deltaTimerRef.current.get(itemId);
      if (timer) clearTimeout(timer);
      deltaTimerRef.current.delete(itemId);
      pendingDeltasRef.current.delete(itemId);
      accumulatedTextRef.current.delete(itemId);

      const finalText = accumulatedText || (item.transcript as string) || '';
      const stripped = finalText.replace(/[\s.…]+/g, '');

      if (stripped.length > 0) {
        // Suppress single-word or near-empty transcripts from echo / ambient noise.
        // Real utterances have at least 2 meaningful words.
        const wordCount = finalText.trim()
          .split(/\s+/)
          .filter(w => /[a-zA-Z0-9]/.test(w)).length;

        if (role === 'user' && wordCount < 2) {
          updateTranscriptItem(itemId, { isHidden: true, status: 'DONE' });
          return;
        }

        updateTranscriptMessage(itemId, finalText, false, role);
      }
      
      updateTranscriptItem(itemId, { status: 'DONE' });
      const transcriptItem = transcriptItemsRef.current.find((i) => i.itemId === itemId);

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
      const assistantItemId = (lastAssistant.itemId ?? (lastAssistant as Record<string, unknown>).id) as string;

      updateTranscriptItem(assistantItemId, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    isInterrupted: (itemId: string) => interruptedItemsRef.current.has(itemId),

    /**
     * Handle barge-in. The accumulated transcript deltas are the ground truth
     * of what was spoken — they arrive in sync with audio from the STT stream.
     * Whatever is in accumulatedTextRef at this moment = what the user heard.
     * Whatever isn't = never spoken. No audio-fraction guessing needed.
     *
     * The server (OpenAI, etc.) already truncates its own conversation history
     * at the audio level. We just need our local display to match.
     */
    handleTruncation: (itemId: string): { spokenText: string; fullText: string } | null => {
      if (interruptedItemsRef.current.has(itemId)) return null;

      const timer = deltaTimerRef.current.get(itemId);
      if (timer) clearTimeout(timer);
      deltaTimerRef.current.delete(itemId);

      // Ground truth: text confirmed by the transcription stream
      const spokenText = (accumulatedTextRef.current.get(itemId) || '').trim();

      // We don't know the "full intended text" since it was still streaming,
      // but spokenText is what matters — it's what was actually transcribed.
      const fullText = spokenText;

      pendingDeltasRef.current.delete(itemId);
      accumulatedTextRef.current.delete(itemId);
      interruptedItemsRef.current.add(itemId);

      if (spokenText.length > 0) {
        updateTranscriptMessage(itemId, spokenText + '...', false, 'user');
        updateTranscriptItem(itemId, { status: 'DONE' });
      } else {
        updateTranscriptItem(itemId, { isHidden: true, status: 'DONE' });
      }

      return { spokenText, fullText };
    },
    handleGuardrailTripped,
  });

  return handlersRef;
}
