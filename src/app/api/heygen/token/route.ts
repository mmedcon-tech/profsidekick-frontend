import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'HeyGen API key not configured' },
      { status: 503 },
    );
  }

  try {
    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
      throw new Error(`HeyGen API responded ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({ token: data.data?.token });
  } catch (err) {
    console.error('HeyGen token error:', err);
    return NextResponse.json(
      { error: 'Failed to obtain HeyGen streaming token' },
      { status: 500 },
    );
  }
}
