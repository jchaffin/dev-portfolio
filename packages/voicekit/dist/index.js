"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ChatInput: () => ChatInput,
  ConnectButton: () => ConnectButton,
  EventEmitter: () => EventEmitter,
  EventProvider: () => EventProvider,
  GuardrailOutputZod: () => GuardrailOutputZod,
  MODERATION_CATEGORIES: () => MODERATION_CATEGORIES,
  ModerationCategoryZod: () => ModerationCategoryZod,
  SUGGESTION_EVENT: () => SUGGESTION_EVENT,
  StatusIndicator: () => StatusIndicator,
  SuggestionChips: () => SuggestionChips,
  SuggestionProvider: () => SuggestionProvider,
  TOOL_RESULT_EVENT: () => TOOL_RESULT_EVENT,
  Transcript: () => Transcript,
  TranscriptProvider: () => TranscriptProvider,
  VoiceChat: () => VoiceChat,
  VoiceProvider: () => VoiceProvider,
  applyCodecPreferences: () => applyCodecPreferences,
  audioFormatForCodec: () => audioFormatForCodec,
  clearSuggestions: () => clearSuggestions,
  convertWebMToWav: () => convertWebMToWav,
  createAPITool: () => createAPITool,
  createAgent: () => createAgent,
  createAgentFromTemplate: () => createAgentFromTemplate,
  createCustomGuardrail: () => createCustomGuardrail,
  createEventTool: () => createEventTool,
  createModerationGuardrail: () => createModerationGuardrail,
  createNavigationTool: () => createNavigationTool,
  createRAGTool: () => createRAGTool,
  createSearchTool: () => createSearchTool,
  defineTool: () => defineTool,
  emitSuggestions: () => emitSuggestions,
  encodeWAV: () => encodeWAV,
  runGuardrailClassifier: () => runGuardrailClassifier,
  useAudioRecorder: () => useAudioRecorder,
  useEvent: () => useEvent,
  useRealtimeSession: () => useRealtimeSession,
  useSessionHistory: () => useSessionHistory,
  useSuggestions: () => useSuggestions,
  useToolListener: () => useToolListener,
  useToolResult: () => useToolResult,
  useToolResults: () => useToolResults,
  useTranscript: () => useTranscript,
  useVoice: () => useVoice
});
module.exports = __toCommonJS(index_exports);

