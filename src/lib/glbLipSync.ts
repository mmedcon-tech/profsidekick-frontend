import type { Object3D, Mesh } from 'three';

export interface LipSyncHints {
  morphTargets?: string[];
  blinkTargets?: string[];
  jawBones?: string[];
  /**
   * Multiplier applied to the primary mouth-open morph. Stylised rigs (e.g. the
   * Roblox-style kids avatars) have a very subtle `jawOpen` shape, so a gain > 1
   * makes their speech actually readable. Defaults to 1.
   */
  mouthOpenGain?: number;
}

interface MorphBinding {
  mesh: Mesh;
  index: number;
  name: string;
}

interface JawBinding {
  boneName: string;
  restRotationX: number;
}

interface LipSyncRigCache {
  morphBindings: MorphBinding[];
  jawBindings: JawBinding[];
  mouthOpen?: MorphBinding;
  jawOpen?: MorphBinding;
  visemeAa?: MorphBinding;
  visemeO?: MorphBinding;
  mouthSmile?: MorphBinding;
}

interface SmoothState {
  current: number;
}

const DEFAULT_MORPH_NAMES = [
  'mouthOpen',
  'jawOpen',
  'viseme_aa',
  'viseme_O',
  'viseme_E',
  'mouthSmile',
  'mouthSmileLeft',
  'mouthSmileRight',
  'Mouth_Open',
  'mouth_open',
  'jaw_open',
  'Surprised',
];

const DEFAULT_BLINK_NAMES = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed'];

const DEFAULT_JAW_BONES = ['jaw', 'Jaw', 'mixamorig:Jaw', 'Jawbone'];

/** Bones that must never be treated as a jaw hinge — rotating them nods the whole head. */
const JAW_BONE_BLOCKLIST = /^(head|neck|spine|hips|armature)/i;

const rigCache = new WeakMap<Object3D, LipSyncRigCache>();
const smoothState = new WeakMap<Object3D, SmoothState>();

function isMeshWithMorphs(obj: Object3D): obj is Mesh {
  return 'morphTargetDictionary' in obj && 'morphTargetInfluences' in obj;
}

export function findMorphBindings(
  root: Object3D,
  candidates: string[] = DEFAULT_MORPH_NAMES,
): MorphBinding[] {
  const bindings: MorphBinding[] = [];
  const wanted = new Set(candidates.map((name) => name.toLowerCase()));

  root.traverse((child) => {
    if (!isMeshWithMorphs(child) || !child.morphTargetDictionary || !child.morphTargetInfluences) {
      return;
    }

    for (const [name, index] of Object.entries(child.morphTargetDictionary)) {
      if (wanted.has(name.toLowerCase())) {
        bindings.push({ mesh: child, index, name });
      }
    }
  });

  return bindings;
}

export function findBlinkBindings(
  root: Object3D,
  candidates: string[] = DEFAULT_BLINK_NAMES,
): MorphBinding[] {
  return findMorphBindings(root, candidates);
}

export function findJawBindings(
  root: Object3D,
  candidates: string[] = DEFAULT_JAW_BONES,
): JawBinding[] {
  const bindings: JawBinding[] = [];
  const wanted = new Set(candidates.map((name) => name.toLowerCase()));

  root.traverse((child) => {
    if (!child.name || !wanted.has(child.name.toLowerCase())) return;
    if (JAW_BONE_BLOCKLIST.test(child.name)) return;
    bindings.push({ boneName: child.name, restRotationX: child.rotation.x });
  });

  return bindings;
}

function pickBinding(
  bindings: MorphBinding[],
  pattern: RegExp,
): MorphBinding | undefined {
  return bindings.find((binding) => pattern.test(binding.name));
}

function buildRigCache(root: Object3D, hints: LipSyncHints): LipSyncRigCache {
  const morphBindings = findMorphBindings(root, hints.morphTargets);
  const jawBindings = findJawBindings(root, hints.jawBones);
  const cache: LipSyncRigCache = {
    morphBindings,
    jawBindings,
    mouthOpen: pickBinding(morphBindings, /^mouthopen$/i),
    jawOpen: pickBinding(morphBindings, /^jawopen$/i),
    visemeAa: pickBinding(morphBindings, /viseme_aa/i),
    visemeO: pickBinding(morphBindings, /viseme_o/i),
    mouthSmile: pickBinding(morphBindings, /mouthsmile/i),
  };
  rigCache.set(root, cache);
  return cache;
}

