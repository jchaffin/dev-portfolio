'use client';

import React, { createContext, useContext, useState, FC, PropsWithChildren, useCallback } from 'react';

export interface LoggedEvent {
  id: number | string;
  direction: 'client' | 'server';
  eventName: string;
  eventData: Record<string, unknown>;
  timestamp: string;
  expanded: boolean;
}

interface EventData {
  [key: string]: unknown;
  event_id?: string | number;
  type?: string;
}

interface HistoryItem {
  type: string;
  role: string;
  content: unknown[];
  status?: string;
  name?: string;
}

interface EventContextValue {
  loggedEvents: LoggedEvent[];
  logClientEvent: (eventObj: EventData, eventNameSuffix?: string) => void;
  logServerEvent: (eventObj: EventData, eventNameSuffix?: string) => void;
  logHistoryItem: (item: HistoryItem) => void;
  toggleExpand: (id: number | string) => void;
  clearEvents: () => void;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export const EventProvider: FC<PropsWithChildren> = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);

  const addLoggedEvent = useCallback(
    (direction: 'client' | 'server', eventName: string, eventData: EventData) => {
      const id = typeof eventData.event_id === 'number' ? eventData.event_id : Date.now();
      setLoggedEvents((prev) => [
        ...prev,
        {
          id,
          direction,
          eventName,
          eventData,
          timestamp: new Date().toLocaleTimeString(),
          expanded: false,
        },
      ]);
    },
    []
  );

  const logClientEvent = useCallback(
    (eventObj: EventData, eventNameSuffix = '') => {
      const name = `${eventObj.type || ''} ${eventNameSuffix || ''}`.trim();
      addLoggedEvent('client', name, eventObj);
    },
    [addLoggedEvent]
  );

  const logServerEvent = useCallback(
    (eventObj: EventData, eventNameSuffix = '') => {
      const name = `${eventObj.type || ''} ${eventNameSuffix || ''}`.trim();
      addLoggedEvent('server', name, eventObj);
    },
    [addLoggedEvent]
  );

  const logHistoryItem = useCallback(
    (item: HistoryItem) => {
      let eventName = item.type;
      if (item.type === 'message') {
        eventName = `${item.role}.${item.status || 'unknown'}`;
      }
      if (item.type === 'function_call') {
        eventName = `function.${item.name || 'unknown'}.${item.status || 'unknown'}`;
      }
      addLoggedEvent('server', eventName, item as unknown as EventData);
    },
    [addLoggedEvent]
  );

  const toggleExpand = useCallback((id: number | string) => {
    setLoggedEvents((prev) =>
      prev.map((log) => (log.id === id ? { ...log, expanded: !log.expanded } : log))
    );
  }, []);

  const clearEvents = useCallback(() => {
    setLoggedEvents([]);
  }, []);

  return (
    <EventContext.Provider
      value={{ loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand, clearEvents }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
