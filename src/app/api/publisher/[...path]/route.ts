import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { requireAuthHeader } from '@/lib/proxyAuth';

type RouteContext = { params: Promise<{ path: string[] }> };

const EMPTY_LIST_PATHS = new Set(['avatars', 'avatar-templates', 'admin/avatars']);

function emptyListPayload(pathKey: string): unknown {
  if (pathKey === 'avatars' || pathKey === 'admin/avatars') {
    return { avatars: [], total: 0, serviceAvailable: false };
  }
  if (pathKey === 'avatar-templates') {
    return [];
  }
  return { detail: 'Not Found', serviceAvailable: false };
}

async function proxyPublisher(
  request: NextRequest,
  pathSegments: string[],
  method: string,
): Promise<NextResponse> {
  const authHeader = requireAuthHeader(request);
  if (authHeader instanceof NextResponse) return authHeader;

  const path = pathSegments.join('/');
  const query = request.nextUrl.search;
  const backendUrl = config.getApiUrl(`/api/publisher/${path}${query}`);

  const init: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.text();
  }

  try {
    const response = await fetch(backendUrl, init);
    const data = await response.json().catch(() => ({}));

    if (response.status === 404 && method === 'GET' && EMPTY_LIST_PATHS.has(path)) {
      return NextResponse.json(emptyListPayload(path));
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`publisher proxy error [${method} /api/publisher/${path}]:`, error);
    if (method === 'GET' && EMPTY_LIST_PATHS.has(path)) {
      return NextResponse.json(emptyListPayload(path));
    }
    return NextResponse.json(
      { detail: 'Avatar service is temporarily unavailable' },
      { status: 503 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyPublisher(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyPublisher(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyPublisher(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyPublisher(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyPublisher(request, path, 'DELETE');
}
