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

// src/server.ts
var server_exports = {};
__export(server_exports, {
  corsHeaders: () => corsHeaders,
  createSessionHandler: () => createSessionHandler,
  getEphemeralKey: () => getEphemeralKey,
  handleOptions: () => handleOptions
});
module.exports = __toCommonJS(server_exports);
function createSessionHandler(config = {}) {
  return async function handler(request) {
    try {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return Response.json(
          { error: "OpenAI API key not configured" },
          { status: 500 }
        );
      }
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expires_after: {
            anchor: "created_at",
            seconds: config.expiresIn || 600
          },
          session: {
            type: "realtime",
            model: config.model || "gpt-realtime",
            ...config.voice && {
              audio: {
                output: { voice: config.voice }
              }
            },
            ...config.instructions && { instructions: config.instructions }
          }
        })
      });
      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI client_secrets error:", error);
        return Response.json(
          { error: `OpenAI API error: ${response.status}` },
          { status: 500 }
        );
      }
      const data = await response.json();
      if (!data.value) {
        return Response.json(
          { error: "Invalid response from OpenAI" },
          { status: 500 }
        );
      }
      return Response.json({ ephemeralKey: data.value });
    } catch (error) {
      console.error("Session handler error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
async function getEphemeralKey(config = {}) {
  try {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { error: "OpenAI API key not configured" };
    }
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: config.expiresIn || 600
        },
        session: {
          type: "realtime",
          model: config.model || "gpt-realtime",
          ...config.voice && {
            audio: {
              output: { voice: config.voice }
            }
          },
          ...config.instructions && { instructions: config.instructions }
        }
      })
    });
    if (!response.ok) {
      return { error: `OpenAI API error: ${response.status}` };
    }
    const data = await response.json();
    if (!data.value) {
      return { error: "Invalid response from OpenAI" };
    }
    return { ephemeralKey: data.value };
  } catch (error) {
    return { error: String(error) };
  }
}
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
function handleOptions(origin = "*") {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(origin)
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  corsHeaders,
  createSessionHandler,
  getEphemeralKey,
  handleOptions
});
