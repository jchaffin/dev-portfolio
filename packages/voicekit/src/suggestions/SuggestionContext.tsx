'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  SuggestionGroup,
  SuggestionItem,
  SuggestionsContextValue,
  SuggestionEventDetail,
} from './types';
import { SUGGESTION_EVENT } from './types';

const SuggestionCtx = createContext<SuggestionsContextValue | null>(null);

interface SuggestionProviderProps {
  children: React.ReactNode;
  /**
   * Called when the user clicks a suggestion.
   * Typically wired to `sendMessage(item.message)` on the voice session.
   */
  onSelect?: (item: SuggestionItem) => void;
  /** If true, auto-clear suggestions on select (default: true) */
  autoClear?: boolean;
}

export function SuggestionProvider({
  children,
  onSelect,
  autoClear = true,
}: SuggestionProviderProps) {
  const [suggestions, setSuggestionsState] = useState<SuggestionGroup | null>(null);

  const setSuggestions = useCallback((group: SuggestionGroup | null) => {
    setSuggestionsState(group);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestionsState(null);
  }, []);

  const selectSuggestion = useCallback(
    (item: SuggestionItem) => {
      onSelect?.(item);
      if (autoClear) setSuggestionsState(null);
    },
    [onSelect, autoClear]
  );

  // Listen for DOM events so tools can push suggestions without React imports
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SuggestionEventDetail>).detail;
      if (detail) {
        setSuggestionsState(detail.group ?? null);
      }
    };

    window.addEventListener(SUGGESTION_EVENT, handler);
    return () => window.removeEventListener(SUGGESTION_EVENT, handler);
  }, []);

  const value: SuggestionsContextValue = {
    suggestions,
    setSuggestions,
    selectSuggestion,
    clearSuggestions,
  };

  return (
    <SuggestionCtx.Provider value={value}>
      {children}
    </SuggestionCtx.Provider>
  );
}

/**
 * Access the suggestion system from any component inside a SuggestionProvider.
 */
export function useSuggestions(): SuggestionsContextValue {
  const ctx = useContext(SuggestionCtx);
  if (!ctx) {
    throw new Error('useSuggestions must be used within a SuggestionProvider');
  }
  return ctx;
}
