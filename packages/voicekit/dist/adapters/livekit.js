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

// src/adapters/livekit.ts
var livekit_exports = {};
__export(livekit_exports, {
  default: () => livekit_default,
  livekit: () => livekit,
  livekitServer: () => livekitServer
});
module.exports = __toCommonJS(livekit_exports);

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

// src/adapters/livekit.ts
var LiveKitSession = class extends EventEmitter {
  constructor(agent, serverUrl, options) {
    super();
    this.room = null;
    this.agent = agent;
    this.serverUrl = serverUrl;
    this.options = options;
  }
  async connect(config) {
    const { Room, RoomEvent, Track } = await import("livekit-client");
    this.room = new Room();
    this.room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = config.audioElement || document.createElement("audio");
        track.attach(el);
        if (!config.audioElement) {
          el.autoplay = true;
          el.style.display = "none";
          document.body.appendChild(el);
        }
      }
    });
    this.room.on(RoomEvent.DataReceived, (payload, participant, kind) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        this.handleDataMessage(msg, participant);
      } catch {
        this.emit("raw_event", { payload, participant, kind });
      }
    });
    this.room.on(RoomEvent.Disconnected, () => {
      this.emit("status_change", "DISCONNECTED");
    });
    this.room.on(RoomEvent.Reconnecting, () => {
      this.emit("status_change", "CONNECTING");
    });
    this.room.on(RoomEvent.Reconnected, () => {
      this.emit("status_change", "CONNECTED");
    });
    await this.room.connect(this.serverUrl, config.authToken);
    await this.room.localParticipant.setMicrophoneEnabled(true);
    this.emit("status_change", "CONNECTED");
  }
  async disconnect() {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.removeAllListeners();
  }
  sendMessage(text) {
    if (!this.room) throw new Error("Not connected");
    const data = new TextEncoder().encode(JSON.stringify({ type: "user_message", text }));
    this.room.localParticipant.publishData(data, { reliable: true });
  }
  interrupt() {
    if (!this.room) return;
    const data = new TextEncoder().encode(JSON.stringify({ type: "interrupt" }));
    this.room.localParticipant.publishData(data, { reliable: true });
  }
  mute(muted) {
    this.room?.localParticipant?.setMicrophoneEnabled(!muted);
  }
  sendRawEvent(event) {
    if (!this.room) return;
    const data = new TextEncoder().encode(JSON.stringify(event));
    this.room.localParticipant.publishData(data, { reliable: true });
  }
  handleDataMessage(msg, _participant) {
    switch (msg.type) {
      case "user_transcript":
        this.emit("user_transcript", {
          itemId: msg.itemId || msg.id || "",
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.isFinal ?? !!msg.text
        });
        break;
      case "assistant_transcript":
        this.emit("assistant_transcript", {
          itemId: msg.itemId || msg.id || "",
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.isFinal ?? !!msg.text
        });
        break;
      case "tool_call_start":
        this.emit("tool_call_start", msg.name, msg.input);
        break;
      case "tool_call_end":
        this.emit("tool_call_end", msg.name, msg.input, msg.output);
        break;
      case "agent_handoff":
        this.emit("agent_handoff", msg.from || "", msg.to || "");
        break;
      case "error":
        this.emit("error", new Error(msg.message || "LiveKit error"));
        break;
      case "speech_started":
        this.emit("user_speech_started");
        break;
      default:
        this.emit("raw_event", msg);
        break;
    }
  }
};
function livekit(options) {
  return {
    name: "livekit",
    createSession(agent, sessionOpts) {
      return new LiveKitSession(agent, options.serverUrl, { ...options, ...sessionOpts });
    }
  };
}
function livekitServer(config = {}) {
  const getSessionToken = async (overrides = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = merged.apiKey || process.env.LIVEKIT_API_KEY;
    const apiSecret = merged.apiSecret || process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return { error: "LiveKit API key and secret are required" };
    }
    try {
      const { AccessToken } = await import("livekit-server-sdk");
      const roomName = merged.roomName || `room-${Date.now()}`;
      const identity = merged.identity || `user-${Date.now()}`;
      const at = new AccessToken(apiKey, apiSecret, {
        identity,
        ttl: (merged.ttl || 600).toString() + "s"
      });
      at.addGrant({ roomJoin: true, room: roomName });
      return { token: await at.toJwt() };
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
var livekit_default = livekit;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  livekit,
  livekitServer
});
