import type { Object3D, SkinnedMesh, Mesh } from 'three';

export interface LipSyncHints {
  morphTargets?: string[];
  blinkTargets?: string[];
  jawBones?: string[];
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

const DEFAULT_MORPH_NAMES = [
  'mouthOpen',
  'jawOpen',
  'viseme_aa',
  'viseme_O',
  'viseme_E',
  'Mouth_Open',
  'mouth_open',
  'jaw_open',
  'Surprised',
];

const DEFAULT_BLINK_NAMES = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed'];

const DEFAULT_JAW_BONES = ['jaw', 'Jaw', 'mixamorig:Jaw', 'Jawbone'];

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
    bindings.push({ boneName: child.name, restRotationX: child.rotation.x });
  });

  return bindings;
}

function resetMorphInfluences(root: Object3D, morphBindings: MorphBinding[]): void {
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
): void {
  const clamped = Math.max(0, Math.min(1, amplitude));
  const morphBindings = findMorphBindings(root, hints.morphTargets);
  const jawBindings = findJawBindings(root, hints.jawBones);

  resetMorphInfluences(root, morphBindings);

  const mouthOpen = morphBindings.find((b) => /mouthopen|jawopen|surprised/i.test(b.name));
  const viseme = morphBindings.find((b) => /viseme_aa|viseme_o/i.test(b.name));

  if (mouthOpen?.mesh.morphTargetInfluences) {
    mouthOpen.mesh.morphTargetInfluences[mouthOpen.index] = clamped * 0.9;
  }
  if (viseme?.mesh.morphTargetInfluences) {
    viseme.mesh.morphTargetInfluences[viseme.index] = clamped * 0.55;
  }

  for (const binding of morphBindings) {
    if (binding === mouthOpen || binding === viseme) continue;
    if (binding.mesh.morphTargetInfluences) {
      binding.mesh.morphTargetInfluences[binding.index] = clamped * 0.35;
    }
  }

  for (const binding of jawBindings) {
    root.traverse((child) => {
      if (child.name !== binding.boneName) return;
      child.rotation.x = binding.restRotationX + clamped * 0.35;
    });
  }

  if (morphBindings.length === 0 && jawBindings.length === 0) {
    root.rotation.x = -clamped * 0.02;
  }
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
    if (/left/i.test(binding.name)) {
      binding.mesh.morphTargetInfluences[binding.index] = clamped;
    } else if (/right/i.test(binding.name)) {
      binding.mesh.morphTargetInfluences[binding.index] = clamped;
    } else {
      binding.mesh.morphTargetInfluences[binding.index] = clamped;
    }
  }
}
