import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, portfolioContext } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 })
    }

    // Debug: Log the API key (first 10 chars only)
    console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');
    
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return NextResponse.json({ error: `OpenAI API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    console.log('Session created:', data);
    
    return NextResponse.json({ 
      sessionId: data.id,
      status: 'connected',
      message: 'OpenAI Realtime API session created',
      data: data
    })
  } catch (error) {
    console.error('OpenAI Realtime connection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 