// src/VoiceProvider.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var VoiceContext = (0, import_react.createContext)(null);
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
  const [status, setStatus] = (0, import_react.useState)("DISCONNECTED");
  const [transcript, setTranscript] = (0, import_react.useState)([]);
  const [isMuted, setIsMuted] = (0, import_react.useState)(false);
  const sessionRef = (0, import_react.useRef)(null);
  const audioRef = (0, import_react.useRef)(null);
  const statusRef = (0, import_react.useRef)("DISCONNECTED");
  const currentMsgIdRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    statusRef.current = status;
  }, [status]);
  (0, import_react.useEffect)(() => {
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
  const updateStatus = (0, import_react.useCallback)((newStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);
  const addMessage = (0, import_react.useCallback)((role, text, id) => {
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
  const updateMessage = (0, import_react.useCallback)((id, text, append = false) => {
    setTranscript((prev) => {
      const updated = prev.map(
        (m) => m.id === id ? { ...m, text: append ? m.text + text : text } : m
      );
      onTranscriptUpdate?.(updated);
      return updated;
    });
  }, [onTranscriptUpdate]);
  const completeMessage = (0, import_react.useCallback)((id) => {
    setTranscript((prev) => {
      const updated = prev.map(
        (m) => m.id === id ? { ...m, status: "complete" } : m
      );
      onTranscriptUpdate?.(updated);
      return updated;
    });
  }, [onTranscriptUpdate]);
  const wireSessionEvents = (0, import_react.useCallback)((session) => {
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
  const fetchToken = (0, import_react.useCallback)(async () => {
    try {
      const res = await fetch(sessionEndpoint, { method: "POST" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ephemeralKey || data.token || null;
    } catch {
      return null;
    }
  }, [sessionEndpoint]);
  const connect = (0, import_react.useCallback)(async () => {
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
      session.sendRawEvent?.({
        type: "session.update",
        session: {
          input_audio_noise_reduction: { type: "near_field" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.9,
            prefix_padding_ms: 300,
            silence_duration_ms: 1e3
          }
        }
      });
      setTimeout(() => {
        session.sendRawEvent?.({ type: "response.create" });
      }, 500);
    } catch (error) {
      console.error("VoiceKit connection failed:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      updateStatus("DISCONNECTED");
    }
  }, [adapter, agent, model, language, fetchToken, wireSessionEvents, updateStatus, onError]);
  const disconnect = (0, import_react.useCallback)(async () => {
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
  const sendMessage = (0, import_react.useCallback)((text) => {
    if (!sessionRef.current || statusRef.current !== "CONNECTED") return;
    sessionRef.current.interrupt();
    sessionRef.current.sendMessage(text);
  }, []);
  const interrupt = (0, import_react.useCallback)(() => {
    sessionRef.current?.interrupt();
  }, []);
  const mute = (0, import_react.useCallback)((muted) => {
    setIsMuted(muted);
    sessionRef.current?.mute(muted);
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, []);
  const clearTranscript = (0, import_react.useCallback)(() => {
    setTranscript([]);
    onTranscriptUpdate?.([]);
  }, [onTranscriptUpdate]);
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceContext.Provider, { value, children });
}
function useVoice() {
  const context = (0, import_react.useContext)(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}

// src/components/VoiceChat.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function Message({ message, userClassName, assistantClassName }) {
  const isUser = message.role === "user";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `flex ${isUser ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      className: `max-w-[80%] rounded-2xl px-4 py-2 ${isUser ? userClassName || "bg-blue-500 text-white rounded-br-md" : assistantClassName || "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"}`,
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm whitespace-pre-wrap", children: message.text })
    }
  ) });
}
function Transcript({
  messages,
  userClassName,
  assistantClassName,
  emptyMessage = "Start a conversation..."
}) {
  const containerRef = (0, import_react2.useRef)(null);
  const userScrolledUp = (0, import_react2.useRef)(false);
  (0, import_react2.useEffect)(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      userScrolledUp.current = !isAtBottom;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);
  (0, import_react2.useEffect)(() => {
    if (containerRef.current && messages.length > 0 && !userScrolledUp.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);
  if (messages.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center justify-center h-full text-gray-500", children: emptyMessage });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { ref: containerRef, className: "flex flex-col gap-3 overflow-y-auto h-full p-4", children: messages.map((msg) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `flex items-center gap-2 ${className}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `w-2 h-2 rounded-full ${config.color} ${config.pulse ? "animate-pulse" : ""}` }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-sm", children: config.text })
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
  const inputRef = (0, import_react2.useRef)(null);
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: handleSubmit, className: `flex gap-2 ${className}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "input",
      {
        ref: inputRef,
        type: "text",
        placeholder,
        disabled,
        className: "flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 \n                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100\n                   focus:outline-none focus:ring-2 focus:ring-blue-500\n                   disabled:opacity-50 disabled:cursor-not-allowed"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
  const defaultEmptyState = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col items-center justify-center gap-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ConnectButton, {}),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm text-gray-500", children: status === "CONNECTING" ? "Connecting..." : "Click to start a conversation" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 
                     bg-white dark:bg-gray-900 overflow-hidden ${className}`, children: [
    showHeader && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700", children: header || /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StatusIndicator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-2", children: [
        transcript.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            onClick: clearTranscript,
            className: "text-sm text-gray-500 hover:text-gray-700",
            children: "Clear"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            onClick: status === "CONNECTED" ? disconnect : connect,
            className: `text-sm font-medium ${status === "CONNECTED" ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}`,
            children: status === "CONNECTED" ? "End" : "Connect"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { height }, className: "overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Transcript,
      {
        messages: transcript,
        emptyMessage: emptyState || defaultEmptyState
      }
    ) }),
    footer || showInput && status === "CONNECTED" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-4 border-t border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ChatInput, {}) })
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

// src/tools.ts
function defineTool(config) {
  return {
    name: config.name,
    description: config.description,
    parameters: {
      type: "object",
      properties: config.parameters,
      required: config.required
    },
    execute: config.execute
  };
}
function createNavigationTool(sections) {
  return defineTool({
    name: "navigate",
    description: `Navigate to a section. Available: ${sections.join(", ")}`,
    parameters: {
      section: {
        type: "string",
        enum: sections,
        description: "Section to scroll to"
      }
    },
    required: ["section"],
    execute: ({ section }) => {
      if (typeof window !== "undefined") {
        const el = document.getElementById(section);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          return { success: true, section };
        }
      }
      return { success: false, error: "Section not found" };
    }
  });
}
function createEventTool(config) {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    required: config.required,
    execute: (params) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(config.eventType, {
          detail: { toolName: config.name, params }
        }));
      }
      return { success: true, ...params };
    }
  });
}
function createAPITool(config) {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    required: config.required,
    execute: async (params) => {
      try {
        const url = typeof config.endpoint === "function" ? config.endpoint(params) : config.endpoint;
        const isPost = config.method === "POST";
        const response = await fetch(url, {
          method: config.method || "GET",
          headers: {
            ...isPost ? { "Content-Type": "application/json" } : {},
            ...config.headers
          },
          body: isPost ? JSON.stringify(params) : void 0
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return config.transform ? config.transform(data) : data;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  });
}
function createSearchTool(config) {
  const paramName = config.searchParam || "query";
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: {
      [paramName]: {
        type: "string",
        description: `The ${paramName} to search for`
      }
    },
    required: [paramName],
    execute: async (params) => {
      const query = params[paramName];
      try {
        let result;
        if (config.fetch) {
          result = await config.fetch(query);
        } else if (config.endpoint) {
          const res = await fetch(config.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          result = await res.json();
        } else {
          throw new Error("Must provide either endpoint or fetch function");
        }
        const finalResult = config.transform ? config.transform(result) : result;
        if (config.eventType && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(config.eventType, {
            detail: { query, result: finalResult }
          }));
        }
        return finalResult;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  });
}
function createRAGTool(config) {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: {
      query: { type: "string", description: "Search query" },
      ...config.repo ? {} : { repo: { type: "string", description: "Optional: filter by repository name" } }
    },
    required: ["query"],
    execute: async (params) => {
      const { query, repo } = params;
      try {
        const res = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            repo: config.repo || repo,
            limit: config.limit || 10
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (config.eventType && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(config.eventType, {
            detail: { query, result }
          }));
        }
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  });
}
var TOOL_RESULT_EVENT = "voicekit:tool-result";

// src/hooks/toolHooks.ts
var import_react3 = require("react");
function useToolResults() {
  const [results, setResults] = (0, import_react3.useState)([]);
  (0, import_react3.useEffect)(() => {
    const handler = (event) => {
      setResults((prev) => [...prev, event.detail]);
    };
    window.addEventListener(TOOL_RESULT_EVENT, handler);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, handler);
  }, []);
  const clear = (0, import_react3.useCallback)(() => setResults([]), []);
  return {
    results,
    lastResult: results[results.length - 1] || null,
    clear
  };
}
function useToolListener(toolName, handler) {
  const handlerRef = (0, import_react3.useRef)(handler);
  handlerRef.current = handler;
  (0, import_react3.useEffect)(() => {
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
  const [state, setState] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    const handler = (event) => {
      if (event.detail.name === toolName) {
        setState({ input: event.detail.input, result: event.detail.result });
      }
    };
    window.addEventListener(TOOL_RESULT_EVENT, handler);
    return () => window.removeEventListener(TOOL_RESULT_EVENT, handler);
  }, [toolName]);
  const clear = (0, import_react3.useCallback)(() => setState(null), []);
  return {
    input: state?.input ?? null,
    result: state?.result ?? null,
    hasResult: state !== null,
    clear
  };
}

