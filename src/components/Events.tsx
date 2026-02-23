"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent, type LoggedEvent } from "@jchaffin/voicekit";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded, prevEventLogs.length]);

  return (
    <div
      className={
        (isExpanded ? "w-1/2 overflow-auto" : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex-col bg-theme-primary"
      }
      ref={eventLogsContainerRef}
    >
      {isExpanded && (
        <div>
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b border-theme-primary bg-theme-primary rounded-t-xl">
            <span className="font-semibold text-theme-primary">Logs</span>
          </div>
          <div>
            {loggedEvents.map((log, idx) => {
              const arrowInfo = getDirectionArrow(log.direction);
              const isError =
                log.eventName.toLowerCase().includes("error") ||
                (log.eventData?.response as { status_details?: { error?: unknown } })?.status_details?.error != null;

              return (
                <div
                  key={`${log.id}-${idx}`}
                  className="border-t border-theme-primary py-2 px-6 font-mono"
                >
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <span
                        style={{ color: arrowInfo.color }}
                        className="ml-1 mr-2"
                      >
                      {arrowInfo.symbol}
                      </span>
                      <span
                        className={
                          "flex-1 text-sm " +
                          (isError ? "text-red-600" : "text-theme-primary")
                        }
                      >
                        {log.eventName}
                      </span>
                    </div>
                    <div className="text-theme-tertiary ml-1 text-xs whitespace-nowrap">
                      {log.timestamp}
                    </div>
                  </div>

                  {log.expanded && log.eventData && (
                    <div className="text-theme-primary text-left">
                      <pre className="border-l-2 ml-1 border-theme-primary whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                        {JSON.stringify(log.eventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
