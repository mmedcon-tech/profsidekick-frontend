import { describe, expect, it } from 'vitest';
import { resolveSpeechDispatch } from './speechDispatch';
import type { SessionAvatarConfig } from '@/types/types';

const BASE_CONFIG: SessionAvatarConfig = {
  renderType: 'static',
  avatarName: 'Assistant',
};

describe('resolveSpeechDispatch', () => {
  it('uses the backend-resolved OpenAI voice when present', () => {
    const dispatch = resolveSpeechDispatch({
      ...BASE_CONFIG,
      resolvedVoiceProvider: 'openai',
      resolvedVoiceId: 'nova',
    });
    expect(dispatch.provider).toBe('openai');
    expect(dispatch.voiceId).toBe('nova');
  });

  it('uses the backend-resolved ElevenLabs voice when present', () => {
    const dispatch = resolveSpeechDispatch({
      ...BASE_CONFIG,
      resolvedVoiceProvider: 'elevenlabs',
      resolvedVoiceId: 'rachel-voice-id',
    });
    expect(dispatch.provider).toBe('elevenlabs');
    expect(dispatch.voiceId).toBe('rachel-voice-id');
  });

  it('falls back to ElevenLabs with no explicit voiceId when nothing is resolved', () => {
    const dispatch = resolveSpeechDispatch({ ...BASE_CONFIG });
    expect(dispatch.provider).toBe('elevenlabs');
    expect(dispatch.voiceId).toBeUndefined();
  });

  it('derives male gender fallback from a male library avatar', () => {
    const dispatch = resolveSpeechDispatch({
      ...BASE_CONFIG,
      glbLibraryId: 'avatar-2', // Sultan — male
    });
    expect(dispatch.gender).toBe('male');
  });

  it('derives female gender fallback from a female library avatar', () => {
    const dispatch = resolveSpeechDispatch({
      ...BASE_CONFIG,
      glbLibraryId: 'avatar-1', // Salama — female
    });
    expect(dispatch.gender).toBe('female');
  });

  it('derives the kids voice profile from a kids library avatar', () => {
    const dispatch = resolveSpeechDispatch({
      ...BASE_CONFIG,
      glbLibraryId: 'kids-female', // Layla — kids
    });
    expect(dispatch.voiceProfile).toBe('kids');
    expect(dispatch.gender).toBe('female');
  });

  it('defaults to male gender / adult profile with no library entry', () => {
    const dispatch = resolveSpeechDispatch({ ...BASE_CONFIG, glbLibraryId: undefined });
    expect(dispatch.gender).toBe('male');
    expect(dispatch.voiceProfile).toBe('adult');
  });

  it('ignores a resolved voice with a provider but no voiceId', () => {
    const dispatch = resolveSpeechDispatch({
      ...BASE_CONFIG,
      resolvedVoiceProvider: 'openai',
      resolvedVoiceId: undefined,
    });
    expect(dispatch.provider).toBe('elevenlabs');
    expect(dispatch.voiceId).toBeUndefined();
  });

  it('forces the given provider for graceful degradation, dropping the mismatched resolved voiceId', () => {
    const dispatch = resolveSpeechDispatch(
      {
        ...BASE_CONFIG,
        resolvedVoiceProvider: 'elevenlabs',
        resolvedVoiceId: 'rachel-voice-id',
      },
      'openai',
    );
    expect(dispatch.provider).toBe('openai');
    expect(dispatch.voiceId).toBeUndefined();
  });

  it('keeps the resolved voiceId when the forced provider matches it', () => {
    const dispatch = resolveSpeechDispatch(
      {
        ...BASE_CONFIG,
        resolvedVoiceProvider: 'openai',
        resolvedVoiceId: 'nova',
      },
      'openai',
    );
    expect(dispatch.provider).toBe('openai');
    expect(dispatch.voiceId).toBe('nova');
  });
});
