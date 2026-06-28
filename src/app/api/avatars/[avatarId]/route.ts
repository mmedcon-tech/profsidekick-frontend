import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxyAuth';
import {
  normalizeAvatarPublicResponse,
  resolveLibraryPublicAvatar,
} from '@/lib/marketplaceAvatarNormalize';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ avatarId: string }> },
): Promise<NextResponse> {
  const { avatarId } = await context.params;
  const upstream = await proxyToBackend(request, `/api/avatars/${avatarId}`);

  if (upstream.ok) {
    const raw = await upstream.json().catch(() => null);
    const normalized = normalizeAvatarPublicResponse(raw);
    if (normalized) return NextResponse.json(normalized);
  }

  const libraryAvatar = resolveLibraryPublicAvatar(avatarId);
  if (libraryAvatar) {
    return NextResponse.json(libraryAvatar);
  }

  const detail =
    upstream.status === 401
      ? 'Authorization required'
      : 'Avatar not found';

  return NextResponse.json({ detail }, { status: upstream.status === 401 ? 401 : 404 });
}
