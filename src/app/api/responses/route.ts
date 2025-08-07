import { NextRequest, NextResponse } from "next/server";

interface ResponseData {
  text: string;
  audio?: string;
  metadata?: Record<string, unknown>;
}

interface GuardrailResponse {
  output_parsed: any;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ResponseData | GuardrailResponse | ErrorResponse>> {
  try {
    const body: Record<string, unknown> = await request.json();
    
    // Handle guardrails request (OpenAI API call)
    if (body.model && body.input) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: body.model,
          messages: body.input,
          response_format: {
            type: 'json_object',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API request failed');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      const parsedContent = JSON.parse(content);
      return NextResponse.json({ output_parsed: parsedContent });
    }
    
    // Handle simple text response
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field" },
        { status: 400 }
      );
    }

    const responseData: ResponseData = {
      text: body.text,
      audio: body.audio as string | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error processing response request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
  