function getRigCache(root: Object3D, hints: LipSyncHints): LipSyncRigCache {
  return rigCache.get(root) ?? buildRigCache(root, hints);
}

/** Fast attack, slower release — mouths open quickly and close naturally. */
export function smoothLipSyncAmplitude(
  root: Object3D,
  target: number,
  deltaSeconds: number,
): number {
  const clamped = Math.max(0, Math.min(1, target));
  const state = smoothState.get(root) ?? { current: 0 };
  smoothState.set(root, state);

  const attack = 22;
  const release = 10;
  const rate = clamped > state.current ? attack : release;
  const step = 1 - Math.exp(-rate * Math.max(0, deltaSeconds));
  state.current += (clamped - state.current) * step;
  return state.current;
}

function setMorphInfluence(binding: MorphBinding | undefined, value: number): void {
  if (!binding?.mesh.morphTargetInfluences) return;
  binding.mesh.morphTargetInfluences[binding.index] = value;
}

function resetMorphInfluences(morphBindings: MorphBinding[]): void {
  for (const binding of morphBindings) {
    if (binding.mesh.morphTargetInfluences) {
      binding.mesh.morphTargetInfluences[binding.index] = 0;
    }
  }
}

export function applyLipSyncAmplitude(
  root: Object3D,
  amplitude: number,
  hints: LipSyncHints = {},
  deltaSeconds = 1 / 60,
): number {
  const rig = getRigCache(root, hints);
  const smoothed = smoothLipSyncAmplitude(root, amplitude, deltaSeconds);
  const gain = hints.mouthOpenGain ?? 1;

  resetMorphInfluences(rig.morphBindings);

  // Once we're clearly speaking, lift the opening so even quiet syllables read as
  // mouth movement; the curve keeps closed mouths fully closed during silence.
  const shaped = smoothed > 0.02 ? 0.18 + smoothed * 0.82 : 0;
  const openValue = Math.min(1, shaped * gain);

  const primaryOpen = rig.mouthOpen ?? rig.jawOpen;
  if (primaryOpen) {
    setMorphInfluence(primaryOpen, openValue);
  }

  if (rig.jawOpen && rig.jawOpen !== primaryOpen) {
    setMorphInfluence(rig.jawOpen, Math.min(1, openValue * 0.6));
  }

  if (rig.visemeAa) {
    setMorphInfluence(rig.visemeAa, smoothed * 0.62);
  }
  if (rig.visemeO) {
    setMorphInfluence(rig.visemeO, smoothed * 0.38);
  }

  if (rig.mouthSmile) {
    setMorphInfluence(rig.mouthSmile, smoothed * 0.12);
  }

  for (const binding of rig.morphBindings) {
    if (
      binding === primaryOpen ||
      binding === rig.jawOpen ||
      binding === rig.visemeAa ||
      binding === rig.visemeO ||
      binding === rig.mouthSmile
    ) {
      continue;
    }
    setMorphInfluence(binding, smoothed * 0.22);
  }

  for (const binding of rig.jawBindings) {
    root.traverse((child) => {
      if (child.name !== binding.boneName) return;
      child.rotation.x = binding.restRotationX + smoothed * 0.28;
    });
  }

  return openValue;
}

export function applyBlink(
  root: Object3D,
  blinkAmount: number,
  hints: LipSyncHints = {},
): void {
  const clamped = Math.max(0, Math.min(1, blinkAmount));
  const blinkBindings = findBlinkBindings(root, hints.blinkTargets);

  for (const binding of blinkBindings) {
    if (!binding.mesh.morphTargetInfluences) continue;
    binding.mesh.morphTargetInfluences[binding.index] = clamped;
  }
}

/** @internal test helper */
export function resetLipSyncState(root: Object3D): void {
  rigCache.delete(root);
  smoothState.delete(root);
}