// src/hooks/useAudioRecorder.ts
var import_react4 = require("react");

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
  const mediaRecorderRef = (0, import_react4.useRef)(null);
  const recordedChunksRef = (0, import_react4.useRef)([]);
  const startRecording = (0, import_react4.useCallback)(async (stream) => {
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
  const stopRecording = (0, import_react4.useCallback)(() => {
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
  const downloadRecording = (0, import_react4.useCallback)(async (filename) => {
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
  const getRecordingBlob = (0, import_react4.useCallback)(async () => {
    if (recordedChunksRef.current.length === 0) {
      return null;
    }
    const webmBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    return convertWebMToWav(webmBlob);
  }, []);
  const clearRecording = (0, import_react4.useCallback)(() => {
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
var import_react8 = require("react");

// src/contexts/EventContext.tsx
var import_react5 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
var EventContext = (0, import_react5.createContext)(void 0);
var EventProvider = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = (0, import_react5.useState)([]);
  const addLoggedEvent = (0, import_react5.useCallback)(
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
  const logClientEvent = (0, import_react5.useCallback)(
    (eventObj, eventNameSuffix = "") => {
      const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
      addLoggedEvent("client", name, eventObj);
    },
    [addLoggedEvent]
  );
  const logServerEvent = (0, import_react5.useCallback)(
    (eventObj, eventNameSuffix = "") => {
      const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
      addLoggedEvent("server", name, eventObj);
    },
    [addLoggedEvent]
  );
  const logHistoryItem = (0, import_react5.useCallback)(
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
  const toggleExpand = (0, import_react5.useCallback)((id) => {
    setLoggedEvents(
      (prev) => prev.map((log) => log.id === id ? { ...log, expanded: !log.expanded } : log)
    );
  }, []);
  const clearEvents = (0, import_react5.useCallback)(() => {
    setLoggedEvents([]);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    EventContext.Provider,
    {
      value: { loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand, clearEvents },
      children
    }
  );
};
function useEvent() {
  const context = (0, import_react5.useContext)(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}

// src/hooks/useSessionHistory.ts
var import_react7 = require("react");

// src/contexts/TranscriptContext.tsx
var import_react6 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var TranscriptContext = (0, import_react6.createContext)(void 0);
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
  const [transcriptItems, setTranscriptItems] = (0, import_react6.useState)([]);
  const addTranscriptMessage = (0, import_react6.useCallback)(
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
  const updateTranscriptMessage = (0, import_react6.useCallback)(
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
  const addTranscriptBreadcrumb = (0, import_react6.useCallback)(
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
  const toggleTranscriptItemExpand = (0, import_react6.useCallback)((itemId) => {
    setTranscriptItems(
      (prev) => prev.map(
        (log) => log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  }, []);
  const updateTranscriptItem = (0, import_react6.useCallback)(
    (itemId, updatedProperties) => {
      setTranscriptItems(
        (prev) => prev.map(
          (item) => item.itemId === itemId ? { ...item, ...updatedProperties } : item
        )
      );
    },
    []
  );
  const clearTranscript = (0, import_react6.useCallback)(() => {
    setTranscriptItems([]);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
  const context = (0, import_react6.useContext)(TranscriptContext);
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
  const accumulatedTextRef = (0, import_react7.useRef)(/* @__PURE__ */ new Map());
  const pendingDeltasRef = (0, import_react7.useRef)(/* @__PURE__ */ new Map());
  const deltaTimerRef = (0, import_react7.useRef)(/* @__PURE__ */ new Map());
  const interruptedItemsRef = (0, import_react7.useRef)(/* @__PURE__ */ new Set());
  const totalAudioDurationRef = (0, import_react7.useRef)(/* @__PURE__ */ new Map());
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
        text = "[Transcribing...]";
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
  const pendingTextRef = (0, import_react7.useRef)(/* @__PURE__ */ new Map());
  const displayedTextRef = (0, import_react7.useRef)(/* @__PURE__ */ new Map());
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
      if (finalText && finalText !== "\n") {
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
  const transcriptItemsRef = (0, import_react7.useRef)(transcriptItems);
  transcriptItemsRef.current = transcriptItems;
  const handlersRef = (0, import_react7.useRef)({
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
  const sessionRef = (0, import_react8.useRef)(null);
  const [status, setStatus] = (0, import_react8.useState)("DISCONNECTED");
  const { logClientEvent, logServerEvent } = useEvent();
  const codecParamRef = (0, import_react8.useRef)("opus");
  const updateStatus = (0, import_react8.useCallback)(
    (s) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks, logClientEvent]
  );
  const historyHandlers = useSessionHistory().current;
  const interruptedRef = (0, import_react8.useRef)(/* @__PURE__ */ new Set());
  (0, import_react8.useEffect)(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codec = params.get("codec");
      if (codec) {
        codecParamRef.current = codec.toLowerCase();
      }
    }
  }, []);
  const wireNormalizedEvents = (0, import_react8.useCallback)((session) => {
    session.on("user_speech_started", () => {
    });
    session.on("user_transcript", (data) => {
      if (data.isFinal) {
        historyHandlers.handleTranscriptionCompleted({
          item_id: data.itemId,
          transcript: data.text || data.delta || ""
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
  const connect = (0, import_react8.useCallback)(
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
  const disconnect = (0, import_react8.useCallback)(async () => {
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
  const interrupt = (0, import_react8.useCallback)(() => {
    sessionRef.current?.interrupt();
  }, []);
  const sendUserText = (0, import_react8.useCallback)((text) => {
    if (!sessionRef.current) throw new Error("Session not connected");
    sessionRef.current.sendMessage(text);
  }, []);
  const sendEvent = (0, import_react8.useCallback)((ev) => {
    sessionRef.current?.sendRawEvent?.(ev);
  }, []);
  const mute = (0, import_react8.useCallback)((m) => {
    sessionRef.current?.mute(m);
  }, []);
  const pushToTalkStart = (0, import_react8.useCallback)(() => {
    sessionRef.current?.sendRawEvent?.({ type: "input_audio_buffer.clear" });
  }, []);
  const pushToTalkStop = (0, import_react8.useCallback)(() => {
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
var import_zod = require("zod");
var MODERATION_CATEGORIES = [
  "OFFENSIVE",
  "OFF_BRAND",
  "VIOLENCE",
  "NONE"
];
var ModerationCategoryZod = import_zod.z.enum([...MODERATION_CATEGORIES]);
var GuardrailOutputZod = import_zod.z.object({
  moderationRationale: import_zod.z.string(),
  moderationCategory: ModerationCategoryZod,
  testText: import_zod.z.string().optional()
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
var import_react9 = require("react");

// src/suggestions/types.ts
var SUGGESTION_EVENT = "voicekit:suggestions";

// src/suggestions/SuggestionContext.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var SuggestionCtx = (0, import_react9.createContext)(null);
function SuggestionProvider({
  children,
  onSelect,
  autoClear = true
}) {
  const [suggestions, setSuggestionsState] = (0, import_react9.useState)(null);
  const setSuggestions = (0, import_react9.useCallback)((group) => {
    setSuggestionsState(group);
  }, []);
  const clearSuggestions2 = (0, import_react9.useCallback)(() => {
    setSuggestionsState(null);
  }, []);
  const selectSuggestion = (0, import_react9.useCallback)(
    (item) => {
      onSelect?.(item);
      if (autoClear) setSuggestionsState(null);
    },
    [onSelect, autoClear]
  );
  (0, import_react9.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SuggestionCtx.Provider, { value, children });
}
function useSuggestions() {
  const ctx = (0, import_react9.useContext)(SuggestionCtx);
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
var import_react10 = __toESM(require("react"));
var import_jsx_runtime6 = require("react/jsx-runtime");
function SuggestionChips({
  group: groupOverride,
  renderItem,
  className,
  chipClassName
}) {
  const { suggestions, selectSuggestion } = useSuggestions();
  const group = groupOverride ?? suggestions;
  if (!group || group.items.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: className ?? "vk-suggestions", children: [
    group.prompt && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "vk-suggestions-prompt", style: { fontSize: "0.875rem", opacity: 0.7, marginBottom: "0.5rem" }, children: group.prompt }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "div",
      {
        className: "vk-suggestions-list",
        style: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
        children: group.items.map((item) => {
          const handleClick = () => selectSuggestion(item);
          if (renderItem) {
            return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react10.default.Fragment, { children: renderItem(item, handleClick) }, item.id);
          }
          return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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

// src/core/EventEmitter.ts
var EventEmitter = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
  }
  on(event, handler) {
    let set = this.handlers.get(event);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
  }
  off(event, handler) {
    this.handlers.get(event)?.delete(handler);
  }
  emit(event, ...args) {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.error(`EventEmitter error in "${event}":`, e);
      }
    });
  }
  removeAllListeners() {
    this.handlers.clear();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
