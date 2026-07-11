import { Bone, Object3D, Quaternion, Vector3 } from 'three';

/** Upper-arm bone names (case-insensitive), Mixamo / TalkingHead / RPM / Tripo style. */
const LEFT_UPPER_ARM_NAMES = [
  'mixamorig:leftarm',
  'leftarm',
  'left_arm',
  'upperarm_l',
  'arm_l',
  'leftupperarm',
  'lupperarm',
  'l_upperarm',
];

const RIGHT_UPPER_ARM_NAMES = [
  'mixamorig:rightarm',
  'rightarm',
  'right_arm',
  'upperarm_r',
  'arm_r',
  'rightupperarm',
  'rupperarm',
  'r_upperarm',
];

const LEFT_FOREARM_NAMES = [
  'mixamorig:leftforearm',
  'leftforearm',
  'left_forearm',
  'lowerarm_l',
  'forearm_l',
  'lforearm',
  'l_forearm',
];

const RIGHT_FOREARM_NAMES = [
  'mixamorig:rightforearm',
  'rightforearm',
  'right_forearm',
  'lowerarm_r',
  'forearm_r',
  'rforearm',
  'r_forearm',
];

const POSE_APPLIED = Symbol('naturalArmPoseApplied');

/** Tripo / MetaHuman exports use L_Upperarm + L_Clavicle naming. */
export function isTripoStyleRig(root: Object3D): boolean {
  let tripoUpper = false;
  root.traverse((node) => {
    if (!isBone(node)) return;
    if (normalizeBoneName(node.name) === 'lupperarm') tripoUpper = true;
  });
  return tripoUpper;
}

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

/**
 * Pick the bone segment to aim along — skips twist helpers and prefers the hand
 * on forearm chains (Tripo rigs list twist bones before the hand).
 */
function limbAimTarget(bone: Bone): Bone | null {
  const children = bone.children.filter(isBone) as Bone[];
  if (children.length === 0) return null;

  const hand = children.find(
    (child) =>
      /hand$/i.test(child.name) &&
      !/thumb|index|middle|ring|pinky/i.test(child.name),
  );
  if (hand) return hand;

  const forearm = children.find(
    (child) => /forearm/i.test(child.name) && !/twist/i.test(child.name),
  );
  if (forearm) return forearm;

  const nonTwist = children.filter((child) => !/twist/i.test(child.name));
  const pool = nonTwist.length > 0 ? nonTwist : children;

  let best: Bone | null = null;
  let bestLen = -1;
  for (const child of pool) {
    const len = child.position.lengthSq();
    if (len > bestLen) {
      bestLen = len;
      best = child;
    }
  }
  return best;
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

  for (const bone of upperArms) {
    const child = limbAimTarget(bone);
    if (!child) continue;
    bone.getWorldPosition(worldPos);
    const outwardSign = worldPos.x >= rootCenter.x ? 1 : -1;
    aimBoneAlong(bone, child, new Vector3(outwardSign * 0.18, -1, 0.08));
  }

  root.updateWorldMatrix(true, true);

  for (const bone of forearms) {
    const child = limbAimTarget(bone);
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
