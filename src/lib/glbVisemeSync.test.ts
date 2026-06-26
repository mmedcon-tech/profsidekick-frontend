import { describe, expect, it } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { applyVisemeMorphWeights, resetVisemeMorphState } from './glbVisemeSync';

describe('applyVisemeMorphWeights', () => {
  it('drives named morph targets from viseme weights', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    mesh.morphTargetDictionary = { jawOpen: 0, mouthPucker: 1 };
    mesh.morphTargetInfluences = [0, 0];
    root.add(mesh);
    resetVisemeMorphState(root);

    for (let i = 0; i < 4; i += 1) {
      applyVisemeMorphWeights(
        root,
        { jawOpen: 0.9, mouthPucker: 0.1 },
        { morphTargets: ['jawOpen', 'mouthPucker'] },
        1 / 30,
      );
    }

    expect(mesh.morphTargetInfluences?.[0]).toBeGreaterThan(0.5);
    expect(mesh.morphTargetInfluences?.[1]).toBeLessThan(0.3);
  });
});
