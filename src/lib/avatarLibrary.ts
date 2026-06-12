import manifest from '../../public/avatars/manifest.json';

export interface AvatarLibraryLipSyncHints {
  morphTargets: string[];
  blinkTargets?: string[];
  jawBones: string[];
}

export interface AvatarLibraryEntry {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  languages: string[];
  glbPath: string;
  thumbnailPath: string;
  tags: string[];
  source?: string;
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

export function resolveGlbUrl(modelUrl?: string | null, libraryId?: string | null): string {
  if (modelUrl) return modelUrl;
  if (libraryId) {
    const entry = getAvatarLibraryEntry(libraryId);
    if (entry) return entry.glbPath;
  }
  return library.avatars[0]?.glbPath ?? '/avatars/avatar-1.glb';
}
