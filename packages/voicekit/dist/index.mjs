import {
  TOOL_RESULT_EVENT,
  createAPITool,
  createEventTool,
  createNavigationTool,
  createRAGTool,
  createSearchTool,
  defineTool
} from "./chunk-T3II3DRG.mjs";
import {
  EventEmitter
} from "./chunk-22WLZIXO.mjs";

// src/VoiceProvider.tsx
import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect
} from "react";
import { jsx } from "react/jsx-runtime";
var VoiceContext = createContext(null);
function VoiceProvider({
  children,
  adapter,
  agent,
  sessionEndpoint = "/api/session",
  model,
  language = "en",
  onStatusChange,
  onTranscriptUpdate,
  onToolCall,
  onError
}) {
  const [status, setStatus] = useState("DISCONNECTED");
  const [transcript, setTranscript] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const sessionRef = useRef(null);
  const audioRef = useRef(null);
  const statusRef = useRef("DISCONNECTED");
  const currentMsgIdRef = useRef(null);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;
    return () => {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {
      }
    };
  }, []);
  const updateStatus = useCallback((newStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);
  const addMessage = useCallback((role, text, id) => {
    const message = {
      id: id || crypto.randomUUID(),
      role,
      text,
      timestamp: /* @__PURE__ */ new Date(),
      status: "pending"
    };
    setTranscript((prev) => {
      const updated = [...prev, message];
      onTranscriptUpdate?.(updated);
      return updated;
    });
    return message.id;
  }, [onTranscriptUpdate]);
  const updateMessage = useCallback((id, text, append = false) => {
    setTranscript((prev) => {
      const updated = prev.map(
        (m) => m.id === id ? { ...m, text: append ? m.text + text : text } : m
      );
      onTranscriptUpdate?.(updated);
      return updated;
    });
  }, [onTranscriptUpdate]);
  const completeMessage = useCallback((id) => {
    setTranscript((prev) => {
      const updated = prev.map(
        (m) => m.id === id ? { ...m, status: "complete" } : m
      );
      onTranscriptUpdate?.(updated);
      return updated;
    });
  }, [onTranscriptUpdate]);
  const wireSessionEvents = useCallback((session) => {
    session.on("user_transcript", (data) => {
      if (data.isFinal) {
        addMessage("user", data.text || data.delta || "");
      }
    });
    session.on("assistant_transcript", (data) => {
      if (data.isFinal) {
        if (currentMsgIdRef.current) {
          completeMessage(currentMsgIdRef.current);
          currentMsgIdRef.current = null;
        }
      } else if (data.delta) {
        if (!currentMsgIdRef.current) {
          currentMsgIdRef.current = addMessage("assistant", data.delta);
        } else {
          updateMessage(currentMsgIdRef.current, data.delta, true);
        }
      }
    });
    session.on("tool_call_end", (name, input, output) => {
      onToolCall?.(name, input, output);
    });
    session.on("error", (error) => {
      console.error("VoiceKit session error:", error);
      onError?.(error);
    });
  }, [addMessage, updateMessage, completeMessage, onToolCall, onError]);
  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(sessionEndpoint, { method: "POST" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ephemeralKey || data.token || null;
    } catch {
      return null;
    }
  }, [sessionEndpoint]);
  const connect = useCallback(async () => {
    if (statusRef.current !== "DISCONNECTED") return;
    if (!audioRef.current) return;
    updateStatus("CONNECTING");
    try {
      const token = await fetchToken();
      if (!token) {
        onError?.(new Error("Failed to get session key"));
        updateStatus("DISCONNECTED");
        return;
      }
      const session = adapter.createSession(agent, { model, language });
      sessionRef.current = session;
      wireSessionEvents(session);
      await session.connect({
        authToken: token,
        audioElement: audioRef.current
      });
      updateStatus("CONNECTED");
      setTimeout(() => {
        session.sendRawEvent?.({ type: "response.create" });
      }, 500);
    } catch (error) {
      console.error("VoiceKit connection failed:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      updateStatus("DISCONNECTED");
    }
  }, [adapter, agent, model, language, fetchToken, wireSessionEvents, updateStatus, onError]);
  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.disconnect();
      } catch {
      }
      sessionRef.current = null;
    }
    currentMsgIdRef.current = null;
    updateStatus("DISCONNECTED");
  }, [updateStatus]);
  const sendMessage = useCallback((text) => {
    if (!sessionRef.current || statusRef.current !== "CONNECTED") return;
    sessionRef.current.interrupt();
    sessionRef.current.sendMessage(text);
  }, []);
  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);
  const mute = useCallback((muted) => {
    setIsMuted(muted);
    sessionRef.current?.mute(muted);
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, []);
  const clearTranscript = useCallback(() => {
    setTranscript([]);
    onTranscriptUpdate?.([]);
  }, [onTranscriptUpdate]);
  useEffect(() => {
    return () => {
      try {
        sessionRef.current?.disconnect();
      } catch {
      }
    };
  }, []);
  const value = {
    status,
    connect,
    disconnect,
    transcript,
    clearTranscript,
    sendMessage,
    interrupt,
    mute,
    isMuted,
    agent
  };
  return /* @__PURE__ */ jsx(VoiceContext.Provider, { value, children });
}
function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}

