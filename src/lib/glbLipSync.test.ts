import { describe, expect, it } from 'vitest';
import { Bone, Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import {
  applyLipSyncAmplitude,
  discoverLipSyncMorphBindings,
  findJawBindings,
  resetLipSyncState,
  smoothLipSyncAmplitude,
} from './glbLipSync';

describe('findJawBindings', () => {
  it('does not treat head or neck bones as jaw hinges', () => {
    const root = new Group();
    const head = new Bone();
    head.name = 'Head';
    const jaw = new Bone();
    jaw.name = 'jaw';
    root.add(head, jaw);

    const bindings = findJawBindings(root, ['Head', 'head', 'jaw', 'Jaw']);
    expect(bindings.map((binding) => binding.boneName)).toEqual(['jaw']);
  });
});

describe('smoothLipSyncAmplitude', () => {
  it('opens quickly and releases more slowly', () => {
    const root = new Group();
    resetLipSyncState(root);

    const opened = smoothLipSyncAmplitude(root, 1, 1 / 60);
    expect(opened).toBeGreaterThan(0.2);

    const held = smoothLipSyncAmplitude(root, 1, 1 / 60);
    expect(held).toBeGreaterThan(opened);

    const closing = smoothLipSyncAmplitude(root, 0, 1 / 60);
    expect(closing).toBeLessThan(held);
    expect(closing).toBeGreaterThan(0);
  });
});

describe('applyLipSyncAmplitude', () => {
  it('drives jawOpen morph targets without rotating the model root', () => {
    const root = new Group();
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial(),
    );
    mesh.morphTargetDictionary = { jawOpen: 0 };
    mesh.morphTargetInfluences = [0];
    root.add(mesh);

    const beforeX = root.rotation.x;
    applyLipSyncAmplitude(root, 1, { morphTargets: ['jawOpen'] }, 1 / 30);
    applyLipSyncAmplitude(root, 1, { morphTargets: ['jawOpen'] }, 1 / 30);

    expect(mesh.morphTargetInfluences?.[0]).toBeGreaterThan(0.15);
    expect(root.rotation.x).toBe(beforeX);
  });

  it('amplifies mouth opening via mouthOpenGain for stylised rigs', () => {
    function buildRig(): { root: Group; mesh: Mesh } {
      const root = new Group();
      const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
      mesh.morphTargetDictionary = { jawOpen: 0 };
      mesh.morphTargetInfluences = [0];
      root.add(mesh);
      return { root, mesh };
    }

    const base = buildRig();
    const gained = buildRig();
    resetLipSyncState(base.root);
    resetLipSyncState(gained.root);

    for (let i = 0; i < 3; i += 1) {
      applyLipSyncAmplitude(base.root, 0.4, { morphTargets: ['jawOpen'] }, 1 / 30);
      applyLipSyncAmplitude(
        gained.root,
        0.4,
        { morphTargets: ['jawOpen'], mouthOpenGain: 1.6 },
        1 / 30,
      );
    }

    expect(gained.mesh.morphTargetInfluences?.[0]).toBeGreaterThan(
      base.mesh.morphTargetInfluences?.[0] ?? 0,
    );
  });

  it('discovers mouth morphs when explicit hints are empty', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    mesh.morphTargetDictionary = { Mouth_Open: 0, eyeBlinkLeft: 1 };
    mesh.morphTargetInfluences = [0, 0];
    root.add(mesh);

    const discovered = discoverLipSyncMorphBindings(root);
    expect(discovered.map((binding) => binding.name)).toContain('Mouth_Open');
    expect(discovered.map((binding) => binding.name)).not.toContain('eyeBlinkLeft');
  });

  it('keeps the mouth fully closed during silence', () => {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    mesh.morphTargetDictionary = { jawOpen: 0 };
    mesh.morphTargetInfluences = [0.5];
    root.add(mesh);
    resetLipSyncState(root);

    for (let i = 0; i < 30; i += 1) {
      applyLipSyncAmplitude(root, 0, { morphTargets: ['jawOpen'] }, 1 / 30);
    }

    expect(mesh.morphTargetInfluences?.[0]).toBeCloseTo(0, 2);
  });
});
