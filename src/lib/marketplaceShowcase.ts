import { getAvatarLibraryEntry, type AvatarLibraryEntry } from '@/lib/avatarLibrary';
import type { AvatarPublicResponse } from '@/types/avatar';

export type MarketplaceShowcaseEntry = Pick<
  AvatarLibraryEntry,
  | 'name'
  | 'thumbnailPath'
  | 'glbPath'
  | 'lipSync'
  | 'previewFraming'
  | 'previewFitMargin'
  | 'previewModelScale'
>;

export function buildShowcaseEntryFromAvatar(
  avatar: AvatarPublicResponse,
): MarketplaceShowcaseEntry | null {
  const libraryEntry = avatar.glb_library_id
    ? getAvatarLibraryEntry(avatar.glb_library_id)
    : undefined;

  if (libraryEntry) {
    return {
      name: avatar.name,
      thumbnailPath: avatar.template_image_url ?? libraryEntry.thumbnailPath,
      glbPath: avatar.glb_preview_url ?? libraryEntry.glbPath,
      lipSync: libraryEntry.lipSync,
      previewFraming: libraryEntry.previewFraming,
      previewFitMargin: libraryEntry.previewFitMargin,
      previewModelScale: libraryEntry.previewModelScale,
    };
  }

  if (avatar.render_type === 'glb' && avatar.glb_preview_url) {
    return {
      name: avatar.name,
      thumbnailPath: avatar.template_image_url ?? '/images/avatar-female.png',
      glbPath: avatar.glb_preview_url,
      lipSync: {
        morphTargets: ['mouthOpen', 'jawOpen', 'viseme_aa', 'viseme_O'],
        blinkTargets: ['eyeBlinkLeft', 'eyeBlinkRight'],
        jawBones: ['jaw', 'Jaw'],
      },
      previewFraming: 'full',
      previewFitMargin: 1.05,
      previewModelScale: 1.15,
    };
  }

  return null;
}

export function avatarSupportsGlbShowcase(avatar: AvatarPublicResponse): boolean {
  return buildShowcaseEntryFromAvatar(avatar) !== null;
}
