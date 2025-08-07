import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface TranscribeRequest {
  audio: string;
  language?: string;
}

interface TranscribeResponse {
  text: string;
  language?: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TranscribeResponse | ErrorResponse>> {
  try {
    const body: TranscribeRequest = await request.json();
    
    if (!body.audio) {
      return NextResponse.json(
        { error: "Missing audio data" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Convert base64 to buffer and create a File object
    const audioBuffer = Buffer.from(body.audio, 'base64');
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: body.language,
    });

    return NextResponse.json({
      text: transcription.text,
      language: body.language,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
