import { describe, expect, it } from 'vitest';
import { Bone, Group, Vector3 } from 'three';
import { alignAvatarFacingCamera } from './glbFacing';

function buildShoulderRig(facing: 'front' | 'back'): Group {
  const root = new Group();
  const left = new Bone();
  left.name = 'L_Upperarm';
  left.position.set(-0.25, 1.4, 0);
  const right = new Bone();
  right.name = 'R_Upperarm';
  right.position.set(0.25, 1.4, 0);
  const neck = new Bone();
  neck.name = 'NeckTwist02';
  neck.position.set(0, 1.65, facing === 'front' ? 0.12 : -0.12);
  root.add(left, right, neck);
  root.rotation.y = Math.PI / 2;
  return root;
}

function chestForwardZ(root: Group): number {
  const neck = root.children.find((c) => c.name === 'NeckTwist02')!;
  const left = root.children.find((c) => c.name === 'L_Upperarm')!;
  const right = root.children.find((c) => c.name === 'R_Upperarm')!;
  root.updateWorldMatrix(true, true);
  const mid = new Vector3();
  const neckPos = new Vector3();
  mid.addVectors(
    new Vector3().setFromMatrixPosition(left.matrixWorld),
    new Vector3().setFromMatrixPosition(right.matrixWorld),
  ).multiplyScalar(0.5);
  neck.getWorldPosition(neckPos);
  return neckPos.z - mid.z;
}

describe('alignAvatarFacingCamera', () => {
  it('yaws the root so the neck lies in front of the shoulders (+Z)', () => {
    const root = buildShoulderRig('front');
    alignAvatarFacingCamera(root);
    expect(chestForwardZ(root)).toBeGreaterThan(0);
  });

  it('does not leave the avatar facing away from the camera', () => {
    const root = buildShoulderRig('back');
    alignAvatarFacingCamera(root);
    expect(chestForwardZ(root)).toBeGreaterThan(0);
  });
});
