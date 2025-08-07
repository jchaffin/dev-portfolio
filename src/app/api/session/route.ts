import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Debug: Log the API key (first 10 chars only)
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');
    console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')));
    
    console.log('Making request to OpenAI with API key starting with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
    
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          input_audio_transcription: {
            model: "gpt-4o-transcribe",
            language: "en",
          },
          instructions: "You are an English-only AI assistant for Jacob's portfolio. Help visitors navigate and learn about his work."
        }),
      }
    ); 
    
    console.log('OpenAI response status:', response.status);
    const data = await response.json();
    console.log('OpenAI response data:', data);
    console.log('🎯 SESSION CREATED - Ready to hand off to MeAgent');
    
    // Check if the response has the expected structure
    if (!data.client_secret?.value) {
      console.error('Unexpected response structure:', data);
      return NextResponse.json(
        { error: "Invalid response from OpenAI API" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
