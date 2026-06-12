import { describe, expect, it } from 'vitest';
import { buildAvatarPreviewGreeting } from './avatarGreeting';

describe('buildAvatarPreviewGreeting', () => {
  it('personalises greeting with first name and avatar name', () => {
    const text = buildAvatarPreviewGreeting('Aisha Al Mansoori', 'Salama');
    expect(text).toContain('Hi Aisha');
    expect(text).toContain("I'm Salama");
    expect(text).toContain('helping you learn');
  });

  it('falls back when name is empty', () => {
    expect(buildAvatarPreviewGreeting('', 'Sultan')).toContain('Hi there');
  });
});
