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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: errorData }, 
        { status: response.status }
      );
    }

    const sessionRunData = await response.json();
    return NextResponse.json(sessionRunData);
  } catch (error) {
    console.error('Error starting session run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 