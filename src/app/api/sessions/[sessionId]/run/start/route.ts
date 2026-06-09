import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const pathParts = request.nextUrl.pathname.split('/');
    const sessionId = pathParts[pathParts.indexOf('sessions') + 1];
    const body = await request.json();

    // Forward the authorization header from the client
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/start`), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseBody = await response.json().catch(() => ({ error: 'Failed to start session run' }));
    if (!response.ok) {
      console.error('Backend error:', responseBody);
      return NextResponse.json(responseBody, { status: response.status });
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Error starting session run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 