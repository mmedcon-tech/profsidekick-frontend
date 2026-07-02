import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';
import {
  enrichMarketplaceWithLibrary,
  normalizeAvatarPublicListResponse,
} from '@/lib/marketplaceAvatarNormalize';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const upstream = await proxyToBackend(request, '/api/avatars');

  if (!upstream.ok) {
    const enriched = enrichMarketplaceWithLibrary({ avatars: [], total: 0 });
    return NextResponse.json(enriched);
  }

  const raw = await upstream.json().catch(() => ({}));
  const normalized = normalizeAvatarPublicListResponse(raw);
  const enriched = enrichMarketplaceWithLibrary(normalized);

  return NextResponse.json(enriched);
}
