import { describe, expect, it } from 'vitest';
import { Bone, Group, Vector3 } from 'three';
import { applyNaturalArmPose, boneMatchesSide, isTripoStyleRig } from './glbArmPose';

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

  it('recognises Tripo / MetaHuman upper-arm bones', () => {
    expect(boneMatchesSide('L_Upperarm', 'left', 'upper')).toBe(true);
    expect(boneMatchesSide('R_Upperarm', 'right', 'upper')).toBe(true);
    expect(boneMatchesSide('L_Forearm', 'left', 'forearm')).toBe(true);
    expect(boneMatchesSide('R_Forearm', 'right', 'forearm')).toBe(true);
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

  it('aims Tripo-style L_/R_ arm chains downward', () => {
    const root = new Group();
    const outward = (side: 'left' | 'right') => (side === 'left' ? -1 : 1);

    const buildTripoArm = (side: 'left' | 'right') => {
      const prefix = side === 'left' ? 'L' : 'R';
      const sign = outward(side);
      const upper = new Bone();
      upper.name = `${prefix}_Upperarm`;
      upper.position.set(sign * 0.2, 1.4, 0);
      const forearm = new Bone();
      forearm.name = `${prefix}_Forearm`;
      forearm.position.set(sign * 0.3, 0, 0);
      const hand = new Bone();
      hand.name = `${prefix}_Hand`;
      hand.position.set(sign * 0.25, 0, 0);
      forearm.add(hand);
      upper.add(forearm);
      root.add(upper);
      return { upper, forearm, hand };
    };

    const left = buildTripoArm('left');
    const right = buildTripoArm('right');
    applyNaturalArmPose(root);
    root.updateWorldMatrix(true, true);

    expect(worldDir(left.upper, left.forearm).y).toBeLessThan(-0.8);
    expect(worldDir(right.upper, right.forearm).y).toBeLessThan(-0.8);
  });

  it('aims forearms toward the hand when twist bones are listed first', () => {
    const root = new Group();
    const upper = new Bone();
    upper.name = 'L_Upperarm';
    upper.position.set(-0.2, 1.4, 0);

    const forearm = new Bone();
    forearm.name = 'L_Forearm';
    forearm.position.set(0, -0.3, 0);

    const twist = new Bone();
    twist.name = 'L_ForearmTwist01';
    twist.position.set(0, -0.05, 0);

    const hand = new Bone();
    hand.name = 'L_Hand';
    hand.position.set(0, -0.25, 0);

    forearm.add(twist, hand);
    upper.add(forearm);
    root.add(upper);

    applyNaturalArmPose(root);
    root.updateWorldMatrix(true, true);

    expect(worldDir(forearm, hand).y).toBeLessThan(-0.8);
  });

  it('detects Tripo rigs by L_Upperarm bone naming', () => {
    const root = new Group();
    const bone = new Bone();
    bone.name = 'L_Upperarm';
    root.add(bone);
    expect(isTripoStyleRig(root)).toBe(true);

    const rpm = new Group();
    const leftArm = new Bone();
    leftArm.name = 'LeftArm';
    rpm.add(leftArm);
    expect(isTripoStyleRig(rpm)).toBe(false);
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
