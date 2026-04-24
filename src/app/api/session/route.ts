import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Use the new client_secrets endpoint (replaces /v1/realtime/sessions)
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: {
          anchor: 'created_at',
          seconds: 600, // 10 minutes
        },
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          audio: {
            input: {
              transcription: {
                model: 'gpt-4o-transcribe',
              },
            },
            output: {
              voice: 'ash',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI client_secrets API error:', response.status, errorText);
      return NextResponse.json({ error: `OpenAI API error: ${response.status}`, details: errorText }, { status: 500 });
    }

    const data = await response.json();
    
    // New API returns { value: "ek_...", expires_at: ..., session: {...} }
    if (!data.value) {
      console.error('Invalid OpenAI response - missing value:', data);
      return NextResponse.json({ error: 'Invalid response from OpenAI', details: data }, { status: 500 });
    }

    return NextResponse.json({ ephemeralKey: data.value });
  } catch (error) {
    console.error('Session handler error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
