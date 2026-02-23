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

// src/adapters/elevenlabs.ts
var elevenlabs_exports = {};
__export(elevenlabs_exports, {
  default: () => elevenlabs_default,
  elevenlabs: () => elevenlabs,
  elevenlabsServer: () => elevenlabsServer
});
module.exports = __toCommonJS(elevenlabs_exports);

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

// src/adapters/elevenlabs.ts
var ELEVENLABS_WS_BASE = "wss://api.elevenlabs.io/v1/convai/conversation";
var ElevenLabsSession = class extends EventEmitter {
  constructor(agent, agentId, options) {
    super();
    this.ws = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.scriptProcessor = null;
    this.playbackCtx = null;
    this.agent = agent;
    this.agentId = agentId;
    this.options = options;
  }
  async connect(config) {
    const wsUrl = config.authToken?.startsWith("wss://") ? config.authToken : `${ELEVENLABS_WS_BASE}?agent_id=${this.agentId}`;
    this.ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      const ws = this.ws;
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("ElevenLabs WebSocket connection failed"));
    });
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg, config.audioElement);
      } catch {
        this.emit("raw_event", event.data);
      }
    };
    this.ws.onclose = () => {
      this.emit("status_change", "DISCONNECTED");
    };
    this.ws.onerror = () => {
      this.emit("error", new Error("ElevenLabs WebSocket error"));
    };
    if (this.agent.instructions) {
      this.ws.send(JSON.stringify({
        type: "contextual_update",
        text: this.agent.instructions
      }));
    }
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16e3 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 32768 : s * 32767;
      }
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = "";
      for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
      const base64 = btoa(binary);
      this.ws.send(JSON.stringify({ user_audio_chunk: base64 }));
    };
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    this.emit("status_change", "CONNECTED");
  }
  async disconnect() {
    this.scriptProcessor?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.playbackCtx?.close();
    this.scriptProcessor = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.playbackCtx = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.removeAllListeners();
  }
  sendMessage(text) {
    this.ws?.send(JSON.stringify({ type: "user_message", text }));
  }
  interrupt() {
    this.ws?.send(JSON.stringify({ type: "interrupt" }));
  }
  mute(muted) {
    this.mediaStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }
  sendRawEvent(event) {
    this.ws?.send(JSON.stringify(event));
  }
  handleMessage(msg, audioElement) {
    switch (msg.type) {
      case "user_transcript":
        this.emit("user_transcript", {
          itemId: msg.id || "",
          text: msg.user_transcript_event?.user_transcript || msg.text || "",
          isFinal: msg.user_transcript_event?.is_final ?? true
        });
        break;
      case "agent_response":
        this.emit("assistant_transcript", {
          itemId: msg.id || "",
          delta: msg.agent_response_event?.agent_response || msg.delta || "",
          isFinal: false
        });
        break;
      case "agent_response_correction":
        this.emit("assistant_transcript", {
          itemId: msg.id || "",
          text: msg.agent_response_correction_event?.corrected_text || "",
          isFinal: true
        });
        break;
      case "audio": {
        const audioData = msg.audio_event?.audio_base_64 || msg.audio;
        if (audioData) {
          this.emit("audio_delta", msg.id || "", audioData);
          this.playAudioChunk(audioData, audioElement);
        }
        break;
      }
      case "client_tool_call":
        this.emit("tool_call_start", msg.client_tool_call?.tool_name || "", msg.client_tool_call?.parameters);
        this.executeToolCall(msg);
        break;
      case "vad":
        if (msg.vad_event?.type === "SPEECH_START") {
          this.emit("user_speech_started");
        }
        break;
      case "error":
        this.emit("error", new Error(msg.message || msg.error || "ElevenLabs error"));
        break;
      default:
        this.emit("raw_event", msg);
        break;
    }
  }
  async executeToolCall(msg) {
    const toolCall = msg.client_tool_call;
    if (!toolCall) return;
    const toolDef = this.agent.tools?.find((t) => t.name === toolCall.tool_name);
    if (!toolDef) {
      this.ws?.send(JSON.stringify({
        type: "client_tool_result",
        tool_call_id: toolCall.tool_call_id,
        result: JSON.stringify({ error: `Tool ${toolCall.tool_name} not found` })
      }));
      return;
    }
    try {
      const result = await toolDef.execute(toolCall.parameters || {});
      this.emit("tool_call_end", toolCall.tool_name, toolCall.parameters, result);
      this.ws?.send(JSON.stringify({
        type: "client_tool_result",
        tool_call_id: toolCall.tool_call_id,
        result: JSON.stringify(result)
      }));
    } catch (err) {
      const errorResult = { error: String(err) };
      this.emit("tool_call_end", toolCall.tool_name, toolCall.parameters, errorResult);
      this.ws?.send(JSON.stringify({
        type: "client_tool_result",
        tool_call_id: toolCall.tool_call_id,
        result: JSON.stringify(errorResult)
      }));
    }
  }
  playAudioChunk(base64, audioElement) {
    if (!audioElement) return;
    try {
      if (!this.playbackCtx) {
        this.playbackCtx = new AudioContext({ sampleRate: 22050 });
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const samples = new Float32Array(bytes.length / 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = view.getInt16(i * 2, true) / 32768;
      }
      const buffer = this.playbackCtx.createBuffer(1, samples.length, 22050);
      buffer.copyToChannel(samples, 0);
      const src = this.playbackCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.playbackCtx.destination);
      src.start();
    } catch {
    }
  }
};
function elevenlabs(options) {
  return {
    name: "elevenlabs",
    createSession(agent, sessionOpts) {
      return new ElevenLabsSession(agent, options.agentId, { ...options, ...sessionOpts });
    }
  };
}
function elevenlabsServer(config = {}) {
  const getSessionToken = async (overrides = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = merged.apiKey || process.env.ELEVENLABS_API_KEY;
    const agentId = merged.agentId || process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey) return { error: "ElevenLabs API key not configured" };
    if (!agentId) return { error: "ElevenLabs agent ID not configured" };
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: "GET",
          headers: { "xi-api-key": apiKey }
        }
      );
      if (!res.ok) {
        return { error: `ElevenLabs API error: ${res.status}` };
      }
      const data = await res.json();
      return { token: data.signed_url || "" };
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
var elevenlabs_default = elevenlabs;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  elevenlabs,
  elevenlabsServer
});
