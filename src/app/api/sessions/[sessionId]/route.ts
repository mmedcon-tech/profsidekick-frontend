import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.pathname.split('/').pop();
    const authHeader = request.headers.get('authorization');

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}`), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail ?? errorData.message ?? 'Session not found' },
        { status: response.status },
      );
    }

    const sessionData = await response.json();
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.pathname.split('/').pop();
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}`), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const sessionData = await response.json();
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
