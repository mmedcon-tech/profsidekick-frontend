import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Get the backend URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (!backendUrl) {
      console.error('Backend URL not configured');
      return NextResponse.json(
        { error: 'Backend configuration error' },
        { status: 500 }
      );
    }

    // Make the request to the backend
    const backendResponse = await fetch(`${backendUrl}/sessions/${sessionId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Backend update session error:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        error: errorData,
      });

      return NextResponse.json(
        { 
          error: errorData.detail || `Failed to update session: ${backendResponse.statusText}`,
          status: backendResponse.status 
        },
        { status: backendResponse.status }
      );
    }

    const updatedSession = await backendResponse.json();
    return NextResponse.json(updatedSession);

  } catch (error) {
    console.error('Update session API error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
} 