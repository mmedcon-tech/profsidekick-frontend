import type { Object3D, Mesh } from 'three';
import type { LipSyncHints } from './glbLipSync';
import { findMorphBindings } from './glbLipSync';
import type { VisemeMorphWeights } from './visemeTypes';

interface MorphBinding {
  mesh: Mesh;
  index: number;
  name: string;
}

const morphBindingCache = new WeakMap<Object3D, Map<string, MorphBinding[]>>();
const smoothMorphState = new WeakMap<Object3D, Map<string, number>>();

function getMorphBindingMap(root: Object3D, hints: LipSyncHints): Map<string, MorphBinding[]> {
  const cached = morphBindingCache.get(root);
  if (cached) return cached;

  const map = new Map<string, MorphBinding[]>();

  const addBinding = (name: string, binding: MorphBinding): void => {
    const key = name.toLowerCase();
    const list = map.get(key) ?? [];
    if (!list.some((b) => b.mesh === binding.mesh && b.index === binding.index)) {
      list.push(binding);
      map.set(key, list);
    }
  };

  for (const binding of findMorphBindings(root, hints.morphTargets)) {
    addBinding(binding.name, binding);
  }

  // RPM / MetaHuman rigs duplicate visemes on Head + Teeth — drive every copy.
  root.traverse((child) => {
    const mesh = child as Mesh & {
      morphTargetDictionary?: Record<string, number>;
      morphTargetInfluences?: number[];
    };
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
      if (!/^viseme_|^mouth|^jaw/i.test(name)) continue;
      addBinding(name, { mesh, index, name });
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
  attack = 28,
  release = 14,
): number {
  let state = smoothMorphState.get(root);
  if (!state) {
    state = new Map();
    smoothMorphState.set(root, state);
  }
  const current = state.get(key) ?? 0;
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
  audioLevel = 0,
): number {
  const bindings = getMorphBindingMap(root, hints);
  const touched = new Set<string>();
  const attack = hints.visemeAttack ?? 28;
  const release = hints.visemeRelease ?? 14;
  const intensity = hints.visemeIntensity ?? 1;

  const scaled: VisemeMorphWeights = {};
  for (const [name, value] of Object.entries(weights)) {
    scaled[name] = Math.min(1, value * intensity);
  }

  const isSimpleRig =
    hints.morphTargets?.some((t) => /mouthopen/i.test(t)) &&
    !hints.morphTargets?.some((t) => /viseme_/i.test(t));

  if (isSimpleRig && audioLevel > 0.02) {
    const baseOpen = scaled.mouthOpen ?? 0;
    const baseClose = scaled.mouthClose ?? 0;
    // Modulate vowels with loudness — never force the mouth open during closed visemes.
    if (baseOpen > 0.15) {
      scaled.mouthOpen = Math.min(1, baseOpen * (0.82 + audioLevel * 0.28));
    } else {
      scaled.mouthOpen = Math.min(baseOpen, baseOpen + audioLevel * 0.04);
      scaled.mouthClose = Math.min(1, Math.max(baseClose, baseClose + audioLevel * 0.06));
    }
  }

  for (const [name, value] of Object.entries(scaled)) {
    const list = bindings.get(name.toLowerCase());
    if (!list?.length) continue;
    const smoothed = smoothMorphValue(root, name, value, deltaSeconds, attack, release);
    for (const binding of list) {
      if (!binding.mesh.morphTargetInfluences) continue;
      binding.mesh.morphTargetInfluences[binding.index] = smoothed;
    }
    touched.add(name.toLowerCase());
  }

  for (const [name, list] of bindings) {
    if (touched.has(name)) continue;
    const smoothed = smoothMorphValue(root, name, 0, deltaSeconds, attack, release);
    for (const binding of list) {
      if (!binding.mesh.morphTargetInfluences) continue;
      binding.mesh.morphTargetInfluences[binding.index] = smoothed;
    }
  }

  return (
    scaled.jawOpen ??
    scaled.mouthOpen ??
    scaled.viseme_aa ??
    scaled.viseme_O ??
    0
  );
}

/** @internal test helper */
export function resetVisemeMorphState(root: Object3D): void {
  morphBindingCache.delete(root);
  smoothMorphState.delete(root);
}
