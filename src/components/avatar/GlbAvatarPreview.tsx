'use client';

import React, { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Box3, Vector3, type Group } from 'three';
import {
  applyBlink,
  applyLipSyncAmplitude,
  type LipSyncHints,
} from '@/lib/glbLipSync';
import { applyNaturalArmPose } from '@/lib/glbArmPose';
import { normalizeAvatarMeshes } from '@/lib/glbMaterialFix';
import { normalizeAvatarHeight } from '@/lib/glbNormalize';
import { computeSidewaysIdleRotation } from '@/lib/glbIdleMotion';
import { applyVisemeMorphWeights } from '@/lib/glbVisemeSync';
import type { VisemeMorphWeights } from '@/lib/visemeTypes';

export type GlbFraming = 'bust' | 'full';

interface GlbModelProps {
  url: string;
  amplitude: number;
  lipSyncHints?: LipSyncHints;
  visemeRef?: React.RefObject<VisemeMorphWeights | null>;
  framing: GlbFraming;
  fitMargin: number;
  modelScale: number;
  coverHeightFraction: number;
}

function useClonedPosedModel(url: string): Group {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = cloneSkeleton(scene) as Group;
    applyNaturalArmPose(clone);
    normalizeAvatarMeshes(clone);
    normalizeAvatarHeight(clone);
    return clone;
  }, [scene]);
}

function useAvatarAnimation(
  model: Group,
  groupRef: React.RefObject<Group | null>,
  amplitude: number,
  lipSyncHints?: LipSyncHints,
  visemeRef?: React.RefObject<VisemeMorphWeights | null>,
  forceSpeaking = false,
): void {
  const idlePhase = useRef(0);
  const blinkPhase = useRef(0);
  const speakingBlend = useRef(0);
  const speakingPhase = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    idlePhase.current += delta;
    blinkPhase.current += delta;
    speakingPhase.current += delta;

    const forceTalk =
      typeof window !== 'undefined' &&
      (window as { __AVATAR_FORCE_TALK?: boolean }).__AVATAR_FORCE_TALK === true;
    const visemeWeights = visemeRef?.current;
    const hasVisemeWeights =
      visemeWeights && Object.values(visemeWeights).some((v) => v > 0.04);
    const effectiveAmplitude = forceTalk
      ? 0.35 + 0.25 * Math.sin(idlePhase.current * 9)
      : hasVisemeWeights
        ? 0
        : amplitude > 0.03
          ? amplitude
          : forceSpeaking
            ? 0.18 + 0.2 * Math.abs(Math.sin(speakingPhase.current * 10.5))
            : amplitude;

    const isSpeaking = visemeWeights
      ? Object.values(visemeWeights).some((v) => v > 0.06)
      : effectiveAmplitude > 0.04;

    const speakingTarget = isSpeaking ? 1 : 0;
    const blendStep = 1 - Math.exp(-6 * Math.max(0, delta));
    speakingBlend.current += (speakingTarget - speakingBlend.current) * blendStep;

    group.rotation.y = computeSidewaysIdleRotation(
      idlePhase.current,
      1 - speakingBlend.current,
    );

    if (visemeWeights) {
      applyVisemeMorphWeights(model, visemeWeights, lipSyncHints, delta);
    } else {
      applyLipSyncAmplitude(model, effectiveAmplitude, lipSyncHints, delta);
    }

    const blinkCycle = blinkPhase.current % 4.2;
    const blinkAmount = blinkCycle > 3.9 ? (blinkCycle - 3.9) / 0.3 : 0;
    applyBlink(model, Math.min(1, blinkAmount * 3), lipSyncHints);
  });
}

/** Bust framing keeps drei's auto-fit — good for the small circular chatbot orb. */
function BustModel({
  url,
  amplitude,
  lipSyncHints,
  visemeRef,
  fitMargin,
  modelScale,
  isSpeaking = false,
}: Omit<GlbModelProps, 'framing' | 'coverHeightFraction'> & { isSpeaking?: boolean }): React.ReactElement {
  const groupRef = useRef<Group>(null);
  const model = useClonedPosedModel(url);
  useAvatarAnimation(model, groupRef, amplitude, lipSyncHints, visemeRef, isSpeaking);

  return (
    <Bounds fit clip margin={fitMargin} maxDuration={0.35}>
      <group ref={groupRef}>
        <Center top>
          <primitive object={model} scale={modelScale} />
        </Center>
      </group>
    </Bounds>
  );
}

/**
 * Full framing measures the model and positions the camera to fill the stage,
 * showing the top `coverHeightFraction` of the body (head down to ~thighs) so the
 * avatar is large instead of floating small with empty space above it.
 */
