'use client';

/**
 * 窗光中的微尘 —— 极少量 Points。
 * - 数量按 Quality：HIGH [90,40] / MEDIUM [48,22] / LOW 关闭
 * - Reduced Motion：静止（不旋转）
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { QUALITY_CFG } from '@/lib/perf';
import { useOS } from '@/lib/store';

export default function DustField({ isMobile }: { isMobile: boolean }) {
  const points = useRef<THREE.Points>(null);
  const quality = useOS((s) => s.quality);

  const { geometry } = useMemo(() => {
    const count = QUALITY_CFG[quality].dust[isMobile ? 1 : 0];
    if (count <= 0) return { geometry: null };
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Phase 01 §十六~§十九：把一部分微尘放到相机近侧（z→+5）
      // → 前/中/后三层景深，近景粒子在镜头前形成"空气层"而非贴纸
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = 0.3 + Math.random() * 3.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 9.5 + 0.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry };
  }, [quality, isMobile]);

  useFrame((state) => {
    if (!points.current || !geometry) return;
    const rm = useOS.getState().reducedMotion;
    if (rm) return; // Reduced Motion：微尘静止
    const t = state.clock.elapsedTime;
    points.current.rotation.y = t * 0.008;
    points.current.position.y = Math.sin(t * 0.1) * 0.08;
  });

  if (!geometry) return null;

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.025}
        color="#c9c9c6"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
