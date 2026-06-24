'use client';

import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';
import type { Group } from 'three';
import {
  applyBlink,
  applyLipSyncAmplitude,
  type LipSyncHints,
} from '@/lib/glbLipSync';
import { computeSidewaysIdleRotation } from '@/lib/glbIdleMotion';

export type GlbFraming = 'bust' | 'full';

interface GlbModelProps {
  url: string;
  amplitude: number;
  lipSyncHints?: LipSyncHints;
  framing: GlbFraming;
  fitMargin: number;
  modelScale: number;
}

function GlbModel({
  url,
  amplitude,
  lipSyncHints,
  framing,
  fitMargin,
  modelScale,
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

    group.rotation.y = computeSidewaysIdleRotation(idlePhase.current);

    applyLipSyncAmplitude(model, amplitude, lipSyncHints);

    const blinkCycle = blinkPhase.current % 4.2;
    const blinkAmount = blinkCycle > 3.9 ? (blinkCycle - 3.9) / 0.3 : 0;
    applyBlink(model, Math.min(1, blinkAmount * 3), lipSyncHints);
  });

  return (
    <Bounds fit clip margin={fitMargin} maxDuration={0.35}>
      <group ref={groupRef}>
        <Center top={framing === 'bust'}>
          <primitive object={model} scale={modelScale} />
        </Center>
      </group>
    </Bounds>
  );
}

export interface GlbAvatarPreviewProps {
  glbUrl: string;
  amplitude?: number;
  lipSyncHints?: LipSyncHints;
  className?: string;
  showControls?: boolean;
  framing?: GlbFraming;
  fitMargin?: number;
  modelScale?: number;
}

export default function GlbAvatarPreview({
  glbUrl,
  amplitude = 0,
  lipSyncHints,
  className = '',
  showControls = true,
  framing = 'full',
  fitMargin = 1.05,
  modelScale = 1.15,
}: GlbAvatarPreviewProps): React.ReactElement {
  const cameraY = framing === 'bust' ? 1.45 : 1.05;
  const targetY = framing === 'bust' ? 1.35 : 0.95;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-b from-[#1a2e24] via-[#0f1a14] to-[#070d0a] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(19,50,33,0.45),transparent_55%)]" />
      <Canvas
        camera={{ position: [0, cameraY, 2.35], fov: 32, near: 0.1, far: 100 }}
        className="relative z-[1] h-full w-full"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow />
        <directionalLight position={[-4, 2, -2]} intensity={0.3} color="#a8c4ff" />
        <spotLight position={[0, 4, 2]} angle={0.35} penumbra={0.8} intensity={0.65} />

        <Suspense
          fallback={
            <mesh>
              <Html center>
                <div className="rounded-lg bg-black/60 px-4 py-2 text-sm text-white">
                  Loading 3D model…
                </div>
              </Html>
            </mesh>
          }
        >
          <Environment preset="city" />
          <GlbModel
            url={glbUrl}
            amplitude={amplitude}
            lipSyncHints={lipSyncHints}
            framing={framing}
            fitMargin={fitMargin}
            modelScale={modelScale}
          />
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.45}
            scale={8}
            blur={2.5}
            far={4}
          />
        </Suspense>

        {showControls && (
          <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 3.4}
            maxPolarAngle={Math.PI / 1.75}
            minDistance={0.85}
            maxDistance={3.8}
            target={[0, targetY, 0]}
          />
        )}
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-16 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}
