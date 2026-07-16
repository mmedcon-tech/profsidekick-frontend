import { NextResponse } from 'next/server';
import { buildOpenAiSpeechBody } from '@/lib/openaiSpeech';
import type { SpeechVoiceGender } from '@/lib/openaiSpeech';

interface SpeechPreviewBody {
  text?: string;
  gender?: SpeechVoiceGender;
}

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { detail: 'OPENAI_API_KEY is not configured on the server' },
      { status: 503 },
    );
  }

  let body: SpeechPreviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ detail: 'text is required' }, { status: 400 });
  }

  const gender: SpeechVoiceGender = body.gender === 'male' ? 'male' : 'female';

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOpenAiSpeechBody({ text, gender })),
    });

    if (!res.ok) {
      let detail = 'OpenAI speech request failed';
      try {
        const data = await res.json();
        if (typeof data?.error?.message === 'string') detail = data.error.message;
      } catch {
        // ignore parse errors
      }
      return NextResponse.json({ detail }, { status: res.status });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('speech/preview error:', error);
    return NextResponse.json({ detail: 'Failed to reach OpenAI' }, { status: 500 });
  }
}
