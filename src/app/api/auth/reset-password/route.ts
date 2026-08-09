import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const token = body.token?.trim() ?? '';
  const password = body.password ?? '';
  if (!token || !password) {
    return NextResponse.json({ detail: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ detail: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const response = await fetch(config.getApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail ?? data.message ?? 'Reset failed' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('auth/reset-password proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach password reset service' }, { status: 500 });
  }
}
