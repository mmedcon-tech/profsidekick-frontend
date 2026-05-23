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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to start guest session run' }, 
        { status: response.status }
      );
    }

    const sessionRunData = await response.json();
    return NextResponse.json(sessionRunData);
  } catch (error) {
    console.error('Error starting guest session run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
