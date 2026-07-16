import { describe, expect, it } from 'vitest';
import { Object3D, Mesh } from 'three';
import { applyBlink, applyLipSyncAmplitude, findMorphBindings } from './glbLipSync';

describe('glbLipSync', () => {
  it('drives morph target influence from amplitude', () => {
    const mesh = new Mesh();
    mesh.morphTargetDictionary = { mouthOpen: 0 };
    mesh.morphTargetInfluences = [0];
    const root = new Object3D();
    root.add(mesh);

    applyLipSyncAmplitude(root, 0.5, { morphTargets: ['mouthOpen'] });

    expect(mesh.morphTargetInfluences?.[0]).toBeCloseTo(0.45);
  });

  it('applies blink morph targets', () => {
    const mesh = new Mesh();
    mesh.morphTargetDictionary = { eyeBlinkLeft: 0 };
    mesh.morphTargetInfluences = [0];
    const root = new Object3D();
    root.add(mesh);

    applyBlink(root, 0.8, { blinkTargets: ['eyeBlinkLeft'] });
    expect(mesh.morphTargetInfluences?.[0]).toBeCloseTo(0.8);
  });

  it('finds morph bindings by candidate name', () => {
    const mesh = new Mesh();
    mesh.morphTargetDictionary = { jawOpen: 1 };
    mesh.morphTargetInfluences = [0, 0];
    const root = new Object3D();
    root.add(mesh);

    const bindings = findMorphBindings(root, ['jawOpen']);
    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.index).toBe(1);
  });
});
