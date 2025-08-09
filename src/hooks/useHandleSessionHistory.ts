"use client";

import { useRef, useCallback } from "react";
import { useTranscript } from "@/contexts/TranscriptContext";
import { useEvent } from "@/contexts/EventContext";

interface ContentItem {
  type: string;
  name?: string;
  role?: string;
  content?: unknown[];
  text?: string;
  transcript?: string;
}

interface HistoryItem {
  type: string;
  role: string;
  content: unknown[];
  itemId?: string;
}

interface FunctionCall {
  type: string;
  name: string;
  arguments: unknown;
}

interface ToolResult {
  [key: string]: unknown;
}

interface TranscriptionItem {
  type: string;
  role: string;
  content: unknown[];
  itemId?: string;
  item_id?: string;
  delta?: string;
  transcript?: string;
}

interface GuardrailDetails {
  [key: string]: unknown;
  context?: {
    history?: HistoryItem[];
  };
}

export function useHandleSessionHistory() {
  const {
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
  } = useTranscript();

  const { } = useEvent();

  /* ----------------------- helpers ------------------------- */

  const extractMessageText = (content: ContentItem[] = []): string => {
    if (!Array.isArray(content)) return "";

    return content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio") return c.transcript ?? "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  };

  const extractFunctionCallByName = (name: string, content: ContentItem[] = []): FunctionCall | undefined => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c) => c.type === 'function_call' && c.name === name) as FunctionCall | undefined;
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

  const extractModerationRef = useRef((obj: Record<string, unknown>): Record<string, unknown> | undefined => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModerationRef.current(obj.outputInfo as Record<string, unknown>);
    if ('output' in obj) return extractModerationRef.current(obj.output as Record<string, unknown>);
    if ('result' in obj) return extractModerationRef.current(obj.result as Record<string, unknown>);
    return undefined;
  });

  const extractModeration = extractModerationRef.current;

  // Temporary helper until the guardrail_tripped event includes the itemId in the next version of the SDK
  const sketchilyDetectGuardrailMessage = (text: string) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  /* ----------------------- event handlers ------------------------- */

  function handleAgentToolStart(details: GuardrailDetails, _agent: unknown, functionCall: FunctionCall) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history as ContentItem[]);
    const function_name = lastFunctionCall?.name;
    const function_args = lastFunctionCall?.arguments;

    addTranscriptBreadcrumb(
      `function call: ${function_name}`,
      function_args as Record<string, unknown>
    );    
  }
  function handleAgentToolEnd(details: GuardrailDetails, _agent: unknown, _functionCall: FunctionCall, result: ToolResult) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history as ContentItem[]);
    addTranscriptBreadcrumb(
      `function call result: ${lastFunctionCall?.name}`,
      maybeParseJson(result) as Record<string, unknown>
    );
  }

  const handleHistoryAdded = useCallback((item: HistoryItem) => {
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content as ContentItem[]);

      if (isUser && !text) {
        text = "[Transcribing...]";
      }

      // If the guardrail has been tripped, this message is a message that gets sent to the 
      // assistant to correct it, so we add it as a breadcrumb instead of a message.
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role as "user" | "assistant", text);
      }
    }
  }, [addTranscriptBreadcrumb, addTranscriptMessage]);

  const handleHistoryUpdated = useCallback((items: HistoryItem[]) => {
    items.forEach((item: HistoryItem) => {
      if (!item || item.type !== 'message') return;

      const { itemId, role, content = [] } = item;
      if (itemId && role) {
        const isUser = role === "user";
        let text = extractMessageText(content as ContentItem[]);

        if (isUser && !text) {
          text = "[Transcribing...]";
        }

        updateTranscriptMessage(itemId, text, false);
      }
    });
  }, [updateTranscriptMessage]);

  function handleTranscriptionDelta(item: TranscriptionItem) {
    const itemId = item.item_id || item.itemId;
    const deltaText = item.delta || "";
    if (itemId && deltaText) {
      updateTranscriptMessage(itemId, deltaText, true);
    }
  }

  function handleTranscriptionCompleted(item: TranscriptionItem) {
    // History updates don't reliably end in a completed item, 
    // so we need to handle finishing up when the transcription is completed.
    const itemId = item.item_id || item.itemId;
    const transcriptText = item.transcript || "";
    if (itemId && transcriptText) {
      updateTranscriptMessage(itemId, transcriptText, false);
    }
  }

  const handleGuardrailTripped = useCallback((details: GuardrailDetails, _agent: unknown, guardrail: unknown) => {
    const moderation = extractModeration(guardrail as Record<string, unknown>);
    if (moderation) {
      addTranscriptBreadcrumb('Output Guardrail Active', moderation);
    }
  }, [addTranscriptBreadcrumb, extractModeration]);

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
  });

  return handlersRef;
}