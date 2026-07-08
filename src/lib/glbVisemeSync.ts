import type { Object3D, Mesh } from 'three';
import type { LipSyncHints } from './glbLipSync';
import { findMorphBindings } from './glbLipSync';
import type { VisemeMorphWeights } from './visemeTypes';

interface MorphBinding {
  mesh: Mesh;
  index: number;
  name: string;
}

const morphBindingCache = new WeakMap<Object3D, Map<string, MorphBinding>>();
const smoothMorphState = new WeakMap<Object3D, Map<string, number>>();

function getMorphBindingMap(root: Object3D, hints: LipSyncHints): Map<string, MorphBinding> {
  const cached = morphBindingCache.get(root);
  if (cached) return cached;

  const map = new Map<string, MorphBinding>();
  const allNames = new Set<string>();

  for (const binding of findMorphBindings(root, hints.morphTargets)) {
    map.set(binding.name.toLowerCase(), binding);
    allNames.add(binding.name);
  }

  // Also index every morph on meshes that carry lip-sync targets (ARKit rigs spread
  // visemes across Head_Mesh / Teeth_Mesh).
  root.traverse((child) => {
    const mesh = child as Mesh & {
      morphTargetDictionary?: Record<string, number>;
      morphTargetInfluences?: number[];
    };
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
      const lower = name.toLowerCase();
      if (map.has(lower)) continue;
      if (/^viseme_|^mouth|^jaw/i.test(name)) {
        map.set(lower, { mesh, index, name });
      }
    }
  });

  morphBindingCache.set(root, map);
  return map;
}

function smoothMorphValue(
  root: Object3D,
  key: string,
  target: number,
  deltaSeconds: number,
): number {
  let state = smoothMorphState.get(root);
  if (!state) {
    state = new Map();
    smoothMorphState.set(root, state);
  }
  const current = state.get(key) ?? 0;
  const attack = 28;
  const release = 14;
  const rate = target > current ? attack : release;
  const step = 1 - Math.exp(-rate * Math.max(0, deltaSeconds));
  const next = current + (target - current) * step;
  state.set(key, next);
  return next;
}

/**
 * Drive lip-sync morph targets from a viseme weight map (synced to speech).
 * Returns the primary mouth-open influence for diagnostics.
 */
export function applyVisemeMorphWeights(
  root: Object3D,
  weights: VisemeMorphWeights,
  hints: LipSyncHints = {},
  deltaSeconds = 1 / 60,
): number {
  const bindings = getMorphBindingMap(root, hints);
  const touched = new Set<string>();

  for (const [name, value] of Object.entries(weights)) {
    const binding = bindings.get(name.toLowerCase());
    if (!binding?.mesh.morphTargetInfluences) continue;
    const smoothed = smoothMorphValue(root, name, value, deltaSeconds);
    binding.mesh.morphTargetInfluences[binding.index] = smoothed;
    touched.add(name.toLowerCase());
  }

  // Ease untouched morphs back to rest.
  for (const [name, binding] of bindings) {
    if (touched.has(name)) continue;
    if (!binding.mesh.morphTargetInfluences) continue;
    const smoothed = smoothMorphValue(root, name, 0, deltaSeconds);
    binding.mesh.morphTargetInfluences[binding.index] = smoothed;
  }

  const open =
    weights.jawOpen ??
    weights.mouthOpen ??
    weights.viseme_aa ??
    weights.viseme_O ??
    0;
  return open;
}

/** @internal test helper */
export function resetVisemeMorphState(root: Object3D): void {
  morphBindingCache.delete(root);
  smoothMorphState.delete(root);
}
