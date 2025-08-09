"use client";

import React, { createContext, useContext, useState, FC, PropsWithChildren } from "react";
import { LoggedEvent } from "@/types";

interface EventData {
  [key: string]: unknown;
  event_id?: string | number;
}

interface HistoryItem {
  type: string;
  role: string;
  content: unknown[];
  status?: string;
  name?: string;
}

type EventContextValue = {
  loggedEvents: LoggedEvent[];
  logClientEvent: (_eventObj: EventData, _eventNameSuffix?: string) => void;
  logServerEvent: (_eventObj: EventData, _eventNameSuffix?: string) => void;
  logHistoryItem: (_item: HistoryItem) => void;
  toggleExpand: (_id: number | string) => void;
};

const EventContext = createContext<EventContextValue | undefined>(undefined);

export const EventProvider: FC<PropsWithChildren> = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);

  function addLoggedEvent(direction: "client" | "server", eventName: string, eventData: EventData) {
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
  }

  const logClientEvent: EventContextValue["logClientEvent"] = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("client", name, eventObj);
  };

  const logServerEvent: EventContextValue["logServerEvent"] = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("server", name, eventObj);
  };

  const logHistoryItem: EventContextValue['logHistoryItem'] = (item) => {
    let eventName = item.type;
    if (item.type === 'message') {
      eventName = `${item.role}.${item.status || 'unknown'}`;
    }
    if (item.type === 'function_call') {
      eventName = `function.${item.name || 'unknown'}.${item.status || 'unknown'}`;
    }
    addLoggedEvent('server', eventName, item as unknown as EventData);
  };

  const toggleExpand: EventContextValue['toggleExpand'] = (id) => {
    setLoggedEvents((prev) =>
      prev.map((log) => {
        if (log.id === id) {
          return { ...log, expanded: !log.expanded };
        }
        return log;
      })
    );
  };


  return (
    <EventContext.Provider
      value={{ loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}