import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { AVATAR_TARGET_HEIGHT, normalizeAvatarHeight } from './glbNormalize';

function makeBoxModel(size: number, offsetY = 0): Group {
  const root = new Group();
  const mesh = new Mesh(new BoxGeometry(size, size, size), new MeshBasicMaterial());
  mesh.position.y = offsetY;
  root.add(mesh);
  return root;
}

describe('normalizeAvatarHeight', () => {
  it('scales a tiny (cm-exported) model up to the target height', () => {
    const root = makeBoxModel(0.017);
    normalizeAvatarHeight(root);
    expect(root.scale.y).toBeCloseTo(AVATAR_TARGET_HEIGHT / 0.017, 1);
  });

  it('scales a large model down to the target height', () => {
    const root = makeBoxModel(2.2);
    normalizeAvatarHeight(root);
    expect(root.scale.y).toBeCloseTo(AVATAR_TARGET_HEIGHT / 2.2, 3);
  });

  it('places the model feet at y = 0 and centers it on X/Z', () => {
    const root = makeBoxModel(1, 5);
    normalizeAvatarHeight(root, 2);
    root.updateMatrixWorld(true);
    const mesh = root.children[0] as Mesh;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!.clone();
    box.applyMatrix4(mesh.matrixWorld);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
  });

  it('leaves a zero-height model untouched instead of producing NaN scale', () => {
    const root = new Group();
    normalizeAvatarHeight(root);
    expect(Number.isFinite(root.scale.y)).toBe(true);
    expect(root.scale.y).toBe(1);
  });
});
