import { describe, expect, it } from 'vitest';
import { inferLipSyncRigStyle, textToVisemeSequence, visemeToMorphWeights } from './visemeMapping';

describe('textToVisemeSequence', () => {
  it('maps vowels and bilabial stops to distinct visemes', () => {
    expect(textToVisemeSequence('a')).toEqual(['aa']);
    expect(textToVisemeSequence('mom')).toContain('PP');
    expect(textToVisemeSequence('see')).toContain('SS');
  });

  it('handles common digraphs', () => {
    expect(textToVisemeSequence('think')).toContain('TH');
    expect(textToVisemeSequence('shout')).toContain('SS');
  });
});

describe('visemeToMorphWeights', () => {
  it('uses ARKit morph names for adult rigs', () => {
    const weights = visemeToMorphWeights('aa', 'arkit');
    expect(weights.viseme_aa).toBeGreaterThan(0.8);
  });

  it('uses roblox jawOpen for kids rigs', () => {
    const weights = visemeToMorphWeights('aa', 'roblox', 1.6);
    expect(weights.jawOpen).toBe(1);
  });

  it('closes the mouth for bilabial stops on kids rigs', () => {
    const weights = visemeToMorphWeights('PP', 'roblox');
    expect(weights.mouthPucker).toBeGreaterThan(0.8);
    expect(weights.jawOpen).toBeLessThan(0.1);
  });
});

describe('inferLipSyncRigStyle', () => {
  it('detects arkit vs roblox from morph target hints', () => {
    expect(inferLipSyncRigStyle(['viseme_aa', 'mouthOpen'])).toBe('arkit');
    expect(inferLipSyncRigStyle(['jawOpen', 'mouthPucker'])).toBe('roblox');
  });
});
