import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { buildOpenAiSpeechBody } from '@/lib/openaiSpeech';
import type { SpeechVoiceGender } from '@/lib/openaiSpeech';

interface SpeechPreviewBody {
  text?: string;
  gender?: SpeechVoiceGender;
}

async function proxyToBackend(
  request: NextRequest,
  body: SpeechPreviewBody,
): Promise<Response | null> {
  const authHeader = request.headers.get('authorization');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authHeader) {
    headers.Authorization = authHeader;
  }

  try {
    const response = await fetch(config.getApiUrl('/api/tts/openai'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 404 || response.status === 501) {
      return null;
    }

    return response;
  } catch {
    return null;
  }
}

async function synthesizeWithOpenAi(body: SpeechPreviewBody): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { detail: 'OPENAI_API_KEY is not configured on the server' },
      { status: 503 },
    );
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

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  let body: SpeechPreviewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const backendResponse = await proxyToBackend(request, body);
  if (backendResponse?.ok) {
    const audio = await backendResponse.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': backendResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  }

  return synthesizeWithOpenAi(body);
}
