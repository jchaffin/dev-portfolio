import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    
    // Convert to format Whisper accepts
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text',
    });
    
    return NextResponse.json({ text: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
