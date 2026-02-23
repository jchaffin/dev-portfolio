// src/server.ts
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
export {
  corsHeaders,
  createSessionHandler,
  getEphemeralKey,
  handleOptions
};
