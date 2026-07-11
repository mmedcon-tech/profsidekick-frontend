import {
  getAvatarLibraryEntry,
  resolvePortraitPresentation,
  type AvatarLibraryEntry,
} from '@/lib/avatarLibrary';
import type { AssistantAvatar } from '@/hooks/useAssistantAvatar';
import { resolveVoiceProfile } from '@/lib/voiceProfiles';

/** Emirati teaching pair shown in the MyOS assistant call UI. */
export const ASSISTANT_PLATFORM_AVATAR_IDS = ['avatar-1', 'avatar-2'] as const;

export type AssistantPlatformAvatarId = (typeof ASSISTANT_PLATFORM_AVATAR_IDS)[number];

const STORAGE_KEY = 'myos-assistant-platform-avatar';

export function isAssistantPlatformAvatarId(
  value: string | null | undefined,
): value is AssistantPlatformAvatarId {
  return ASSISTANT_PLATFORM_AVATAR_IDS.includes(value as AssistantPlatformAvatarId);
}

export function readStoredAssistantPlatformAvatarId(): AssistantPlatformAvatarId {
  if (typeof window === 'undefined') return 'avatar-1';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isAssistantPlatformAvatarId(stored) ? stored : 'avatar-1';
}

export function writeStoredAssistantPlatformAvatarId(id: AssistantPlatformAvatarId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function getAlternatePlatformAvatarId(
  id: AssistantPlatformAvatarId,
): AssistantPlatformAvatarId {
  return id === 'avatar-1' ? 'avatar-2' : 'avatar-1';
}

/** Call-panel framing tuned per rig — Tripo realistic meshes read tighter than RPM. */
function resolveCallViewFraming(entry: AvatarLibraryEntry): {
  framing: 'full';
  fitMargin: number;
  modelScale: number;
  coverHeightFraction: number;
} {
  const baseScale = entry.previewModelScale ?? 1.15;
  const cover = entry.previewCoverHeightFraction ?? 0.36;
  const margin = entry.previewFitMargin ?? 1.05;

  if (entry.id === 'avatar-1') {
    // Salama (Tripo) — wider crop + neutral scale to match Sultan's bust framing.
    return {
      framing: 'full',
      fitMargin: margin,
      modelScale: baseScale,
      coverHeightFraction: 0.54,
    };
  }

  return {
    framing: 'full',
    fitMargin: Math.min(0.92, margin * 0.92),
    modelScale: baseScale * 1.08,
    coverHeightFraction: cover * 0.9,
  };
}

/** Per-rig lip-sync tuning for the MyOS assistant call view. */
function resolveCallLipSync(entry: AvatarLibraryEntry): AvatarLibraryEntry['lipSync'] & {
  visemeAttack: number;
  visemeRelease: number;
  visemeBlendHold: number;
  mouthOpenGain: number;
  visemeIntensity: number;
} {
  const base = entry.lipSync;

  if (entry.id === 'avatar-1') {
    return {
      ...base,
      mouthOpenGain: 1.1,
      visemeAttack: 4.5,
      visemeRelease: 6.5,
      visemeBlendHold: 0.68,
      visemeIntensity: 1,
    };
  }

  return {
    ...base,
    mouthOpenGain: 0.95,
    visemeAttack: 2.2,
    visemeRelease: 1.8,
    visemeBlendHold: 0.82,
    visemeIntensity: 0.72,
  };
}

export function buildPlatformAssistantAvatar(
  entry: AvatarLibraryEntry,
  language: 'en' | 'ar' = 'en',
): AssistantAvatar {
  const gender = entry.gender === 'male' ? 'male' : 'female';
  const view = resolveCallViewFraming(entry);
  return {
    name: entry.name,
    glbUrl: entry.glbPath,
    posterSrc: entry.thumbnailPath,
    framing: view.framing,
    fitMargin: view.fitMargin,
    modelScale: view.modelScale,
    coverHeightFraction: view.coverHeightFraction,
    lipSync: resolveCallLipSync(entry),
    voice: resolveVoiceProfile(undefined, gender),
    language,
    isDefault: false,
  };
}

export function getPlatformAssistantAvatar(
  id: AssistantPlatformAvatarId,
  language: 'en' | 'ar' = 'en',
): AssistantAvatar {
  const entry = getAvatarLibraryEntry(id);
  if (!entry) {
    const fallback = getAvatarLibraryEntry('avatar-1')!;
    return buildPlatformAssistantAvatar(fallback, language);
  }
  return buildPlatformAssistantAvatar(entry, language);
}

export function getPlatformPortraitSrc(id: AssistantPlatformAvatarId): string {
  return getAvatarLibraryEntry(id)?.thumbnailPath ?? '/images/salama-emirati-reference.png';
}

export { resolvePortraitPresentation };
