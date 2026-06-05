import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/professor/persona/avatars');
}
