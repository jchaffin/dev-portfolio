"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/adapters/openai.ts
var openai_exports = {};
__export(openai_exports, {
  default: () => openai_default,
  openai: () => openai,
  openaiServer: () => openaiServer
});
module.exports = __toCommonJS(openai_exports);
var import_realtime = require("@openai/agents/realtime");

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

// src/tools.ts
var TOOL_RESULT_EVENT = "voicekit:tool-result";
function emitToolResult(name, input, result) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TOOL_RESULT_EVENT, {
      detail: { name, input, result, timestamp: Date.now() }
    }));
  }
}

// src/adapters/openai.ts
function convertTool(def) {
  return (0, import_realtime.tool)({
    name: def.name,
    description: def.description,
    parameters: {
      type: "object",
      properties: def.parameters.properties,
      required: def.parameters.required || [],
      additionalProperties: false
    },
    execute: async (input) => {
      try {
        const result = await def.execute(input);
        emitToolResult(def.name, input, result);
        return result;
      } catch (error) {
        const errorResult = { success: false, error: String(error) };
        emitToolResult(def.name, input, errorResult);
        return errorResult;
      }
    }
  });
}
var OpenAISession = class extends EventEmitter {
  constructor(agent, options) {
    super();
    this.session = null;
    this.responseInFlight = false;
    this.agent = agent;
    this.options = options;
  }
  async connect(config) {
    const audioElement = config.audioElement;
    this.session = new import_realtime.RealtimeSession(this.agent, {
      transport: new import_realtime.OpenAIRealtimeWebRTC({
        audioElement,
        ...this.options.codec === "g711" && {
          changePeerConnection: async (pc) => {
            pc.getTransceivers().forEach((transceiver) => {
              if (transceiver.sender.track?.kind === "audio") {
                transceiver.setCodecPreferences([
                  { mimeType: "audio/PCMU", clockRate: 8e3 },
                  { mimeType: "audio/PCMA", clockRate: 8e3 }
                ]);
              }
            });
            return pc;
          }
        }
      }),
      model: this.options.model || "gpt-realtime",
      config: {
        inputAudioFormat: this.options.codec === "g711" ? "g711_ulaw" : "pcm16",
        outputAudioFormat: this.options.codec === "g711" ? "g711_ulaw" : "pcm16",
        inputAudioTranscription: {
          model: this.options.transcriptionModel || "gpt-4o-transcribe",
          language: this.options.language || "en"
        }
      },
      outputGuardrails: config.outputGuardrails ?? [],
      context: config.context ?? {}
    });
    this.wireEvents(this.session);
    await this.session.connect({ apiKey: config.authToken });
    this.emit("status_change", "CONNECTED");
  }
  async disconnect() {
    if (this.session) {
      try {
        await this.session.close();
      } catch {
      }
      this.session = null;
    }
    this.removeAllListeners();
    this.emit("status_change", "DISCONNECTED");
  }
  async sendMessage(text) {
    if (!this.session) throw new Error("Session not connected");
    if (this.responseInFlight) {
      this.session.interrupt();
      await new Promise((resolve) => {
        const onDone = (event) => {
          if (event.type === "response.done" || event.type === "response.cancelled") {
            this.off("raw_event", onDone);
            resolve();
          }
        };
        this.on("raw_event", onDone);
        setTimeout(resolve, 1500);
      });
    }
    this.session.sendMessage(text);
  }
  interrupt() {
    this.session?.interrupt();
  }
  mute(muted) {
    this.session?.mute(muted);
  }
  sendRawEvent(event) {
    this.session?.transport.sendEvent(event);
  }
  // Map OpenAI SDK events -> normalized SessionEvents
  wireEvents(session) {
    session.on("transport_event", (event) => {
      const type = event.type;
      switch (type) {
        case "input_audio_buffer.speech_started":
          this.emit("user_speech_started");
          break;
        case "conversation.item.input_audio_transcription.delta":
          this.emit("user_transcript", {
            itemId: event.item_id,
            delta: event.delta || "",
            isFinal: false
          });
          break;
        case "conversation.item.input_audio_transcription.completed":
          this.emit("user_transcript", {
            itemId: event.item_id,
            text: event.transcript || "",
            isFinal: true
          });
          break;
        case "response.audio_transcript.delta":
        case "response.output_audio_transcript.delta":
          this.emit("assistant_transcript", {
            itemId: event.item_id,
            delta: event.delta || "",
            isFinal: false
          });
          break;
        case "response.audio_transcript.done":
        case "response.output_audio_transcript.done":
          this.emit("assistant_transcript", {
            itemId: event.item_id,
            text: event.transcript || "",
            isFinal: true
          });
          break;
        case "response.audio.delta":
        case "response.output_audio.delta":
          this.emit("audio_delta", event.item_id, event.delta);
          break;
        case "response.created":
          this.responseInFlight = true;
          this.emit("raw_event", event);
          break;
        case "response.done":
          this.responseInFlight = false;
          this.emit("raw_event", event);
          break;
        case "conversation.item.truncated":
          this.emit("raw_event", event);
          break;
        default:
          this.emit("raw_event", event);
          break;
      }
    });
    session.on("agent_tool_start", ((...args) => {
      const functionCall = args[2];
      if (functionCall) {
        this.emit("tool_call_start", functionCall.name, functionCall.arguments);
      }
    }));
    session.on("agent_tool_end", ((...args) => {
      const functionCall = args[2];
      const result = args[3];
      if (functionCall) {
        this.emit("tool_call_end", functionCall.name, functionCall.arguments, result);
      }
    }));
    session.on("agent_handoff", ((...args) => {
      const item = args[0];
      const context = item?.context;
      const history = context?.history;
      if (history?.length) {
        const lastMessage = history[history.length - 1];
        const agentName = (lastMessage.name || "").split("transfer_to_").pop() || "";
        this.emit("agent_handoff", "", agentName);
      }
    }));
    session.on("guardrail_tripped", ((...args) => {
      this.emit("guardrail_tripped", args);
    }));
    session.on("history_updated", ((...args) => {
      this.emit("raw_event", { type: "history_updated", items: args[0] });
    }));
    session.on("history_added", ((...args) => {
      this.emit("raw_event", { type: "history_added", item: args[0] });
    }));
    session.on("error", (error) => {
      if (error instanceof Error) {
        this.emit("error", error);
      } else if (error && typeof error === "object") {
        const obj = error;
        const msg = obj.message || obj.error?.message || JSON.stringify(error);
        this.emit("error", new Error(msg));
      } else {
        this.emit("error", new Error(String(error)));
      }
    });
  }
};
function openai(options = {}) {
  return {
    name: "openai",
    createSession(agentConfig, sessionOpts) {
      const merged = { ...options, ...sessionOpts };
      const agent = buildRealtimeAgent(agentConfig);
      return new OpenAISession(agent, merged);
    }
  };
}
function buildRealtimeAgent(config) {
  const tools = (config.tools || []).map(convertTool);
  return new import_realtime.RealtimeAgent({
    name: config.name,
    instructions: config.instructions,
    tools
  });
}
function openaiServer(config = {}) {
  const getSessionToken = async (overrides = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = merged.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return { error: "OpenAI API key not configured" };
    try {
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expires_after: {
            anchor: "created_at",
            seconds: merged.expiresIn || 600
          },
          session: {
            type: "realtime",
            model: merged.model || "gpt-realtime",
            ...merged.voice && { audio: { output: { voice: merged.voice } } },
            ...merged.instructions && { instructions: merged.instructions }
          }
        })
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("OpenAI client_secrets error:", text);
        return { error: `OpenAI API error: ${response.status}` };
      }
      const data = await response.json();
      if (!data.value) return { error: "Invalid response from OpenAI" };
      return { token: data.value };
    } catch (err) {
      return { error: String(err) };
    }
  };
  return {
    getSessionToken,
    createSessionHandler(overrides) {
      return async (_request) => {
        const result = await getSessionToken(overrides);
        if (result.error) {
          return Response.json({ error: result.error }, { status: 500 });
        }
        return Response.json({ ephemeralKey: result.token });
      };
    }
  };
}
var openai_default = openai;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  openai,
  openaiServer
});
