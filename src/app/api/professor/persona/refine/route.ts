import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackend(request, '/api/professor/persona/refine', { method: 'POST', body });
}
