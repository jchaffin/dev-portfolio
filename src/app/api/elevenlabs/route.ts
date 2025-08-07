import { NextRequest, NextResponse } from 'next/server';
import ElevenLabs from 'elevenlabs';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, apiKey, settings } = await req.json();

    if (!text || !voiceId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: text, voiceId, or apiKey' },
        { status: 400 }
      );
    }

    const elevenlabs = new ElevenLabs({
      apiKey: apiKey,
    });

    const audioStream = await elevenlabs.textToSpeech({
      text: text,
      voiceId: voiceId,
      modelId: 'eleven_monolingual_v1',
      voiceSettings: settings || {
        stability: 0.5,
        similarityBoost: 0.5,
      },
    });

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('ElevenLabs API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing apiKey parameter' },
        { status: 400 }
      );
    }

    const elevenlabs = new ElevenLabs({
      apiKey: apiKey,
    });

    const voices = await elevenlabs.voices.getAll();

    return NextResponse.json(voices);
  } catch (error: any) {
    console.error('ElevenLabs voices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
