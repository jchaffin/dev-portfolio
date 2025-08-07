import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  })
} 