function FullModel({
  url,
  amplitude,
  lipSyncHints,
  visemeRef,
  fitMargin,
  modelScale,
  coverHeightFraction,
  isSpeaking = false,
}: Omit<GlbModelProps, 'framing'> & { isSpeaking?: boolean }): React.ReactElement {
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Group>(null);
  const model = useClonedPosedModel(url);
  useAvatarAnimation(model, groupRef, amplitude, lipSyncHints, visemeRef, isSpeaking);

  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | { target: Vector3; update: () => void }
    | null;
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const box = new Box3().setFromObject(inner);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    if (size.y === 0) return;

    const visibleHeight = (size.y * coverHeightFraction) / Math.max(0.1, fitMargin);
    const fovRad = ((camera as { fov: number }).fov * Math.PI) / 180;
    const distance = visibleHeight / 2 / Math.tan(fovRad / 2);

    // Focus on the upper body so the crop happens at the legs, never the head.
    const focusY = box.max.y - visibleHeight / 2;

    camera.position.set(center.x, focusY, distance);
    (camera as { near: number; far: number }).near = Math.max(0.1, distance * 0.1);
    (camera as { near: number; far: number }).far = distance * 6;
    camera.lookAt(center.x, focusY, 0);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.set(center.x, focusY, 0);
      controls.update();
    }
  }, [
    model,
    camera,
    controls,
    coverHeightFraction,
    fitMargin,
    modelScale,
    viewportWidth,
    viewportHeight,
  ]);

  return (
    <group ref={groupRef}>
      <group ref={innerRef}>
        <primitive object={model} scale={modelScale} />
      </group>
    </group>
  );
}

export interface GlbAvatarPreviewProps {
  glbUrl: string;
  amplitude?: number;
  lipSyncHints?: LipSyncHints;
  visemeRef?: React.RefObject<VisemeMorphWeights | null>;
  className?: string;
  showControls?: boolean;
  framing?: GlbFraming;
  fitMargin?: number;
  modelScale?: number;
  /** Fraction of the model height to show in full framing (1 = whole body, 0.7 = top 70%). */
  coverHeightFraction?: number;
  /** Optional thumbnail shown while the GLB streams/decodes (first paint only). */
  posterSrc?: string;
  /** Drive mouth movement when audio amplitude analysis is unavailable. */
  isSpeaking?: boolean;
}

/**
 * Warm the GLTF cache ahead of time. Call on idle so the model is fetched,
 * parsed and the meshopt buffers decoded before the avatar is ever shown —
 * mounting the Canvas then resolves from cache in milliseconds instead of
 * suspending for the full network + parse cost.
 */
export function preloadGlbAvatar(glbUrl: string): void {
  useGLTF.preload(glbUrl);
}

export default function GlbAvatarPreview({
  glbUrl,
  amplitude = 0,
  lipSyncHints,
  visemeRef,
  className = '',
  showControls = true,
  framing = 'full',
  fitMargin = 1.05,
  modelScale = 1.15,
  coverHeightFraction = 0.74,
  posterSrc,
  isSpeaking = false,
}: GlbAvatarPreviewProps): React.ReactElement {
  const cameraY = framing === 'bust' ? 1.45 : 1.05;
  const targetY = framing === 'bust' ? 1.35 : 0.95;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-b from-[#1a2e24] via-[#0f1a14] to-[#070d0a] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(19,50,33,0.45),transparent_55%)]" />
      <Canvas
        // Clamp pixel ratio: avatars are small, so capping DPR avoids rendering
        // 3–4× the pixels on retina/hi-dpi screens for no visible benefit.
        dpr={[1, 1.5]}
        camera={{ position: [0, cameraY, 2.35], fov: 32, near: 0.1, far: 100 }}
        className="relative z-[1] h-full w-full"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow />
        <directionalLight position={[-4, 2, -2]} intensity={0.3} color="#a8c4ff" />
        <spotLight position={[0, 4, 2]} angle={0.35} penumbra={0.8} intensity={0.65} />

        <Suspense
          fallback={
            posterSrc ? (
              <Html fullscreen>
                {/* Lightweight poster keeps the avatar visible during the
                    (now sub-second) GLB decode instead of a loading box. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterSrc}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-cover opacity-90"
                />
              </Html>
            ) : null
          }
        >
          <Environment preset="city" />
          {framing === 'bust' ? (
            <BustModel
              url={glbUrl}
              amplitude={amplitude}
              lipSyncHints={lipSyncHints}
              visemeRef={visemeRef}
              fitMargin={fitMargin}
              modelScale={modelScale}
              isSpeaking={isSpeaking}
            />
          ) : (
            <FullModel
              url={glbUrl}
              amplitude={amplitude}
              lipSyncHints={lipSyncHints}
              visemeRef={visemeRef}
              fitMargin={fitMargin}
              modelScale={modelScale}
              coverHeightFraction={coverHeightFraction}
              isSpeaking={isSpeaking}
            />
          )}
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
            makeDefault
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
