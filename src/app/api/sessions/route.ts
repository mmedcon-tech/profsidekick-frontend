import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Build backend URL with query parameters
    const backendUrl = new URL(config.getApiUrl('/api/sessions'));
    backendUrl.searchParams.append('page', searchParams.get('page') || '1');
    backendUrl.searchParams.append('limit', searchParams.get('limit') || '20');
    if (searchParams.get('status')) {
      backendUrl.searchParams.append('status', searchParams.get('status')!);
    }
    if (searchParams.get('sort')) {
      backendUrl.searchParams.append('sort', searchParams.get('sort')!);
    }

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch sessions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 