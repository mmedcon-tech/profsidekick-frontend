"use client";

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { deriveAvatarWidgetState } from '@/lib/avatarStateMachine';
import { useAudioAmplitude } from '@/hooks/useAudioAmplitude';

interface GlbModelProps {
  url: string;
  amplitude: number;
  isSpeaking: boolean;
}

function Model({ url, amplitude, isSpeaking }: GlbModelProps) {
  const { scene, nodes, animations } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (modelRef.current) {
      // Gentle floating animation
      modelRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.05 - 1;
      
      // Pulse scale slightly when speaking
      if (isSpeaking) {
        const targetScale = 1 + (amplitude * 0.1);
        modelRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      } else {
        modelRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <group ref={modelRef} dispose={null}>
      <primitive object={scene} />
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
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="city" />
        <React.Suspense fallback={null}>
          <Model url={modelUrl} amplitude={amplitude} isSpeaking={widgetState === 'speaking'} />
        </React.Suspense>
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.1} />
      </Canvas>
      
      {widgetState === 'speaking' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
