import { Box3, Vector3, type Object3D } from 'three';

/**
 * Target rendered height (in world units) that every avatar is scaled to.
 *
 * Source GLBs are authored at wildly different scales — the adult rigs are
 * ~2.2 units tall, while the Roblox-style kids rigs ship with an `Armature`
 * node scaled to 0.01 (a centimetre→metre export), making them render only
 * ~0.017 units tall. Without normalisation the kids models fall inside the
 * camera near-plane / OrbitControls min-distance and are effectively invisible.
 */
export const AVATAR_TARGET_HEIGHT = 1.8;

/**
 * Uniformly scales `model` so its measured height equals {@link AVATAR_TARGET_HEIGHT}
 * and recenters it on X/Z with its feet at y = 0. Must be called with the model's
 * world matrices computed (it calls `updateMatrixWorld` internally), so it works
 * both inside and outside the render loop.
 */
export function normalizeAvatarHeight(
  model: Object3D,
  targetHeight: number = AVATAR_TARGET_HEIGHT,
): void {
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const size = new Vector3();
  box.getSize(size);

  if (size.y > 1e-6 && Number.isFinite(size.y)) {
    const scale = targetHeight / size.y;
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
  }

  const fitted = new Box3().setFromObject(model);
  const center = new Vector3();
  fitted.getCenter(center);
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= fitted.min.y;
  model.updateMatrixWorld(true);
}
