import { describe, expect, it } from 'vitest';
import {
  getAvatarLibrary,
  getAvatarLibraryEntry,
  getAvatarLibraryEntryByName,
  resolveGlbUrl,
} from './avatarLibrary';

describe('avatarLibrary', () => {
  it('loads manifest with featured avatars including lip-sync hints', () => {
    const library = getAvatarLibrary();
    expect(library.avatars.length).toBeGreaterThanOrEqual(2);
    expect(library.avatars[0]?.lipSync.blinkTargets?.length).toBeGreaterThan(0);
    expect(library.avatars[0]?.thumbnailPath).toContain('/images/');
  });

  it('resolves library entry by id', () => {
    const entry = getAvatarLibraryEntry('avatar-1');
    expect(entry?.name).toBe('Salama');
    expect(entry?.glbPath).toBe('/avatars/avatar-1.glb');
  });

  it('resolves library entry by name', () => {
    expect(getAvatarLibraryEntryByName('Sultan')?.gender).toBe('male');
    expect(getAvatarLibraryEntryByName('Salama')?.gender).toBe('female');
  });

  it('prefers explicit model URL over library id', () => {
    expect(resolveGlbUrl('https://cdn.example.com/custom.glb', 'avatar-1')).toBe(
      'https://cdn.example.com/custom.glb',
    );
  });

  it('falls back to library path when model URL missing', () => {
    expect(resolveGlbUrl(null, 'avatar-2')).toBe('/avatars/avatar-2.glb');
  });

  it('includes kids avatars as separate library entries', () => {
    expect(getAvatarLibraryEntry('kids-female')?.glbPath).toBe('/avatars/kids-female.glb');
    expect(getAvatarLibraryEntry('kids-male')?.glbPath).toBe('/avatars/kids-male.glb');
    expect(getAvatarLibraryEntryByName('Layla')?.tags).toContain('kids');
    expect(getAvatarLibraryEntryByName('Omar')?.tags).toContain('kids');
  });
});
