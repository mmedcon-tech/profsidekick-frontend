import { NextRequest } from 'next/server';
import { proxyPublicToBackend } from '@/lib/proxyAuth';

export async function POST(request: NextRequest) {
  return proxyPublicToBackend(request, '/api/auth/login');
}
