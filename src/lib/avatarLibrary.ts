import manifest from '../../public/avatars/manifest.json';
import type { ElevenLabsVoiceProfile } from '@/lib/elevenLabsSpeech';

export interface AvatarLibraryLipSyncHints {
  morphTargets: string[];
  blinkTargets?: string[];
  jawBones: string[];
  mouthOpenGain?: number;
  /** Viseme morph attack rate — lower = slower mouth movement. Default 28. */
  visemeAttack?: number;
  /** Viseme morph release rate — lower = slower mouth close. Default 14. */
  visemeRelease?: number;
  /** Fraction of each keyframe held before blending to the next shape (0–1). */
  visemeBlendHold?: number;
  visemeIntensity?: number;
}

export interface AvatarLibraryEntry {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  languages: string[];
  glbPath: string;
  thumbnailPath: string;
  tagline?: string;
  description?: string;
  tags: string[];
  source?: string;
  recommendedModelUrl?: string;
  previewFraming?: 'bust' | 'full';
  previewFitMargin?: number;
  previewModelScale?: number;
  /** Fraction of model height shown in 3D preview (upper-body crop). */
  previewCoverHeightFraction?: number;
  /** CSS object-position for the 2D portrait so the face lines up with the 3D crop. */
  portraitObjectPosition?: string;
  portraitObjectFit?: 'cover' | 'contain';
  voiceProfile?: ElevenLabsVoiceProfile;
  lipSync: AvatarLibraryLipSyncHints;
}

export interface AvatarLibraryManifest {
  version: number;
  description: string;
  avatars: AvatarLibraryEntry[];
}

const library = manifest as AvatarLibraryManifest;

export function getAvatarLibrary(): AvatarLibraryManifest {
  return library;
}

export function getAvatarLibraryEntry(id: string): AvatarLibraryEntry | undefined {
  return library.avatars.find((entry) => entry.id === id);
}

export function getAvatarLibraryEntryByName(name: string): AvatarLibraryEntry | undefined {
  return library.avatars.find(
    (entry) => entry.name.toLowerCase() === name.toLowerCase(),
  );
}

export function getAvatarVoiceProfile(entry: AvatarLibraryEntry): ElevenLabsVoiceProfile {
  if (entry.voiceProfile) return entry.voiceProfile;
  return entry.tags.includes('kids') ? 'kids' : 'adult';
}

export function resolveGlbUrl(modelUrl?: string | null, libraryId?: string | null): string {
  if (modelUrl) return modelUrl;
  if (libraryId) {
    const entry = getAvatarLibraryEntry(libraryId);
    if (entry) return entry.glbPath;
  }
  return library.avatars[0]?.glbPath ?? '/avatars/avatar-1.glb';
}

export function resolvePortraitPresentation(entry: AvatarLibraryEntry): {
  objectFit: 'cover' | 'contain';
  objectPosition: string;
} {
  return {
    objectFit: entry.portraitObjectFit ?? 'cover',
    objectPosition: entry.portraitObjectPosition ?? 'center 20%',
  };
}

/** Shared Emirati male avatar for the floating chatbot (issue #64). */
export const DEFAULT_CHATBOT_AVATAR_ID = 'avatar-2';

export function getDefaultChatbotAvatar(): AvatarLibraryEntry {
  return (
    getAvatarLibraryEntry(DEFAULT_CHATBOT_AVATAR_ID) ??
    library.avatars.find((entry) => entry.gender === 'male') ??
    library.avatars[0]
  );
}
