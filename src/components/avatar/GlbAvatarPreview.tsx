'use client';

import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, OrbitControls, useGLTF } from '@react-three/drei';
import type { Group } from 'three';
import {
  applyBlink,
  applyLipSyncAmplitude,
  type LipSyncHints,
} from '@/lib/glbLipSync';

interface GlbModelProps {
  url: string;
  amplitude: number;
  lipSyncHints?: LipSyncHints;
  demoSpeech?: boolean;
}

function GlbModel({
  url,
  amplitude,
  lipSyncHints,
  demoSpeech = false,
}: GlbModelProps): React.ReactElement {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);
  const idlePhase = useRef(0);
  const blinkPhase = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    idlePhase.current += delta;
    blinkPhase.current += delta;

    const breathe = Math.sin(idlePhase.current * 1.4) * 0.008;
    group.position.y = breathe;

    const speechAmp = demoSpeech
      ? Math.max(amplitude, (Math.sin(idlePhase.current * 11) * 0.5 + 0.5) * 0.65)
      : amplitude;
    applyLipSyncAmplitude(group, speechAmp, lipSyncHints);

    const blinkCycle = blinkPhase.current % 4.2;
    const blinkAmount = blinkCycle > 3.9 ? (blinkCycle - 3.9) / 0.3 : 0;
    applyBlink(group, Math.min(1, blinkAmount * 3), lipSyncHints);
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={model} scale={1.2} />
      </Center>
    </group>
  );
}

export interface GlbAvatarPreviewProps {
  glbUrl: string;
  amplitude?: number;
  lipSyncHints?: LipSyncHints;
  className?: string;
  showControls?: boolean;
  demoSpeech?: boolean;
}

export default function GlbAvatarPreview({
  glbUrl,
  amplitude = 0,
  lipSyncHints,
  className = '',
  showControls = true,
  demoSpeech = false,
}: GlbAvatarPreviewProps): React.ReactElement {
  return (
    <div className={`relative h-full w-full bg-gradient-to-b from-gray-900 to-gray-950 ${className}`}>
      <Canvas camera={{ position: [0, 1.4, 2.4], fov: 42 }} className="h-full w-full">
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 4, 3]} intensity={1.1} />
        <directionalLight position={[-2, 2, -2]} intensity={0.35} />
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial color="#133221" wireframe />
            </mesh>
          }
        >
          <GlbModel
            url={glbUrl}
            amplitude={amplitude}
            lipSyncHints={lipSyncHints}
            demoSpeech={demoSpeech}
          />
        </Suspense>
        {showControls && (
          <OrbitControls
            enablePan={false}
            minDistance={1.4}
            maxDistance={4}
            target={[0, 1.2, 0]}
          />
        )}
      </Canvas>
    </div>
  );
}
