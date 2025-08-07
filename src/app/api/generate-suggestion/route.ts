import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { context, candidateInfo } = await request.json();

    // Call OpenAI API to generate suggestions
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping a ${candidateInfo || 'professional candidate'}. Based on the conversation context, provide 2-3 helpful response suggestions that the candidate could use. Keep responses concise and professional.`
          },
          {
            role: 'user',
            content: `Context: ${context}\n\nGenerate 2-3 helpful response suggestions:`
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate suggestion');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'I would provide a thoughtful response based on my experience.';
    
    // Split the response into individual suggestions
    const suggestions = content.split('\n').filter((line: string) => line.trim().length > 0).map((line: string) => 
      line.replace(/^\d+\.\s*/, '').trim()
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}
