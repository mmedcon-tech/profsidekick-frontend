import { describe, expect, it } from 'vitest';
import { Bone, Group, Vector3 } from 'three';
import { applyNaturalArmPose, boneMatchesSide } from './glbArmPose';

/** Build a horizontal (T-pose) arm chain: upper-arm → forearm → hand pointing outward along X. */
function buildArm(
  root: Group,
  side: 'left' | 'right',
): { upper: Bone; forearm: Bone; hand: Bone } {
  const outward = side === 'left' ? -1 : 1;
  const upper = new Bone();
  upper.name = side === 'left' ? 'LeftArm' : 'RightArm';
  upper.position.set(outward * 0.2, 1.4, 0);

  const forearm = new Bone();
  forearm.name = side === 'left' ? 'LeftForeArm' : 'RightForeArm';
  forearm.position.set(outward * 0.3, 0, 0);

  const hand = new Bone();
  hand.name = side === 'left' ? 'LeftHand' : 'RightHand';
  hand.position.set(outward * 0.25, 0, 0);

  forearm.add(hand);
  upper.add(forearm);
  root.add(upper);
  return { upper, forearm, hand };
}

function worldDir(from: Bone, to: Bone): Vector3 {
  const a = new Vector3();
  const b = new Vector3();
  from.getWorldPosition(a);
  to.getWorldPosition(b);
  return b.sub(a).normalize();
}

describe('boneMatchesSide', () => {
  it('recognises Mixamo upper-arm bones', () => {
    expect(boneMatchesSide('mixamorig:LeftArm', 'left', 'upper')).toBe(true);
    expect(boneMatchesSide('mixamorig:RightArm', 'right', 'upper')).toBe(true);
  });

  it('recognises forearm bones', () => {
    expect(boneMatchesSide('mixamorig:LeftForeArm', 'left', 'forearm')).toBe(true);
    expect(boneMatchesSide('RightForeArm', 'right', 'forearm')).toBe(true);
  });

  it('does not match unrelated bones', () => {
    expect(boneMatchesSide('mixamorig:Hips', 'left', 'upper')).toBe(false);
    expect(boneMatchesSide('LeftHand', 'left', 'upper')).toBe(false);
  });
});

describe('applyNaturalArmPose', () => {
  it('aims horizontal T-pose arms downward on both sides', () => {
    const root = new Group();
    const left = buildArm(root, 'left');
    const right = buildArm(root, 'right');

    applyNaturalArmPose(root);
    root.updateWorldMatrix(true, true);

    // Upper arms should now point predominantly downward (-Y).
    expect(worldDir(left.upper, left.forearm).y).toBeLessThan(-0.8);
    expect(worldDir(right.upper, right.forearm).y).toBeLessThan(-0.8);
    // Forearms hang nearly straight down too.
    expect(worldDir(left.forearm, left.hand).y).toBeLessThan(-0.8);
    expect(worldDir(right.forearm, right.hand).y).toBeLessThan(-0.8);
  });

  it('only applies once per model root', () => {
    const root = new Group();
    const { upper } = buildArm(root, 'left');

    applyNaturalArmPose(root);
    const afterFirst = upper.quaternion.clone();
    applyNaturalArmPose(root);

    expect(upper.quaternion.equals(afterFirst)).toBe(true);
  });
});
