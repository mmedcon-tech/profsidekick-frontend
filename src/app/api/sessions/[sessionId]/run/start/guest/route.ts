import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const sessionId = pathParts[pathParts.indexOf('sessions') + 1];
    const body = await request.json();

    // Guest endpoint - no authorization required
    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/start/guest`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.json().catch(() => ({ error: 'Failed to start guest session run' }));
    if (!response.ok) {
      console.error('Backend error:', responseBody);
      return NextResponse.json(responseBody, { status: response.status });
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Error starting guest session run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
