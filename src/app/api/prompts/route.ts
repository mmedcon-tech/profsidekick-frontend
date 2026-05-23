import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

/*
 * FastAPI Backend Endpoints Required:
 * 
 * GET /api/prompts
 * - Query parameters: page?, limit?, search?, category?, include_public?
 * - Returns: { prompts: CustomPrompt[], total: number, page: number, limit: number }
 * 
 * POST /api/prompts
 * - Body: { name, description, content, category, tags: string (comma-separated), isPublic }
 * - Returns: CustomPrompt
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Build backend URL with query parameters
    const backendUrl = new URL(config.getApiUrl('/api/prompts'));
    backendUrl.searchParams.append('page', searchParams.get('page') || '1');
    backendUrl.searchParams.append('limit', searchParams.get('limit') || '50');
    if (searchParams.get('category')) {
      backendUrl.searchParams.append('category', searchParams.get('category')!);
    }
    if (searchParams.get('search')) {
      backendUrl.searchParams.append('search', searchParams.get('search')!);
    }
    if (searchParams.get('include_public')) {
      backendUrl.searchParams.append('include_public', searchParams.get('include_public')!);
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
        { error: errorData.message || 'Failed to fetch prompts' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(config.getApiUrl('/api/prompts'), {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || errorData.detail || 'Failed to create prompt' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 