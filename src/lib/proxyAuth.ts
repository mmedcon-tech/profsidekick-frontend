import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export function requireAuthHeader(request: NextRequest): string | NextResponse {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ detail: 'Authorization header required' }, { status: 401 });
  }
  return authHeader;
}

export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  options: { method?: string; body?: unknown } = {},
): Promise<NextResponse> {
  const authHeader = requireAuthHeader(request);
  if (authHeader instanceof NextResponse) {
    return authHeader;
  }

  const method = options.method ?? request.method;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  } else if (method !== 'GET' && method !== 'HEAD') {
    try {
      init.body = await request.text();
    } catch {
      // no body
    }
  }

  const response = await fetch(config.getApiUrl(backendPath), init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { detail: data.detail ?? data.message ?? 'Request failed' },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
