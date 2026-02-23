'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { TOOL_RESULT_EVENT } from '../tools';

interface ToolResult<T = unknown> {
  name: string;
  input: unknown;
  result: T;
  timestamp: number;
}

// ============================================================================
// useToolResults - Listen to all tool executions
// ============================================================================

/**
 * Hook to listen for all tool results
 * 
 * @example
 * ```tsx
 * function ToolDebugger() {
 *   const { results, lastResult } = useToolResults();
 *   
 *   return (
 *     <div>
 *       <h3>Last Tool: {lastResult?.name}</h3>
 *       <pre>{JSON.stringify(lastResult?.result, null, 2)}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useToolResults() {
  const [results, setResults] = useState<ToolResult[]>([]);

  useEffect(() => {
    const handler = (event: CustomEvent<ToolResult>) => {
      setResults(prev => [...prev, event.detail]);
    };

    window.addEventListener(TOOL_RESULT_EVENT, handler as EventListener);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, handler as EventListener);
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return {
    results,
    lastResult: results[results.length - 1] || null,
    clear,
  };
}

// ============================================================================
// useToolListener - Listen to specific tools
// ============================================================================

type ToolHandler<T = unknown> = (input: unknown, result: T) => void;

/**
 * Hook to register handlers for specific tools
 * 
 * @example
 * ```tsx
 * function ProjectDisplay() {
 *   const [projects, setProjects] = useState([]);
 *   
 *   useToolListener('get_projects', (input, result) => {
 *     if (result.success) {
 *       setProjects(result.projects);
 *     }
 *   });
 *   
 *   return <ProjectList projects={projects} />;
 * }
 * ```
 */
export function useToolListener<T = unknown>(
  toolName: string,
  handler: ToolHandler<T>
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventHandler = (event: CustomEvent<ToolResult<T>>) => {
      if (event.detail.name === toolName) {
        handlerRef.current(event.detail.input, event.detail.result);
      }
    };

    window.addEventListener(TOOL_RESULT_EVENT, eventHandler as EventListener);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, eventHandler as EventListener);
  }, [toolName]);
}

// ============================================================================
// useToolResult - Get latest result from a specific tool
// ============================================================================

/**
 * Hook to get the latest result from a specific tool
 * 
 * @example
 * ```tsx
 * function ContactModal() {
 *   const { result, input, clear } = useToolResult('open_contact');
 *   
 *   if (!result) return null;
 *   
 *   return (
 *     <Modal onClose={clear}>
 *       <ContactForm prefill={input} />
 *     </Modal>
 *   );
 * }
 * ```
 */
export function useToolResult<T = unknown>(toolName: string) {
  const [state, setState] = useState<{ input: unknown; result: T } | null>(null);

  useEffect(() => {
    const handler = (event: CustomEvent<ToolResult<T>>) => {
      if (event.detail.name === toolName) {
        setState({ input: event.detail.input, result: event.detail.result });
      }
    };

    window.addEventListener(TOOL_RESULT_EVENT, handler as EventListener);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, handler as EventListener);
  }, [toolName]);

  const clear = useCallback(() => setState(null), []);

  return {
    input: state?.input ?? null,
    result: state?.result ?? null,
    hasResult: state !== null,
    clear,
  };
}

// ============================================================================
// useVoiceStatus - Convenience hook for connection status
// ============================================================================

export { useVoice } from '../VoiceProvider';