// src/components/VoiceChat.tsx
import { useRef as useRef2, useEffect as useEffect2 } from "react";
import { Fragment, jsx as jsx2, jsxs } from "react/jsx-runtime";
function Message({ message, userClassName, assistantClassName }) {
  const isUser = message.role === "user";
  return /* @__PURE__ */ jsx2("div", { className: `flex ${isUser ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsx2(
    "div",
    {
      className: `max-w-[80%] rounded-2xl px-4 py-2 ${isUser ? userClassName || "bg-blue-500 text-white rounded-br-md" : assistantClassName || "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"}`,
      children: /* @__PURE__ */ jsx2("p", { className: "text-sm whitespace-pre-wrap", children: message.text })
    }
  ) });
}
function Transcript({
  messages,
  userClassName,
  assistantClassName,
  emptyMessage = "Start a conversation..."
}) {
  const containerRef = useRef2(null);
  const userScrolledUp = useRef2(false);
  useEffect2(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      userScrolledUp.current = !isAtBottom;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect2(() => {
    if (containerRef.current && messages.length > 0 && !userScrolledUp.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);
  if (messages.length === 0) {
    return /* @__PURE__ */ jsx2("div", { className: "flex items-center justify-center h-full text-gray-500", children: emptyMessage });
  }
  return /* @__PURE__ */ jsx2("div", { ref: containerRef, className: "flex flex-col gap-3 overflow-y-auto h-full p-4", children: messages.map((msg) => /* @__PURE__ */ jsx2(
    Message,
    {
      message: msg,
      userClassName,
      assistantClassName
    },
    msg.id
  )) });
}
function StatusIndicator({
  className = "",
  connectedText = "Connected",
  connectingText = "Connecting...",
  disconnectedText = "Disconnected"
}) {
  const { status } = useVoice();
  const statusConfig = {
    CONNECTED: { color: "bg-green-500", text: connectedText, pulse: true },
    CONNECTING: { color: "bg-yellow-500", text: connectingText, pulse: true },
    DISCONNECTED: { color: "bg-gray-400", text: disconnectedText, pulse: false }
  };
  const config = statusConfig[status];
  return /* @__PURE__ */ jsxs("div", { className: `flex items-center gap-2 ${className}`, children: [
    /* @__PURE__ */ jsx2("div", { className: `w-2 h-2 rounded-full ${config.color} ${config.pulse ? "animate-pulse" : ""}` }),
    /* @__PURE__ */ jsx2("span", { className: "text-sm", children: config.text })
  ] });
}
function ConnectButton({
  className = "",
  connectText = "Start",
  disconnectText = "End",
  connectingText = "Connecting...",
  children
}) {
  const { status, connect, disconnect } = useVoice();
  const handleClick = () => {
    if (status === "CONNECTED") {
      disconnect();
    } else if (status === "DISCONNECTED") {
      connect();
    }
  };
  const text = status === "CONNECTED" ? disconnectText : status === "CONNECTING" ? connectingText : connectText;
  return /* @__PURE__ */ jsx2(
    "button",
    {
      onClick: handleClick,
      disabled: status === "CONNECTING",
      className: className || `px-4 py-2 rounded-lg font-medium transition-colors ${status === "CONNECTED" ? "bg-red-500 hover:bg-red-600 text-white" : status === "CONNECTING" ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"}`,
      children: children || text
    }
  );
}
function ChatInput({
  placeholder = "Type a message...",
  className = "",
  buttonText = "Send",
  onSend
}) {
  const { sendMessage, status } = useVoice();
  const inputRef = useRef2(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;
    if (onSend) {
      onSend(text);
    } else {
      sendMessage(text);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };
  const disabled = status !== "CONNECTED";
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: `flex gap-2 ${className}`, children: [
    /* @__PURE__ */ jsx2(
      "input",
      {
        ref: inputRef,
        type: "text",
        placeholder,
        disabled,
        className: "flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 \n                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100\n                   focus:outline-none focus:ring-2 focus:ring-blue-500\n                   disabled:opacity-50 disabled:cursor-not-allowed"
      }
    ),
    /* @__PURE__ */ jsx2(
      "button",
      {
        type: "submit",
        disabled,
        className: "px-4 py-2 bg-blue-500 text-white rounded-lg font-medium\n                   hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed",
        children: buttonText
      }
    )
  ] });
}
function VoiceChat({
  className = "",
  height = "400px",
  showHeader = true,
  showInput = true,
  emptyState,
  header,
  footer
}) {
  const { status, transcript, connect, disconnect, clearTranscript } = useVoice();
  const defaultEmptyState = /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center gap-4", children: [
    /* @__PURE__ */ jsx2(ConnectButton, {}),
    /* @__PURE__ */ jsx2("p", { className: "text-sm text-gray-500", children: status === "CONNECTING" ? "Connecting..." : "Click to start a conversation" })
  ] });
  return /* @__PURE__ */ jsxs("div", { className: `flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 
                     bg-white dark:bg-gray-900 overflow-hidden ${className}`, children: [
    showHeader && /* @__PURE__ */ jsx2("div", { className: "flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700", children: header || /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx2(StatusIndicator, {}),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        transcript.length > 0 && /* @__PURE__ */ jsx2(
          "button",
          {
            onClick: clearTranscript,
            className: "text-sm text-gray-500 hover:text-gray-700",
            children: "Clear"
          }
        ),
        /* @__PURE__ */ jsx2(
          "button",
          {
            onClick: status === "CONNECTED" ? disconnect : connect,
            className: `text-sm font-medium ${status === "CONNECTED" ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}`,
            children: status === "CONNECTED" ? "End" : "Connect"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsx2("div", { style: { height }, className: "overflow-hidden", children: /* @__PURE__ */ jsx2(
      Transcript,
      {
        messages: transcript,
        emptyMessage: emptyState || defaultEmptyState
      }
    ) }),
    footer || showInput && status === "CONNECTED" && /* @__PURE__ */ jsx2("div", { className: "p-4 border-t border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsx2(ChatInput, {}) })
  ] });
}

// src/createAgent.ts
function createAgent(config) {
  const { name, instructions, tools = [], voice } = config;
  const fullInstructions = `
${instructions}

# Response Guidelines
- Keep responses concise (2-3 sentences max)
- Answer questions directly before asking follow-ups
- Use tools silently without announcing them
- Speak naturally and conversationally
`.trim();
  return {
    name,
    instructions: fullInstructions,
    tools,
    voice
  };
}
function createAgentFromTemplate(config) {
  const {
    name,
    role,
    personality = "Professional and helpful",
    capabilities = [],
    constraints = [],
    tools = [],
    context = {}
  } = config;
  const capabilitiesSection = capabilities.length > 0 ? `## What You Can Do
${capabilities.map((c) => `- ${c}`).join("\n")}` : "";
  const constraintsSection = constraints.length > 0 ? `## Constraints
${constraints.map((c) => `- ${c}`).join("\n")}` : "";
  const contextSection = Object.keys(context).length > 0 ? `## Context
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`` : "";
  const instructions = `
You are ${name}, ${role}.

## Personality
${personality}

${capabilitiesSection}

${constraintsSection}

${contextSection}
`.trim();
  return createAgent({
    name,
    instructions,
    tools
  });
}

// src/hooks/toolHooks.ts
import { useEffect as useEffect3, useCallback as useCallback2, useState as useState2, useRef as useRef3 } from "react";
function useToolResults() {
  const [results, setResults] = useState2([]);
  useEffect3(() => {
    const handler = (event) => {
      setResults((prev) => [...prev, event.detail]);
    };
    window.addEventListener(TOOL_RESULT_EVENT, handler);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, handler);
  }, []);
  const clear = useCallback2(() => setResults([]), []);
  return {
    results,
    lastResult: results[results.length - 1] || null,
    clear
  };
}
function useToolListener(toolName, handler) {
  const handlerRef = useRef3(handler);
  handlerRef.current = handler;
  useEffect3(() => {
    const eventHandler = (event) => {
      if (event.detail.name === toolName) {
        handlerRef.current(event.detail.input, event.detail.result);
      }
    };
    window.addEventListener(TOOL_RESULT_EVENT, eventHandler);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, eventHandler);
  }, [toolName]);
}
function useToolResult(toolName) {
  const [state, setState] = useState2(null);
  useEffect3(() => {
    const handler = (event) => {
      if (event.detail.name === toolName) {
        setState({ input: event.detail.input, result: event.detail.result });
      }
    };
    window.addEventListener(TOOL_RESULT_EVENT, handler);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, handler);
  }, [toolName]);
  const clear = useCallback2(() => setState(null), []);
  return {
    input: state?.input ?? null,
    result: state?.result ?? null,
    hasResult: state !== null,
    clear
  };
}

// src/hooks/useAudioRecorder.ts
import { useRef as useRef4, useCallback as useCallback3 } from "react";

// src/utils/audio.ts
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
  }
}
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return buffer;
}
async function convertWebMToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const combined = new Float32Array(length);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      combined[i] += channelData[i];
    }
  }
  for (let i = 0; i < length; i++) {
    combined[i] /= numChannels;
  }
  const wavBuffer = encodeWAV(combined, audioBuffer.sampleRate);
  return new Blob([wavBuffer], { type: "audio/wav" });
}
function audioFormatForCodec(codec) {
  switch (codec.toLowerCase()) {
    case "opus":
    case "pcm":
      return "pcm16";
    case "g711":
      return "g711_ulaw";
    default:
      return "pcm16";
  }
}
function applyCodecPreferences(pc, codec) {
  if (codec === "g711") {
    pc.getTransceivers().forEach((transceiver) => {
      if (transceiver.sender.track?.kind === "audio") {
        transceiver.setCodecPreferences([
          { mimeType: "audio/PCMU", clockRate: 8e3 },
          { mimeType: "audio/PCMA", clockRate: 8e3 }
        ]);
      }
    });
  }
  return pc;
}

// src/hooks/useAudioRecorder.ts
function useAudioRecorder() {
  const mediaRecorderRef = useRef4(null);
  const recordedChunksRef = useRef4([]);
  const startRecording = useCallback3(async (stream) => {
    if (mediaRecorderRef.current?.state === "recording") {
      return;
    }
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, []);
  const stopRecording = useCallback3(() => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
      }
      try {
        mediaRecorderRef.current.stop();
      } catch {
      }
      mediaRecorderRef.current = null;
    }
  }, []);
  const downloadRecording = useCallback3(async (filename) => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (recordedChunksRef.current.length === 0) {
      return null;
    }
    const webmBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    try {
      const wavBlob = await convertWebMToWav(webmBlob);
      const url = URL.createObjectURL(wavBlob);
      const now = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const name = filename || `voice_recording_${now}.wav`;
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return wavBlob;
    } catch (error) {
      console.error("Failed to convert recording:", error);
      throw error;
    }
  }, []);
  const getRecordingBlob = useCallback3(async () => {
    if (recordedChunksRef.current.length === 0) {
      return null;
    }
    const webmBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    return convertWebMToWav(webmBlob);
  }, []);
  const clearRecording = useCallback3(() => {
    recordedChunksRef.current = [];
  }, []);
  return {
    startRecording,
    stopRecording,
    downloadRecording,
    getRecordingBlob,
    clearRecording,
    isRecording: () => mediaRecorderRef.current?.state === "recording"
  };
}

// src/hooks/useRealtimeSession.ts
import { useCallback as useCallback6, useRef as useRef6, useState as useState5, useEffect as useEffect5 } from "react";

// src/contexts/EventContext.tsx
import { createContext as createContext2, useContext as useContext2, useState as useState3, useCallback as useCallback4 } from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var EventContext = createContext2(void 0);
var EventProvider = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState3([]);
  const addLoggedEvent = useCallback4(
    (direction, eventName, eventData) => {
      const id = typeof eventData.event_id === "number" ? eventData.event_id : Date.now();
      setLoggedEvents((prev) => [
        ...prev,
        {
          id,
          direction,
          eventName,
          eventData,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          expanded: false
        }
      ]);
    },
    []
  );
  const logClientEvent = useCallback4(
    (eventObj, eventNameSuffix = "") => {
      const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
      addLoggedEvent("client", name, eventObj);
    },
    [addLoggedEvent]
  );
  const logServerEvent = useCallback4(
    (eventObj, eventNameSuffix = "") => {
      const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
      addLoggedEvent("server", name, eventObj);
    },
    [addLoggedEvent]
  );
  const logHistoryItem = useCallback4(
    (item) => {
      let eventName = item.type;
      if (item.type === "message") {
        eventName = `${item.role}.${item.status || "unknown"}`;
      }
      if (item.type === "function_call") {
        eventName = `function.${item.name || "unknown"}.${item.status || "unknown"}`;
      }
      addLoggedEvent("server", eventName, item);
    },
    [addLoggedEvent]
  );
  const toggleExpand = useCallback4((id) => {
    setLoggedEvents(
      (prev) => prev.map((log) => log.id === id ? { ...log, expanded: !log.expanded } : log)
    );
  }, []);
  const clearEvents = useCallback4(() => {
    setLoggedEvents([]);
  }, []);
  return /* @__PURE__ */ jsx3(
    EventContext.Provider,
    {
      value: { loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand, clearEvents },
      children
    }
  );
};
function useEvent() {
  const context = useContext2(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}

// src/hooks/useSessionHistory.ts
import { useRef as useRef5 } from "react";

// src/contexts/TranscriptContext.tsx
import {
  createContext as createContext3,
  useContext as useContext3,
  useState as useState4,
  useCallback as useCallback5
} from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
var TranscriptContext = createContext3(void 0);
function newTimestampPretty() {
  return (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}
var TranscriptProvider = ({ children }) => {
  const [transcriptItems, setTranscriptItems] = useState4([]);
  const addTranscriptMessage = useCallback5(
    (itemId, role, text = "", isHidden = false) => {
      setTranscriptItems((prev) => {
        if (prev.some((i) => i.itemId === itemId)) return prev;
        return [
          ...prev,
          {
            itemId,
            type: "MESSAGE",
            role,
            title: text,
            expanded: false,
            timestamp: newTimestampPretty(),
            createdAtMs: Date.now(),
            status: "IN_PROGRESS",
            isHidden
          }
        ];
      });
    },
    []
  );
  const updateTranscriptMessage = useCallback5(
    (itemId, newText, append = false) => {
      setTranscriptItems(
        (prev) => prev.map((item) => {
          if (item.itemId === itemId && item.type === "MESSAGE") {
            return {
              ...item,
              title: append ? (item.title ?? "") + newText : newText
            };
          }
          return item;
        })
      );
    },
    []
  );
  const addTranscriptBreadcrumb = useCallback5(
    (title, data) => {
      setTranscriptItems((prev) => [
        ...prev,
        {
          itemId: `breadcrumb-${generateId()}`,
          type: "BREADCRUMB",
          title,
          data,
          expanded: false,
          timestamp: newTimestampPretty(),
          createdAtMs: Date.now(),
          status: "DONE",
          isHidden: false
        }
      ]);
    },
    []
  );
  const toggleTranscriptItemExpand = useCallback5((itemId) => {
    setTranscriptItems(
      (prev) => prev.map(
        (log) => log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  }, []);
  const updateTranscriptItem = useCallback5(
    (itemId, updatedProperties) => {
      setTranscriptItems(
        (prev) => prev.map(
          (item) => item.itemId === itemId ? { ...item, ...updatedProperties } : item
        )
      );
    },
    []
  );
  const clearTranscript = useCallback5(() => {
    setTranscriptItems([]);
  }, []);
  return /* @__PURE__ */ jsx4(
    TranscriptContext.Provider,
    {
      value: {
        transcriptItems,
        addTranscriptMessage,
        updateTranscriptMessage,
        addTranscriptBreadcrumb,
        toggleTranscriptItemExpand,
        updateTranscriptItem,
        clearTranscript
      },
      children
    }
  );
};
function useTranscript() {
  const context = useContext3(TranscriptContext);
  if (!context) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}

// src/hooks/useSessionHistory.ts
function useSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem
  } = useTranscript();
  const { logServerEvent } = useEvent();
  const accumulatedTextRef = useRef5(/* @__PURE__ */ new Map());
  const pendingDeltasRef = useRef5(/* @__PURE__ */ new Map());
  const deltaTimerRef = useRef5(/* @__PURE__ */ new Map());
  const interruptedItemsRef = useRef5(/* @__PURE__ */ new Set());
  const totalAudioDurationRef = useRef5(/* @__PURE__ */ new Map());
  const extractMessageText = (content = []) => {
    if (!Array.isArray(content)) return "";
    return content.map((c) => {
      if (!c || typeof c !== "object") return "";
      const item = c;
      if (item.type === "input_text") return item.text ?? "";
      if (item.type === "audio") return item.transcript ?? "";
      return "";
    }).filter(Boolean).join("\n");
  };
  const extractFunctionCallByName = (name, content = []) => {
    if (!Array.isArray(content)) return void 0;
    return content.find(
      (c) => c && typeof c === "object" && c.type === "function_call" && c.name === name
    );
  };
  const maybeParseJson = (val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };
  const extractLastAssistantMessage = (history = []) => {
    if (!Array.isArray(history)) return void 0;
    return [...history].reverse().find(
      (c) => c && typeof c === "object" && c.type === "message" && c.role === "assistant"
    );
  };
  const extractModeration = (obj) => {
    if (!obj || typeof obj !== "object") return void 0;
    const o = obj;
    if ("moderationCategory" in o) return o;
    if ("outputInfo" in o) return extractModeration(o.outputInfo);
    if ("output" in o) return extractModeration(o.output);
    if ("result" in o) return extractModeration(o.result);
    return void 0;
  };
  const sketchilyDetectGuardrailMessage = (text) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };
  function handleAgentToolStart(details, _agent, functionCall) {
    const context = details?.context;
    const history = context?.history;
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, history);
    addTranscriptBreadcrumb(`function call: ${lastFunctionCall?.name}`, lastFunctionCall?.arguments);
  }
  function handleAgentToolEnd(details, _agent, functionCall, result) {
    const context = details?.context;
    const history = context?.history;
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, history);
    addTranscriptBreadcrumb(`function call result: ${lastFunctionCall?.name}`, maybeParseJson(result));
  }
  function handleHistoryAdded(item) {
    if (!item || item.type !== "message") return;
    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      let text = extractMessageText(content);
      if (role === "assistant" && !text) {
        text = "";
      } else if (role === "user" && !text) {
        return;
      }
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb("Output Guardrail Active", { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
      }
    }
  }
  function handleHistoryUpdated(items) {
    items.forEach((item) => {
      if (!item || item.type !== "message") return;
      const { itemId, role, content = [] } = item;
      if (interruptedItemsRef.current.has(itemId)) return;
      if (role === "assistant") return;
      const text = extractMessageText(content);
      if (text) {
        updateTranscriptMessage(itemId, text, false);
      }
    });
  }
  const pendingTextRef = useRef5(/* @__PURE__ */ new Map());
  const displayedTextRef = useRef5(/* @__PURE__ */ new Map());
  function handleTranscriptionDelta(item, audioPositionMs) {
    const itemId = item.item_id;
    const deltaText = item.delta || "";
    if (!itemId || !deltaText) return;
    if (interruptedItemsRef.current.has(itemId)) return;
    const text = (accumulatedTextRef.current.get(itemId) || "") + deltaText;
    accumulatedTextRef.current.set(itemId, text);
    pendingTextRef.current.set(itemId, text);
    displayedTextRef.current.set(itemId, text);
    if (audioPositionMs !== void 0 && audioPositionMs > 0) {
      totalAudioDurationRef.current.set(itemId, audioPositionMs);
    }
    if (text.replace(/[\s.…]+/g, "").length === 0) return;
    updateTranscriptMessage(itemId, text, false);
  }
  function handleTranscriptionCompleted(item) {
    const itemId = item.item_id;
    if (interruptedItemsRef.current.has(itemId)) return;
    if (itemId) {
      const timer = deltaTimerRef.current.get(itemId);
      if (timer) clearTimeout(timer);
      deltaTimerRef.current.delete(itemId);
      pendingDeltasRef.current.delete(itemId);
      pendingTextRef.current.delete(itemId);
      displayedTextRef.current.delete(itemId);
      accumulatedTextRef.current.delete(itemId);
      totalAudioDurationRef.current.delete(itemId);
      const displayedText = displayedTextRef.current.get(itemId);
      const finalText = displayedText || item.transcript || "";
      const stripped = finalText.replace(/[\s.…]+/g, "");
      if (stripped.length > 0) {
        updateTranscriptMessage(itemId, finalText, false);
      }
      updateTranscriptItem(itemId, { status: "DONE" });
      const transcriptItem = transcriptItems.find((i) => i.itemId === itemId);
      if (transcriptItem?.guardrailResult?.status === "IN_PROGRESS") {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: "DONE",
            category: "NONE",
            rationale: ""
          }
        });
      }
    }
  }
  function handleGuardrailTripped(details, _agent, guardrail) {
    const result = guardrail.result;
    const output = result?.output;
    const outputInfo = output?.outputInfo;
    const moderation = extractModeration(outputInfo);
    logServerEvent({ type: "guardrail_tripped", payload: moderation });
    const context = details?.context;
    const history = context?.history;
    const lastAssistant = extractLastAssistantMessage(history);
    if (lastAssistant && moderation) {
      const category = moderation.moderationCategory ?? "NONE";
      const rationale = moderation.moderationRationale ?? "";
      const offendingText = moderation.testText;
      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: "DONE",
          category,
          rationale,
          testText: offendingText
        }
      });
    }
  }
  const transcriptItemsRef = useRef5(transcriptItems);
  transcriptItemsRef.current = transcriptItems;
  const handlersRef = useRef5({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    isInterrupted: (itemId) => interruptedItemsRef.current.has(itemId),
    handleTruncation: (itemId, audioEndMs, totalAudioMs) => {
      if (interruptedItemsRef.current.has(itemId)) return;
      const timer = deltaTimerRef.current.get(itemId);
      if (timer) clearTimeout(timer);
      deltaTimerRef.current.delete(itemId);
      const fullText = pendingTextRef.current.get(itemId) || accumulatedTextRef.current.get(itemId) || "";
      pendingDeltasRef.current.delete(itemId);
      pendingTextRef.current.delete(itemId);
      displayedTextRef.current.delete(itemId);
      accumulatedTextRef.current.delete(itemId);
      totalAudioDurationRef.current.delete(itemId);
      interruptedItemsRef.current.add(itemId);
      if (!fullText || totalAudioMs <= 0) {
        updateTranscriptItem(itemId, { isHidden: true, status: "DONE" });
        return;
      }
      const fractionSpoken = Math.min(Math.max(audioEndMs / totalAudioMs, 0), 1);
      const estimatedCharPos = Math.floor(fullText.length * fractionSpoken);
      let truncatePos = estimatedCharPos;
      while (truncatePos > 0 && !/\s/.test(fullText[truncatePos - 1])) {
        truncatePos--;
      }
      if (truncatePos === 0 && estimatedCharPos > 0) {
        truncatePos = estimatedCharPos;
        while (truncatePos < fullText.length && !/\s/.test(fullText[truncatePos])) {
          truncatePos++;
        }
      }
      const truncatedText = fullText.slice(0, truncatePos).trim();
      if (truncatedText.length > 0) {
        updateTranscriptMessage(itemId, truncatedText + "...", false);
        updateTranscriptItem(itemId, { status: "DONE" });
      } else {
        updateTranscriptItem(itemId, { isHidden: true, status: "DONE" });
      }
    },
    handleGuardrailTripped
  });
  return handlersRef;
}

// src/hooks/useRealtimeSession.ts
function useRealtimeSession(callbacks = {}) {
  const sessionRef = useRef6(null);
  const [status, setStatus] = useState5("DISCONNECTED");
  const { logClientEvent, logServerEvent } = useEvent();
  const codecParamRef = useRef6("opus");
  const updateStatus = useCallback6(
    (s) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks, logClientEvent]
  );
  const historyHandlers = useSessionHistory().current;
  const interruptedRef = useRef6(/* @__PURE__ */ new Set());
  useEffect5(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codec = params.get("codec");
      if (codec) {
        codecParamRef.current = codec.toLowerCase();
      }
    }
  }, []);
  const wireNormalizedEvents = useCallback6((session) => {
    session.on("user_speech_started", () => {
    });
    session.on("user_transcript", (data) => {
      if (data.isFinal) {
        const text = data.text || data.delta || "";
        if (text.replace(/[\s.…,!?]+/g, "").length === 0) return;
        historyHandlers.handleTranscriptionCompleted({
          item_id: data.itemId,
          transcript: text
        });
      } else if (data.delta) {
        historyHandlers.handleTranscriptionDelta({
          item_id: data.itemId,
          delta: data.delta
        });
      }
    });
    session.on("assistant_transcript", (data) => {
      if (interruptedRef.current.has(data.itemId)) return;
      if (data.isFinal) {
        historyHandlers.handleTranscriptionCompleted({
          item_id: data.itemId,
          transcript: data.text || ""
        });
      } else if (data.delta) {
        historyHandlers.handleTranscriptionDelta(
          { item_id: data.itemId, delta: data.delta }
        );
      }
    });
    session.on("tool_call_start", (name, input) => {
      historyHandlers.handleAgentToolStart(
        {},
        void 0,
        { name, arguments: input }
      );
    });
    session.on("tool_call_end", (name, input, result) => {
      historyHandlers.handleAgentToolEnd(
        {},
        void 0,
        { name, arguments: input },
        result
      );
    });
    session.on("agent_handoff", (_from, to) => {
      callbacks.onAgentHandoff?.(to);
    });
    session.on("guardrail_tripped", (info) => {
      historyHandlers.handleGuardrailTripped(
        {},
        void 0,
        { result: info }
      );
    });
    session.on("raw_event", (event) => {
      const ev = event;
      if (ev.type === "conversation.item.truncated") {
        const itemId = ev.item_id;
        if (itemId) interruptedRef.current.add(itemId);
        return;
      }
      if (ev.type === "history_updated") {
        historyHandlers.handleHistoryUpdated(ev.items);
        return;
      }
      if (ev.type === "history_added") {
        historyHandlers.handleHistoryAdded(ev.item);
        return;
      }
      logServerEvent(ev);
    });
    session.on("error", (error) => {
      const e = error;
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
      const errObj = typeof e === "object" && e?.error ? e.error : e;
      const code = typeof errObj === "object" && errObj?.code ? String(errObj.code) : "";
      const msgStr = typeof msg === "string" ? msg : "";
      const isBenign = code === "response_cancel_not_active" || code === "conversation_already_has_active_response" || msgStr.includes("response_cancel_not_active") || msgStr.includes("conversation_already_has_active_response");
      if (isBenign) return;
      console.error("Session error:", msg);
      logServerEvent({ type: "error", message: msg });
    });
  }, [callbacks, historyHandlers, logServerEvent]);
  const connect = useCallback6(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
      outputGuardrails,
      adapter
    }) => {
      if (sessionRef.current) return;
      if (!adapter) {
        throw new Error(
          "useRealtimeSession: `adapter` is required in ConnectOptions. Pass an adapter like openai() from @jchaffin/voicekit/openai."
        );
      }
      updateStatus("CONNECTING");
      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];
      const codecParam = codecParamRef.current;
      const session = adapter.createSession(rootAgent, {
        codec: codecParam,
        language: "en"
      });
      sessionRef.current = session;
      wireNormalizedEvents(session);
      try {
        await session.connect({
          authToken: ek,
          audioElement,
          context: extraContext,
          outputGuardrails
        });
        updateStatus("CONNECTED");
      } catch (connectError) {
        console.error("Connection error:", connectError);
        sessionRef.current = null;
        updateStatus("DISCONNECTED");
        throw connectError;
      }
    },
    [updateStatus, wireNormalizedEvents]
  );
  const disconnect = useCallback6(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.disconnect();
      } catch (error) {
        console.error("Error closing session:", error);
      } finally {
        sessionRef.current = null;
        updateStatus("DISCONNECTED");
      }
    } else {
      updateStatus("DISCONNECTED");
    }
  }, [updateStatus]);
  const interrupt = useCallback6(() => {
    sessionRef.current?.interrupt();
  }, []);
  const sendUserText = useCallback6((text) => {
    if (!sessionRef.current) throw new Error("Session not connected");
    sessionRef.current.sendMessage(text);
  }, []);
  const sendEvent = useCallback6((ev) => {
    sessionRef.current?.sendRawEvent?.(ev);
  }, []);
  const mute = useCallback6((m) => {
    sessionRef.current?.mute(m);
  }, []);
  const pushToTalkStart = useCallback6(() => {
    sessionRef.current?.sendRawEvent?.({ type: "input_audio_buffer.clear" });
  }, []);
  const pushToTalkStop = useCallback6(() => {
    sessionRef.current?.sendRawEvent?.({ type: "input_audio_buffer.commit" });
    sessionRef.current?.sendRawEvent?.({ type: "response.create" });
  }, []);
  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt
  };
}

// src/guardrails.ts
import { z } from "zod";
var MODERATION_CATEGORIES = [
  "OFFENSIVE",
  "OFF_BRAND",
  "VIOLENCE",
  "NONE"
];
var ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);
var GuardrailOutputZod = z.object({
  moderationRationale: z.string(),
  moderationCategory: ModerationCategoryZod,
  testText: z.string().optional()
}).strict();
async function runGuardrailClassifier(message, config = {}) {
  const {
    apiEndpoint = "/api/responses",
    model = "gpt-4o-mini",
    categories = MODERATION_CATEGORIES,
    companyName = "Company"
  } = config;
  const categoryDescriptions = categories.map((cat) => {
    switch (cat) {
      case "OFFENSIVE":
        return "- OFFENSIVE: Content that includes hate speech, discriminatory language, insults, slurs, or harassment.";
      case "OFF_BRAND":
        return "- OFF_BRAND: Content that discusses competitors in a disparaging way.";
      case "VIOLENCE":
        return "- VIOLENCE: Content that includes explicit threats, incitement of harm, or graphic descriptions of physical injury or violence.";
      case "NONE":
        return "- NONE: If no other classes are appropriate and the message is fine.";
      default:
        return `- ${cat}: Custom category.`;
    }
  }).join("\n");
  const messages = [
    {
      role: "user",
      content: `You are an expert at classifying text according to moderation policies. Consider the provided message, analyze potential classes from output_classes, and output the best classification. Output json, following the provided schema. Keep your analysis and reasoning short and to the point, maximum 2 sentences.

      <info>
      - Company name: ${companyName}
      </info>

      <message>
      ${message}
      </message>

      <output_classes>
      ${categoryDescriptions}
      </output_classes>
      `
    }
  ];
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: messages,
      text: {
        format: {
          type: "json_schema",
          name: "output_format",
          schema: GuardrailOutputZod
        }
      }
    })
  });
  if (!response.ok) return null;
  try {
    const data = await response.json();
    return GuardrailOutputZod.parse(data);
  } catch {
    return null;
  }
}
function createModerationGuardrail(config = {}) {
  return {
    name: "moderation_guardrail",
    async execute({ agentOutput }) {
      try {
        const res = await runGuardrailClassifier(agentOutput, config);
        const triggered = res?.moderationCategory !== "NONE";
        return {
          tripwireTriggered: triggered || false,
          outputInfo: res || { error: "guardrail_failed" }
        };
      } catch {
        return {
          tripwireTriggered: false,
          outputInfo: { error: "guardrail_failed" }
        };
      }
    }
  };
}
function createCustomGuardrail(name, classifier) {
  return {
    name,
    async execute({ agentOutput }) {
      try {
        const { triggered, info } = await classifier(agentOutput);
        return {
          tripwireTriggered: triggered,
          outputInfo: info
        };
      } catch {
        return {
          tripwireTriggered: false,
          outputInfo: { error: "guardrail_failed" }
        };
      }
    }
  };
}

// src/suggestions/SuggestionContext.tsx
import { createContext as createContext4, useContext as useContext4, useState as useState6, useCallback as useCallback7, useEffect as useEffect6 } from "react";

// src/suggestions/types.ts
var SUGGESTION_EVENT = "voicekit:suggestions";

// src/suggestions/SuggestionContext.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var SuggestionCtx = createContext4(null);
function SuggestionProvider({
  children,
  onSelect,
  autoClear = true
}) {
  const [suggestions, setSuggestionsState] = useState6(null);
  const setSuggestions = useCallback7((group) => {
    setSuggestionsState(group);
  }, []);
  const clearSuggestions2 = useCallback7(() => {
    setSuggestionsState(null);
  }, []);
  const selectSuggestion = useCallback7(
    (item) => {
      onSelect?.(item);
      if (autoClear) setSuggestionsState(null);
    },
    [onSelect, autoClear]
  );
  useEffect6(() => {
    const handler = (e) => {
      const detail = e.detail;
      if (detail?.group) {
        setSuggestionsState(detail.group);
      }
    };
    window.addEventListener(SUGGESTION_EVENT, handler);
    return () => window.removeEventListener(SUGGESTION_EVENT, handler);
  }, []);
  const value = {
    suggestions,
    setSuggestions,
    selectSuggestion,
    clearSuggestions: clearSuggestions2
  };
  return /* @__PURE__ */ jsx5(SuggestionCtx.Provider, { value, children });
}
function useSuggestions() {
  const ctx = useContext4(SuggestionCtx);
  if (!ctx) {
    throw new Error("useSuggestions must be used within a SuggestionProvider");
  }
  return ctx;
}

// src/suggestions/emitSuggestions.ts
function emitSuggestions(group) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SUGGESTION_EVENT, {
      detail: { group }
    })
  );
}
function clearSuggestions() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SUGGESTION_EVENT, {
      detail: { group: null }
    })
  );
}

// src/suggestions/SuggestionChips.tsx
import React6 from "react";
import { jsx as jsx6, jsxs as jsxs2 } from "react/jsx-runtime";
function SuggestionChips({
  group: groupOverride,
  renderItem,
  className,
  chipClassName
}) {
  const { suggestions, selectSuggestion } = useSuggestions();
  const group = groupOverride ?? suggestions;
  if (!group || group.items.length === 0) return null;
  return /* @__PURE__ */ jsxs2("div", { className: className ?? "vk-suggestions", children: [
    group.prompt && /* @__PURE__ */ jsx6("p", { className: "vk-suggestions-prompt", style: { fontSize: "0.875rem", opacity: 0.7, marginBottom: "0.5rem" }, children: group.prompt }),
    /* @__PURE__ */ jsx6(
      "div",
      {
        className: "vk-suggestions-list",
        style: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
        children: group.items.map((item) => {
          const handleClick = () => selectSuggestion(item);
          if (renderItem) {
            return /* @__PURE__ */ jsx6(React6.Fragment, { children: renderItem(item, handleClick) }, item.id);
          }
          return /* @__PURE__ */ jsx6(
            "button",
            {
              onClick: handleClick,
              className: chipClassName ?? "vk-chip",
              style: chipClassName ? void 0 : {
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid rgba(99,102,241,0.3)",
                background: "rgba(99,102,241,0.08)",
                color: "inherit",
                cursor: "pointer",
                transition: "all 0.15s"
              },
              children: item.label
            },
            item.id
          );
        })
      }
    )
  ] });
}
export {
  ChatInput,
  ConnectButton,
  EventEmitter,
  EventProvider,
  GuardrailOutputZod,
  MODERATION_CATEGORIES,
  ModerationCategoryZod,
  SUGGESTION_EVENT,
  StatusIndicator,
  SuggestionChips,
  SuggestionProvider,
  TOOL_RESULT_EVENT,
  Transcript,
  TranscriptProvider,
  VoiceChat,
  VoiceProvider,
  applyCodecPreferences,
  audioFormatForCodec,
  clearSuggestions,
  convertWebMToWav,
  createAPITool,
  createAgent,
  createAgentFromTemplate,
  createCustomGuardrail,
  createEventTool,
  createModerationGuardrail,
  createNavigationTool,
  createRAGTool,
  createSearchTool,
  defineTool,
  emitSuggestions,
  encodeWAV,
  runGuardrailClassifier,
  useAudioRecorder,
  useEvent,
  useRealtimeSession,
  useSessionHistory,
  useSuggestions,
  useToolListener,
  useToolResult,
  useToolResults,
  useTranscript,
  useVoice
};
