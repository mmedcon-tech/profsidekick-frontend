import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/api/auth/logout');
}
