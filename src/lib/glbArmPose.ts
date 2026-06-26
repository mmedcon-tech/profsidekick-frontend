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

/**
 * How far to drop the upper arms from the horizontal T-pose, in radians.
 * ~80° leaves a small natural gap between arm and torso instead of clamping
 * the arm dead-straight against the body.
 */
const UPPER_ARM_DROP = 1.4;
/** Slight forearm follow so the lower arm hangs straight rather than kinking out. */
const FOREARM_DROP = 0.12;

/** World "depth" axis — rotating an outstretched arm about it swings the arm down in the frontal plane. */
const WORLD_Z = new Vector3(0, 0, 1);

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
 * Rotate a bone by `angle` around a world-space `axis`, preserving its position.
 * Converting the world rotation into the bone's parent space makes the pose
 * independent of each rig's local bone orientation.
 */
function rotateBoneAroundWorldAxis(bone: Bone, axis: Vector3, angle: number): void {
  const parentWorldQuat = new Quaternion();
  if (bone.parent) {
    bone.parent.getWorldQuaternion(parentWorldQuat);
  }
  const parentWorldQuatInverse = parentWorldQuat.clone().invert();
  const worldDelta = new Quaternion().setFromAxisAngle(axis, angle);

  // q_new = P⁻¹ · R · P · q
  bone.quaternion.premultiply(
    parentWorldQuatInverse.multiply(worldDelta).multiply(parentWorldQuat),
  );
}

/**
 * Lower stretched T-pose arms so they rest naturally at the avatar's sides.
 * Safe to call once per cloned model; repeated calls are ignored.
 */
export function applyNaturalArmPose(root: Object3D): void {
  const tagged = root as Object3D & { [POSE_APPLIED]?: boolean };
  if (tagged[POSE_APPLIED]) return;

  root.updateWorldMatrix(true, true);

  // Reference X so we can tell which side each arm is on regardless of model centring.
  const rootCenter = new Vector3();
  root.getWorldPosition(rootCenter);

  const worldPos = new Vector3();
  root.traverse((node) => {
    if (!isBone(node)) return;

    const isLeftUpper = matchesBoneName(node.name, LEFT_UPPER_ARM_NAMES);
    const isRightUpper = matchesBoneName(node.name, RIGHT_UPPER_ARM_NAMES);
    const isLeftForearm = matchesBoneName(node.name, LEFT_FOREARM_NAMES);
    const isRightForearm = matchesBoneName(node.name, RIGHT_FOREARM_NAMES);

    if (!isLeftUpper && !isRightUpper && !isLeftForearm && !isRightForearm) return;

    node.getWorldPosition(worldPos);
    // Arms on the +X side swing down with a negative Z rotation; -X side with positive.
    const sideSign = worldPos.x >= rootCenter.x ? -1 : 1;

    if (isLeftUpper || isRightUpper) {
      rotateBoneAroundWorldAxis(node, WORLD_Z, sideSign * UPPER_ARM_DROP);
    } else {
      rotateBoneAroundWorldAxis(node, WORLD_Z, sideSign * FOREARM_DROP);
    }
  });

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
