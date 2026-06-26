import type { Material, Mesh, Object3D } from 'three';

interface FixableMaterial extends Material {
  opacity: number;
  alphaMap?: unknown;
  depthWrite: boolean;
}

function fixMaterial(material: Material): void {
  const mat = material as FixableMaterial;
  // Some GLB exports (e.g. the kids rigs) flag fully-opaque character materials
  // as transparent with depthWrite off. When their base texture carries an
  // unused/zero alpha channel, the mesh renders completely invisible. If there is
  // no real alpha source and opacity is full, force the material back to opaque.
  if (mat.transparent && mat.opacity >= 1 && !mat.alphaMap) {
    mat.transparent = false;
    mat.depthWrite = true;
    mat.needsUpdate = true;
  }
}

/**
 * Normalize cloned avatar meshes so they render reliably:
 *  - disable frustum culling (posed single-mesh rigs cull themselves when their
 *    precomputed bounding sphere goes stale),
 *  - repair materials mistakenly exported as transparent.
 */
export function normalizeAvatarMeshes(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as Mesh & { isMesh?: boolean };
    if (!mesh.isMesh) return;

    mesh.frustumCulled = false;

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(fixMaterial);
    } else if (mesh.material) {
      fixMaterial(mesh.material);
    }
  });
}
