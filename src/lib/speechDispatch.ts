import type { SessionAvatarConfig } from '@/types/types';
import { getAvatarLibraryEntry, getAvatarVoiceProfile } from '@/lib/avatarLibrary';
import type { ElevenLabsVoiceGender, ElevenLabsVoiceProfile } from '@/lib/elevenLabsSpeech';

export interface SpeechDispatch {
  provider: 'openai' | 'elevenlabs';
  /** Explicit voice id resolved by the backend's dual voice pipeline, if any. */
  voiceId?: string;
  /** Gender fallback derived from the 3-D avatar's library entry. */
  gender: ElevenLabsVoiceGender;
  /** ElevenLabs-only voice profile (adult/kids), used on the legacy fallback path. */
  voiceProfile: ElevenLabsVoiceProfile;
}

/**
 * Decide which TTS provider/voice to speak an assistant turn with.
 *
 * Prefers the session's backend-resolved voice (dual voice pipeline —
 * subscriber override > publisher default). Falls back to the legacy
 * "guess gender from the 3-D avatar's library entry, always use ElevenLabs"
 * behavior when the backend hasn't resolved anything (e.g. an older
 * ephemeral response, or a resolution failure that the backend already logs).
 *
 * `forceProvider` overrides the resolved provider — used for the mid-session
 * graceful-degradation fallback (ElevenLabs credits exhausted → OpenAI TTS).
 * When forcing to a provider with no matching resolved voiceId, the gender
 * fallback picks a reasonable default voice for that provider.
 */
export function resolveSpeechDispatch(
  config: SessionAvatarConfig,
  forceProvider?: 'openai' | 'elevenlabs',
): SpeechDispatch {
  const libraryEntry = config.glbLibraryId
    ? getAvatarLibraryEntry(config.glbLibraryId)
    : undefined;
  const gender: ElevenLabsVoiceGender = libraryEntry?.gender === 'female' ? 'female' : 'male';
  const voiceProfile: ElevenLabsVoiceProfile = libraryEntry
    ? getAvatarVoiceProfile(libraryEntry)
    : 'adult';

  if (forceProvider && forceProvider !== config.resolvedVoiceProvider) {
    return { provider: forceProvider, voiceId: undefined, gender, voiceProfile };
  }

  if (config.resolvedVoiceId && config.resolvedVoiceProvider === 'openai') {
    return { provider: 'openai', voiceId: config.resolvedVoiceId, gender, voiceProfile };
  }
  if (config.resolvedVoiceId && config.resolvedVoiceProvider === 'elevenlabs') {
    return { provider: 'elevenlabs', voiceId: config.resolvedVoiceId, gender, voiceProfile };
  }

  return { provider: 'elevenlabs', voiceId: undefined, gender, voiceProfile };
}
