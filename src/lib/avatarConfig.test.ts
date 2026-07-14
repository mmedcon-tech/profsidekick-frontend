import { describe, expect, it } from 'vitest';
import { resolveAvatarConfig } from './avatarConfig';
import type { EphemeralTokenResponse } from '@/types/types';

function baseResponse(): EphemeralTokenResponse {
  return {
    client_secret: { value: 'secret', expires_at: '2026-01-01T00:00:00Z' },
  };
}

describe('resolveAvatarConfig — voice provider fields', () => {
  it('defaults voiceProvider to openai and leaves voice id/dialect/source unset when absent', () => {
    const config = resolveAvatarConfig(baseResponse());

    expect(config.voiceProvider).toBe('openai');
    expect(config.voiceId).toBeNull();
    expect(config.voiceDialect).toBeNull();
    expect(config.voiceSource).toBeUndefined();
  });

  it('maps voice_provider/voice_id/voice_dialect/voice_source from the response', () => {
    const response: EphemeralTokenResponse = {
      ...baseResponse(),
      voice_provider: 'elevenlabs',
      voice_id: 'eleven-voice-1',
      voice_dialect: 'Emirati Arabic',
      voice_source: 'publisher',
    };

    const config = resolveAvatarConfig(response);

    expect(config.voiceProvider).toBe('elevenlabs');
    expect(config.voiceId).toBe('eleven-voice-1');
    expect(config.voiceDialect).toBe('Emirati Arabic');
    expect(config.voiceSource).toBe('publisher');
  });

  it('falls back to the provided fallback config when the response omits voice fields', () => {
    const config = resolveAvatarConfig(baseResponse(), {
      voiceProvider: 'elevenlabs',
      voiceId: 'fallback-voice',
      voiceDialect: 'Standard Arabic',
      voiceSource: 'subscriber',
    });

    expect(config.voiceProvider).toBe('elevenlabs');
    expect(config.voiceId).toBe('fallback-voice');
    expect(config.voiceDialect).toBe('Standard Arabic');
    expect(config.voiceSource).toBe('subscriber');
  });
});
