import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';
import { normalizeAuthUserRole } from '@/lib/roleMapping';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/auth/verify-token', {
    transformData: normalizeAuthUserRole,
  });
}
