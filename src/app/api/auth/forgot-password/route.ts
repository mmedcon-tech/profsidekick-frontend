import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim() ?? '';
  if (!email) {
    return NextResponse.json({ detail: 'Email is required' }, { status: 400 });
  }

  try {
    const response = await fetch(config.getApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail ?? data.message ?? 'Request failed' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('auth/forgot-password proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach password reset service' }, { status: 500 });
  }
}
