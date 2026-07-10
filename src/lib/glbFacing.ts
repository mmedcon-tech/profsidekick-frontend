import { Object3D, Vector3 } from 'three';

const LEFT_UPPER_ARM_HINTS = ['lupperarm', 'leftarm', 'leftupperarm'];
const RIGHT_UPPER_ARM_HINTS = ['rupperarm', 'rightarm', 'rightupperarm'];
const NECK_HINTS = ['head', 'necktwist02', 'necktwist01', 'neck', 'mixamorighead'];

function normalizeBoneName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBone(root: Object3D, hints: string[]): Object3D | null {
  let found: Object3D | null = null;
  root.traverse((node) => {
    if (found || !(node as { isBone?: boolean }).isBone) return;
    const normalized = normalizeBoneName(node.name);
    if (hints.some((hint) => normalized === hint || normalized.endsWith(hint))) {
      found = node;
    }
  });
  return found;
}

/**
 * Rotate the avatar root on Y so the chest faces the camera (+Z).
 * Tripo / Blender exports often ship a sideways rest orientation.
 */
export function alignAvatarFacingCamera(root: Object3D): void {
  root.updateWorldMatrix(true, true);

  const left = findBone(root, LEFT_UPPER_ARM_HINTS);
  const right = findBone(root, RIGHT_UPPER_ARM_HINTS);
  if (!left || !right) return;

  const leftPos = new Vector3();
  const rightPos = new Vector3();
  left.getWorldPosition(leftPos);
  right.getWorldPosition(rightPos);

  const shoulder = rightPos.clone().sub(leftPos);
  shoulder.y = 0;
  if (shoulder.lengthSq() < 1e-8) return;
  shoulder.normalize();

  const up = new Vector3(0, 1, 0);
  const forward = new Vector3().crossVectors(shoulder, up);
  forward.y = 0;
  if (forward.lengthSq() < 1e-8) return;
  forward.normalize();

  // Shoulder cross-product has two solutions — pick the one that points toward the neck/head.
  const neck = findBone(root, NECK_HINTS);
  if (neck) {
    const neckPos = new Vector3();
    neck.getWorldPosition(neckPos);
    const shoulderMid = leftPos.clone().add(rightPos).multiplyScalar(0.5);
    const towardHead = neckPos.sub(shoulderMid);
    towardHead.y = 0;
    if (towardHead.lengthSq() > 1e-8 && forward.dot(towardHead) < 0) {
      forward.negate();
    }
  }

  const target = new Vector3(0, 0, 1);
  const yaw = Math.atan2(forward.x, forward.z) - Math.atan2(target.x, target.z);
  root.rotation.y -= yaw;
  root.updateWorldMatrix(true, true);
}
