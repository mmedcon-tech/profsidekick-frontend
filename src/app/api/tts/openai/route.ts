import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { buildOpenAiSpeechBody } from '@/lib/openaiSpeech';
import type { SpeechVoiceGender } from '@/lib/openaiSpeech';

interface OpenAiTtsBody {
  text?: string;
  voiceId?: string;
  gender?: SpeechVoiceGender;
}

async function proxyToBackend(
  request: NextRequest,
  body: OpenAiTtsBody,
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

async function synthesizeWithOpenAi(body: OpenAiTtsBody): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server' },
      { status: 503 },
    );
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const gender: SpeechVoiceGender = body.gender === 'male' ? 'male' : 'female';
  const speechBody = buildOpenAiSpeechBody({ text, gender, voiceId: body.voiceId });

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(speechBody),
  });

  if (!response.ok) {
    let detail = 'OpenAI speech request failed';
    try {
      const data = await response.json();
      if (typeof data?.error?.message === 'string') detail = data.error.message;
    } catch {
      // ignore parse errors — use the generic detail above
    }
    return NextResponse.json({ error: detail }, { status: response.status });
  }

  const audio = await response.arrayBuffer();
  return new NextResponse(audio, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  let body: OpenAiTtsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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
