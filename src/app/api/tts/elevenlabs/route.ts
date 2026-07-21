import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import {
  buildElevenLabsSpeechBody,
  ELEVENLABS_TTS_MODEL_FAST,
  resolveElevenLabsVoiceId,
  type ElevenLabsVoiceGender,
  type ElevenLabsVoiceProfile,
} from '@/lib/elevenLabsSpeech';

interface ElevenLabsTtsBody {
  text?: string;
  gender?: ElevenLabsVoiceGender;
  voiceId?: string;
  voiceProfile?: ElevenLabsVoiceProfile;
  withTimestamps?: boolean;
  /** Use turbo model for lower latency (call mode). */
  lowLatency?: boolean;
}

async function proxyToBackend(
  request: NextRequest,
  body: ElevenLabsTtsBody,
): Promise<Response | null> {
  const authHeader = request.headers.get('authorization');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authHeader) {
    headers.Authorization = authHeader;
  }

  try {
    const response = await fetch(config.getApiUrl('/api/tts/elevenlabs'), {
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

async function synthesizeWithElevenLabs(
  body: ElevenLabsTtsBody,
): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY is not configured on the server' },
      { status: 503 },
    );
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const gender: ElevenLabsVoiceGender = body.gender === 'female' ? 'female' : 'male';
  const voiceProfile: ElevenLabsVoiceProfile =
    body.voiceProfile === 'kids' ? 'kids' : 'adult';
  const voiceId = resolveElevenLabsVoiceId(gender, body.voiceId, voiceProfile);
  const speechBody = buildElevenLabsSpeechBody({
    text,
    gender,
    voiceId,
    voiceProfile,
    modelId: body.lowLatency ? ELEVENLABS_TTS_MODEL_FAST : undefined,
  });
  const endpoint = body.withTimestamps
    ? `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`
    : `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: body.withTimestamps ? 'application/json' : 'audio/mpeg',
    },
    body: JSON.stringify(speechBody),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: detail || 'ElevenLabs request failed' },
      { status: response.status },
    );
  }

  if (body.withTimestamps) {
    const payload = await response.json();
    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
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
  let body: ElevenLabsTtsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Lip-sync needs character timestamps — the backend proxy returns plain MPEG only.
  if (body.withTimestamps) {
    return synthesizeWithElevenLabs(body);
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

  return synthesizeWithElevenLabs(body);
}
