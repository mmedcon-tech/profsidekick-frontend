import { Bone, Object3D, Quaternion, Vector3 } from 'three';

/** Upper-arm bone names (case-insensitive), Mixamo / TalkingHead / RPM style. */
const LEFT_UPPER_ARM_NAMES = [
  'mixamorig:leftarm',
  'leftarm',
  'left_arm',
  'upperarm_l',
  'arm_l',
  'leftupperarm',
];

const RIGHT_UPPER_ARM_NAMES = [
  'mixamorig:rightarm',
  'rightarm',
  'right_arm',
  'upperarm_r',
  'arm_r',
  'rightupperarm',
];

const LEFT_FOREARM_NAMES = [
  'mixamorig:leftforearm',
  'leftforearm',
  'left_forearm',
  'lowerarm_l',
  'forearm_l',
];

const RIGHT_FOREARM_NAMES = [
  'mixamorig:rightforearm',
  'rightforearm',
  'right_forearm',
  'lowerarm_r',
  'forearm_r',
];

const POSE_APPLIED = Symbol('naturalArmPoseApplied');

function normalizeBoneName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesBoneName(name: string, candidates: string[]): boolean {
  const normalized = normalizeBoneName(name);
  return candidates.some((candidate) => normalized === normalizeBoneName(candidate));
}

function isBone(node: Object3D): node is Bone {
  return (node as Bone).isBone === true;
}

function firstChildBone(bone: Bone): Bone | null {
  for (const child of bone.children) {
    if (isBone(child)) return child as Bone;
  }
  return null;
}

/**
 * Rotate `bone` in world space so the direction toward `child` aligns with
 * `targetDir`. Because it works from the actual current bone-to-child vector,
 * it produces the same natural result whether the rig rests in a T-pose
 * (adult rigs) or an A-pose (the Roblox-style kids rigs).
 */
function aimBoneAlong(bone: Bone, child: Bone, targetDir: Vector3): void {
  bone.updateWorldMatrix(true, false);

  const boneWorld = new Vector3();
  const childWorld = new Vector3();
  bone.getWorldPosition(boneWorld);
  child.getWorldPosition(childWorld);

  const currentDir = childWorld.sub(boneWorld);
  if (currentDir.lengthSq() < 1e-8) return;
  currentDir.normalize();

  const worldDelta = new Quaternion().setFromUnitVectors(
    currentDir,
    targetDir.clone().normalize(),
  );

  const oldWorldQuat = new Quaternion();
  bone.getWorldQuaternion(oldWorldQuat);
  const newWorldQuat = worldDelta.multiply(oldWorldQuat);

  const parentWorldQuat = new Quaternion();
  if (bone.parent) {
    bone.parent.getWorldQuaternion(parentWorldQuat);
  }
  bone.quaternion.copy(parentWorldQuat.invert().multiply(newWorldQuat));
  bone.updateWorldMatrix(false, true);
}

/**
 * Lower stretched arms so they rest naturally at the avatar's sides.
 * Safe to call once per cloned model; repeated calls are ignored.
 */
export function applyNaturalArmPose(root: Object3D): void {
  const tagged = root as Object3D & { [POSE_APPLIED]?: boolean };
  if (tagged[POSE_APPLIED]) return;

  root.updateWorldMatrix(true, true);

  const rootCenter = new Vector3();
  root.getWorldPosition(rootCenter);

  const upperArms: Bone[] = [];
  const forearms: Bone[] = [];
  root.traverse((node) => {
    if (!isBone(node)) return;
    if (
      matchesBoneName(node.name, LEFT_UPPER_ARM_NAMES) ||
      matchesBoneName(node.name, RIGHT_UPPER_ARM_NAMES)
    ) {
      upperArms.push(node);
    } else if (
      matchesBoneName(node.name, LEFT_FOREARM_NAMES) ||
      matchesBoneName(node.name, RIGHT_FOREARM_NAMES)
    ) {
      forearms.push(node);
    }
  });

  const worldPos = new Vector3();

  // Upper arms: aim down, leaning slightly outward + forward so they clear the torso.
  for (const bone of upperArms) {
    const child = firstChildBone(bone);
    if (!child) continue;
    bone.getWorldPosition(worldPos);
    const outwardSign = worldPos.x >= rootCenter.x ? 1 : -1;
    aimBoneAlong(bone, child, new Vector3(outwardSign * 0.18, -1, 0.08));
  }

  // Re-aiming the upper arms moved the forearms; refresh world matrices first.
  root.updateWorldMatrix(true, true);

  // Forearms: hang nearly straight down so hands rest beside the thighs.
  for (const bone of forearms) {
    const child = firstChildBone(bone);
    if (!child) continue;
    bone.getWorldPosition(worldPos);
    const outwardSign = worldPos.x >= rootCenter.x ? 1 : -1;
    aimBoneAlong(bone, child, new Vector3(outwardSign * 0.06, -1, 0.05));
  }

  tagged[POSE_APPLIED] = true;
}

/** @internal test helper */
export function boneMatchesSide(
  name: string,
  side: 'left' | 'right',
  segment: 'upper' | 'forearm',
): boolean {
  if (side === 'left' && segment === 'upper') return matchesBoneName(name, LEFT_UPPER_ARM_NAMES);
  if (side === 'right' && segment === 'upper') return matchesBoneName(name, RIGHT_UPPER_ARM_NAMES);
  if (side === 'left' && segment === 'forearm') return matchesBoneName(name, LEFT_FOREARM_NAMES);
  return matchesBoneName(name, RIGHT_FOREARM_NAMES);
}
