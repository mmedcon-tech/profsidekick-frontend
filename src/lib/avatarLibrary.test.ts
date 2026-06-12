import { describe, expect, it } from 'vitest';
import {
  getAvatarLibrary,
  getAvatarLibraryEntry,
  resolveGlbUrl,
} from './avatarLibrary';

describe('avatarLibrary', () => {
  it('loads manifest with three avatars including lip-sync hints', () => {
    const library = getAvatarLibrary();
    expect(library.avatars.length).toBeGreaterThanOrEqual(3);
    expect(library.avatars[0]?.lipSync.blinkTargets?.length).toBeGreaterThan(0);
  });

  it('resolves library entry by id', () => {
    const entry = getAvatarLibraryEntry('avatar-1');
    expect(entry?.name).toBe('Salama');
    expect(entry?.glbPath).toBe('/avatars/avatar-1.glb');
  });

  it('prefers explicit model URL over library id', () => {
    expect(resolveGlbUrl('https://cdn.example.com/custom.glb', 'avatar-1')).toBe(
      'https://cdn.example.com/custom.glb',
    );
  });

  it('falls back to library path when model URL missing', () => {
    expect(resolveGlbUrl(null, 'avatar-2')).toBe('/avatars/avatar-2.glb');
  });
});
