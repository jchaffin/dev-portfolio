'use client';

import React, {
  createContext,
  useContext,
  useState,
  FC,
  PropsWithChildren,
  useCallback,
} from 'react';

export interface TranscriptItem {
  itemId: string;
  type: 'MESSAGE' | 'BREADCRUMB';
  role?: 'user' | 'assistant';
  title: string;
  data?: Record<string, unknown>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: 'IN_PROGRESS' | 'DONE';
  isHidden: boolean;
  guardrailResult?: {
    status: 'IN_PROGRESS' | 'DONE';
    category: string;
    rationale: string;
    testText?: string;
  };
}

interface TranscriptContextValue {
  transcriptItems: TranscriptItem[];
  addTranscriptMessage: (
    itemId: string,
    role: 'user' | 'assistant',
    text: string,
    isHidden?: boolean
  ) => void;
  updateTranscriptMessage: (itemId: string, text: string, isDelta: boolean) => void;
  addTranscriptBreadcrumb: (title: string, data?: Record<string, unknown>) => void;
  toggleTranscriptItemExpand: (itemId: string) => void;
  updateTranscriptItem: (itemId: string, updatedProperties: Partial<TranscriptItem>) => void;
  clearTranscript: () => void;
}

const TranscriptContext = createContext<TranscriptContextValue | undefined>(undefined);

function newTimestampPretty(): string {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export const TranscriptProvider: FC<PropsWithChildren> = ({ children }) => {
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);

  const addTranscriptMessage = useCallback(
    (itemId: string, role: 'user' | 'assistant', text = '', isHidden = false) => {
      setTranscriptItems((prev) => {
        if (prev.some((i) => i.itemId === itemId)) return prev;
        return [
          ...prev,
          {
            itemId,
            type: 'MESSAGE',
            role,
            title: text,
            expanded: false,
            timestamp: newTimestampPretty(),
            createdAtMs: Date.now(),
            status: 'IN_PROGRESS',
            isHidden,
          },
        ];
      });
    },
    []
  );

  const updateTranscriptMessage = useCallback(
    (itemId: string, newText: string, append = false) => {
      setTranscriptItems((prev) =>
        prev.map((item) => {
          if (item.itemId === itemId && item.type === 'MESSAGE') {
            return {
              ...item,
              title: append ? (item.title ?? '') + newText : newText,
            };
          }
          return item;
        })
      );
    },
    []
  );

  const addTranscriptBreadcrumb = useCallback(
    (title: string, data?: Record<string, unknown>) => {
      setTranscriptItems((prev) => [
        ...prev,
        {
          itemId: `breadcrumb-${generateId()}`,
          type: 'BREADCRUMB',
          title,
          data,
          expanded: false,
          timestamp: newTimestampPretty(),
          createdAtMs: Date.now(),
          status: 'DONE',
          isHidden: false,
        },
      ]);
    },
    []
  );

  const toggleTranscriptItemExpand = useCallback((itemId: string) => {
    setTranscriptItems((prev) =>
      prev.map((log) =>
        log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  }, []);

  const updateTranscriptItem = useCallback(
    (itemId: string, updatedProperties: Partial<TranscriptItem>) => {
      setTranscriptItems((prev) =>
        prev.map((item) =>
          item.itemId === itemId ? { ...item, ...updatedProperties } : item
        )
      );
    },
    []
  );

  const clearTranscript = useCallback(() => {
    setTranscriptItems([]);
  }, []);

  return (
    <TranscriptContext.Provider
      value={{
        transcriptItems,
        addTranscriptMessage,
        updateTranscriptMessage,
        addTranscriptBreadcrumb,
        toggleTranscriptItemExpand,
        updateTranscriptItem,
        clearTranscript,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
};

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (!context) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
}
