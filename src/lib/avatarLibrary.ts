import manifest from '../../public/avatars/manifest.json';
import type { ElevenLabsVoiceProfile } from '@/lib/elevenLabsSpeech';

export interface AvatarLibraryLipSyncHints {
  morphTargets: string[];
  blinkTargets?: string[];
  jawBones: string[];
  mouthOpenGain?: number;
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

/** Shared Emirati male avatar for the floating chatbot (issue #64). */
export const DEFAULT_CHATBOT_AVATAR_ID = 'avatar-2';

export function getDefaultChatbotAvatar(): AvatarLibraryEntry {
  return (
    getAvatarLibraryEntry(DEFAULT_CHATBOT_AVATAR_ID) ??
    library.avatars.find((entry) => entry.gender === 'male') ??
    library.avatars[0]
  );
}
