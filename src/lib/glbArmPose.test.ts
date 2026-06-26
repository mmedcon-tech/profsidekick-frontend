import { describe, expect, it } from 'vitest';
import { Bone, Group } from 'three';
import { applyNaturalArmPose, boneMatchesSide } from './glbArmPose';

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
  it('rotates upper-arm bones away from T-pose', () => {
    const root = new Group();
    const leftArm = new Bone();
    leftArm.name = 'mixamorig:LeftArm';
    const rightArm = new Bone();
    rightArm.name = 'mixamorig:RightArm';
    root.add(leftArm, rightArm);

    const leftBefore = leftArm.quaternion.clone();
    const rightBefore = rightArm.quaternion.clone();

    applyNaturalArmPose(root);

    expect(leftArm.quaternion.equals(leftBefore)).toBe(false);
    expect(rightArm.quaternion.equals(rightBefore)).toBe(false);
  });

  it('only applies once per model root', () => {
    const root = new Group();
    const leftArm = new Bone();
    leftArm.name = 'LeftArm';
    root.add(leftArm);

    applyNaturalArmPose(root);
    const afterFirst = leftArm.quaternion.clone();
    applyNaturalArmPose(root);

    expect(leftArm.quaternion.equals(afterFirst)).toBe(true);
  });
});
