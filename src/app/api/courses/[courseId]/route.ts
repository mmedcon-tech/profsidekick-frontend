import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

type RouteContext = { params: Promise<{ courseId: string }> };

async function proxyCourse(
  request: NextRequest,
  courseId: string,
  method: string,
  body?: string,
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ detail: 'Authorization header required' }, { status: 401 });
  }

  const init: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined) {
    init.body = body;
  }

  const response = await fetch(config.getApiUrl(`/api/courses/${courseId}`), init);
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { courseId } = await context.params;
  return proxyCourse(request, courseId, 'GET');
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { courseId } = await context.params;
  const body = await request.text();
  return proxyCourse(request, courseId, 'PUT', body);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { courseId } = await context.params;
  return proxyCourse(request, courseId, 'DELETE');
}
