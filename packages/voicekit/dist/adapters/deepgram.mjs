import {
  EventEmitter
} from "../chunk-22WLZIXO.mjs";

// src/adapters/deepgram.ts
var DeepgramSession = class extends EventEmitter {
  constructor(agent, agentUrl, options) {
    super();
    this.ws = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.agent = agent;
    this.agentUrl = agentUrl;
    this.options = options;
  }
  async connect(config) {
    const url = new URL(this.agentUrl);
    url.searchParams.set("token", config.authToken);
    if (this.options.model) url.searchParams.set("model", this.options.model);
    if (this.options.language) url.searchParams.set("language", this.options.language);
    this.ws = new WebSocket(url.toString());
    await new Promise((resolve, reject) => {
      const ws = this.ws;
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(new Error("WebSocket connection failed"));
      ws.onclose = () => this.emit("status_change", "DISCONNECTED");
    });
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg, config.audioElement);
      } catch {
        this.emit("raw_event", event.data);
      }
    };
    this.ws.onerror = () => {
      this.emit("error", new Error("Deepgram WebSocket error"));
    };
    this.ws.send(JSON.stringify({
      type: "agent_config",
      agent: {
        name: this.agent.name,
        instructions: this.agent.instructions,
        tools: (this.agent.tools || []).map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    }));
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"
    });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(e.data);
      }
    };
    this.mediaRecorder.start(250);
    this.emit("status_change", "CONNECTED");
  }
  async disconnect() {
    this.mediaRecorder?.stop();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaRecorder = null;
    this.mediaStream = null;
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
          itemId: msg.itemId || msg.id || "",
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.is_final ?? msg.isFinal ?? !!msg.text
        });
        break;
      case "assistant_transcript":
        this.emit("assistant_transcript", {
          itemId: msg.itemId || msg.id || "",
          delta: msg.delta,
          text: msg.text,
          isFinal: msg.is_final ?? msg.isFinal ?? !!msg.text
        });
        break;
      case "audio":
        if (msg.data && audioElement) {
          this.emit("audio_delta", msg.itemId || "", msg.data);
        }
        break;
      case "tool_call_start":
        this.emit("tool_call_start", msg.name, msg.input);
        break;
      case "tool_call_end":
        this.emit("tool_call_end", msg.name, msg.input, msg.output);
        break;
      case "speech_started":
        this.emit("user_speech_started");
        break;
      case "error":
        this.emit("error", new Error(msg.message || "Deepgram error"));
        break;
      default:
        this.emit("raw_event", msg);
        break;
    }
  }
};
function deepgram(options) {
  return {
    name: "deepgram",
    createSession(agent, sessionOpts) {
      return new DeepgramSession(agent, options.agentUrl, { ...options, ...sessionOpts });
    }
  };
}
function deepgramServer(config = {}) {
  const getSessionToken = async (overrides = {}) => {
    const merged = { ...config, ...overrides };
    const apiKey = merged.apiKey || process.env.DEEPGRAM_API_KEY;
    if (!apiKey) return { error: "Deepgram API key not configured" };
    return { token: apiKey };
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
var deepgram_default = deepgram;
export {
  deepgram,
  deepgramServer,
  deepgram_default as default
};
