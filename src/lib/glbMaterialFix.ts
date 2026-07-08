import type { Mesh, Object3D } from 'three';

/**
 * Normalize cloned avatar meshes so they render reliably.
 *
 * Disables frustum culling: after we re-pose the arms, a posed single-mesh rig's
 * precomputed bounding sphere goes stale, so the renderer can wrongly cull the
 * whole model when part of it leaves the original bounds.
 *
 * Note: we deliberately do NOT touch material transparency. Genuine overlays
 * (eye ambient-occlusion, eyelashes, hair cards) are authored as `transparent`
 * on purpose — forcing them opaque renders them as solid dark blocks (e.g.
 * black eyes on the Avaturn-exported rigs).
 */
export function normalizeAvatarMeshes(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as Mesh & { isMesh?: boolean };
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
  });
}
