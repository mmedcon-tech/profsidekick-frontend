import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

/*
 * FastAPI Backend Endpoints Required:
 * 
 * GET /api/prompts/{prompt_id}
 * - Returns: CustomPrompt
 * 
 * PUT /api/prompts/{prompt_id}
 * - Body: { name, description, content, category, tags: string (comma-separated), isPublic }
 * - Returns: CustomPrompt
 * 
 * DELETE /api/prompts/{prompt_id}
 * - Returns: { success: true }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const response = await fetch(config.getApiUrl(`/api/prompts/${promptId}`), {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Prompt not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(config.getApiUrl(`/api/prompts/${promptId}`), {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || errorData.detail || 'Failed to update prompt' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const response = await fetch(config.getApiUrl(`/api/prompts/${promptId}`), {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to delete prompt' },
        { status: response.status }
      );
    }

    // Return success response (backend might return empty response for DELETE)
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 