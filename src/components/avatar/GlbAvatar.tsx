"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';
import { applyNaturalArmPose } from '@/lib/glbArmPose';
import { normalizeAvatarMeshes } from '@/lib/glbMaterialFix';
import { normalizeAvatarHeight } from '@/lib/glbNormalize';
import { applyBlink, applyLipSyncAmplitude, type LipSyncHints } from '@/lib/glbLipSync';
import { getAvatarLibrary } from '@/lib/avatarLibrary';

interface GlbModelProps {
  url: string;
  amplitude: number;
  isSpeaking: boolean;
}

function resolveLipSyncHints(url: string): LipSyncHints | undefined {
  const entry = getAvatarLibrary().avatars.find((avatar) => url.endsWith(avatar.glbPath));
  return entry?.lipSync;
}

function Model({ url, amplitude, isSpeaking }: GlbModelProps) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const blinkPhase = useRef(0);

  const lipSyncHints = React.useMemo(() => resolveLipSyncHints(url), [url]);

  const model = React.useMemo(() => {
    const clone = cloneSkeleton(scene);
    applyNaturalArmPose(clone);
    normalizeAvatarMeshes(clone);
    normalizeAvatarHeight(clone);
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!modelRef.current) return;

    // Gentle, slow vertical bob — never scaled by audio, so the body never vibrates.
    modelRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.04 - 1;

    applyLipSyncAmplitude(model, isSpeaking ? amplitude : 0, lipSyncHints, delta);

    blinkPhase.current += delta;
    const blinkCycle = blinkPhase.current % 4.2;
    const blinkAmount = blinkCycle > 3.9 ? (blinkCycle - 3.9) / 0.3 : 0;
    applyBlink(model, Math.min(1, blinkAmount * 3), lipSyncHints);
  });

  return (
    <group ref={modelRef} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

interface GlbAvatarProps {
  modelUrl: string;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
}

export default function GlbAvatar({
  modelUrl,
  audioElement,
  isConnected,
  isAISpeaking,
  isUserSpeaking,
}: GlbAvatarProps) {
  const widgetState = deriveAvatarWidgetState({
    isConnected,
    isAISpeaking,
    isUserSpeaking,
  });
  
  const amplitude = useAudioAmplitude(
    audioElement,
    widgetState === 'speaking' && isConnected,
  );

  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 3]} intensity={0.6} />
        <React.Suspense fallback={null}>
          <Model url={modelUrl} amplitude={amplitude} isSpeaking={widgetState === 'speaking'} />
        </React.Suspense>
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.1} />
      </Canvas>
      
      {widgetState === 'speaking' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
          <span className="text-xs text-white font-medium">Speaking</span>
        </div>
      )}
      
      {widgetState === 'listening' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-white font-medium">Listening</span>
        </div>
      )}
    </div>
  );
}
