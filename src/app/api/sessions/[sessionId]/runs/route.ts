import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const sessionId = pathParts[pathParts.indexOf('sessions') + 1];
    const body = await request.json();

    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/runs`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const sessionRunData = await response.json();
    return NextResponse.json(sessionRunData);
  } catch (error) {
    console.error('Error creating session run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
