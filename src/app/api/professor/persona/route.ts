import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/professor/persona');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackend(request, '/api/professor/persona', { method: 'POST', body });
}
