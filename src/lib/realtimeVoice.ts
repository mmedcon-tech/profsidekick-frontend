import { getAvatarLibraryEntry } from '@/lib/avatarLibrary';
import { pickOpenAiTtsVoice, type SpeechVoiceGender } from '@/lib/openaiSpeech';
import type { SessionAvatarConfig } from '@/types/types';

const MALE_LIBRARY_IDS = new Set(['avatar-2', 'kids-male']);

export function pickRealtimeVoiceForLibraryId(
  libraryId?: string | null,
): string {
  const entry = libraryId ? getAvatarLibraryEntry(libraryId) : undefined;
  const gender: SpeechVoiceGender =
    entry?.gender === 'male' || (libraryId && MALE_LIBRARY_IDS.has(libraryId))
      ? 'male'
      : entry?.gender === 'female'
        ? 'female'
        : 'male';
  return pickOpenAiTtsVoice(gender);
}

/** Realtime session voice that matches the visible avatar gender (cedar/marin). */
export function pickRealtimeVoiceForAvatar(config: SessionAvatarConfig): string {
  return pickRealtimeVoiceForLibraryId(
    config.glbLibraryId ?? DEFAULT_SESSION_AVATAR_ID,
  );
}

export const DEFAULT_SESSION_AVATAR_ID = 'avatar-2';
