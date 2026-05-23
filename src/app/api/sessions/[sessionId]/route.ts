import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.pathname.split('/').pop();

    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
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

    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
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
