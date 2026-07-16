import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

interface TranscriptTurnBody {
  role?: 'assistant' | 'user';
  text?: string;
  captured_at?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; sessionRunId: string }> },
): Promise<NextResponse> {
  const { sessionId, sessionRunId } = await params;

  let body: TranscriptTurnBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const role = body.role;
  const text = body.text?.trim();
  if (!role || (role !== 'assistant' && role !== 'user')) {
    return NextResponse.json({ error: 'role must be assistant or user' }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  try {
    const response = await fetch(
      config.getApiUrl(`/api/sessions/${sessionId}/run/${sessionRunId}/transcript`),
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          role,
          text,
          captured_at: body.captured_at ?? new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: detail || 'Failed to persist transcript' }, { status: response.status });
    }

    const data = await response.json().catch(() => ({ success: true }));
    return NextResponse.json(data);
  } catch (error) {
    console.error('transcript persistence error:', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 500 });
  }
}
