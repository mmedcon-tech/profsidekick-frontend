import { describe, expect, it } from 'vitest';
import { resolveAvatarConfig } from '@/lib/avatarConfig';
import type { EphemeralTokenResponse } from '@/types/types';

describe('resolveAvatarConfig', () => {
  it('defaults to static without heygen id', () => {
    const response: EphemeralTokenResponse = {
      client_secret: { value: 'tok', expires_at: '2026-01-01T00:00:00Z' },
    };
    expect(resolveAvatarConfig(response).renderType).toBe('static');
  });

  it('uses heygen when avatar id is returned', () => {
    const response: EphemeralTokenResponse = {
      client_secret: { value: 'tok', expires_at: '2026-01-01T00:00:00Z' },
      heygen_avatar_id: 'emirati_lady_001',
      avatar_render_type: 'heygen',
    };
    const config = resolveAvatarConfig(response);
    expect(config.renderType).toBe('heygen');
    expect(config.heygenAvatarId).toBe('emirati_lady_001');
  });

  it('maps the resolved dual voice pipeline fields', () => {
    const response: EphemeralTokenResponse = {
      client_secret: { value: 'tok', expires_at: '2026-01-01T00:00:00Z' },
      voice_provider: 'elevenlabs',
      voice_id: 'rachel',
      voice_dialect: 'ar-AE',
      voice_source: 'publisher',
    };
    const config = resolveAvatarConfig(response);
    expect(config.resolvedVoiceProvider).toBe('elevenlabs');
    expect(config.resolvedVoiceId).toBe('rachel');
    expect(config.resolvedVoiceDialect).toBe('ar-AE');
  });

  it('leaves resolved voice fields undefined when the backend has none', () => {
    const response: EphemeralTokenResponse = {
      client_secret: { value: 'tok', expires_at: '2026-01-01T00:00:00Z' },
    };
    const config = resolveAvatarConfig(response);
    expect(config.resolvedVoiceProvider).toBeUndefined();
    expect(config.resolvedVoiceId).toBeUndefined();
    expect(config.resolvedVoiceDialect).toBeUndefined();
  });
});
