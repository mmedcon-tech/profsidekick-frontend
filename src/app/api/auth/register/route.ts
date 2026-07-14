import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { toBackendRole } from '@/lib/roleMapping';

interface RegisterBody {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

/** Backend UserRegistration schema uses camelCase (firstName, lastName). */
function toBackendRegisterBody(body: RegisterBody): Record<string, string> {
  const role = body.role ? toBackendRole(body.role) ?? body.role : '';
  return {
    username: body.username?.trim() ?? '',
    email: body.email?.trim() ?? '',
    password: body.password ?? '',
    firstName: (body.firstName ?? body.first_name ?? '').trim(),
    lastName: (body.lastName ?? body.last_name ?? '').trim(),
    role: role ?? '',
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = toBackendRegisterBody(body);
  if (
    !payload.username ||
    !payload.email ||
    !payload.password ||
    !payload.firstName ||
    !payload.lastName ||
    !payload.role
  ) {
    return NextResponse.json({ detail: 'Missing required registration fields' }, { status: 400 });
  }

  try {
    const response = await fetch(config.getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          detail: data.detail ?? data.message ?? 'Registration failed',
          message: data.message,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('auth/register proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach registration service' }, { status: 500 });
  }
}
