import { NextRequest } from 'next/server';
import { proxyPublicToBackend } from '@/lib/proxyAuth';
import { normalizeAuthUserRole } from '@/lib/roleMapping';

export async function POST(request: NextRequest) {
  return proxyPublicToBackend(request, '/api/auth/login', {
    transformData: normalizeAuthUserRole,
  });
}
