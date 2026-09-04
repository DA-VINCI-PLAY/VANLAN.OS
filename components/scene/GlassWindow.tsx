'use client';

/**
 * 纯玻璃落地窗 —— R11 第十一轮
 *
 * R11 关键改动：
 *  - 删除 Fresnel ShaderMaterial —— 此前它在玻璃边缘画一圈极淡 additive
 *    描边，在窗户靠顶部处会渲染成「窗边白色圆圈」（用户指令 §一·删除）。
 *  - 窗外天空 plane 显著扩大（width×1.95, height×1.85），让高饱和天空成为
 *    HOME / 其他模式背景的重要视觉层（用户指令 §四·窗外天空颜色面积
 *    明显扩大）。
 *  - 玻璃本体保持透明 + 低 roughness envMap 反射 → 真实玻璃感，绝不变成
 *    纯色 LED 屏幕。
 *  - 保留极细窗框（建筑定位），按 quality 决定窗框省略与否（HIGH/MED
 *    桌面保留，LOW / 移动端极简）。
 *
 * 结构：
 *   1. 窗外天空 plane（BasicMaterial + toneMapped:false）—— 渐变饱和
 *   2. 真玻璃 plane（StandardMaterial 半透白）—— 让天空从后面透出
 *   3. 极细窗框（仅承担建筑定位）
 */

import { useOS } from '@/lib/store';
import { getSkyTexture } from '@/lib/skyGradient';
import { useMemo } from 'react';
import * as THREE from 'three';

const FRAME = '#ececea';

interface Props {
  position: [number, number, number];
  rotationY: number;
  width?: number;
  height?: number;
  isMobile?: boolean;
}

export default function GlassWindow({
  position,
  rotationY,
  width = 5.6,
  height = 4.55,
  isMobile = false,
}: Props) {
  const mode = useOS((s) => s.mode);
  const activeAlbum = useOS((s) => s.activeAlbum);
  const quality = useOS((s) => s.quality);

  const sky = useMemo(
    () => getSkyTexture(mode, activeAlbum),
    [mode, activeAlbum],
  );

  /* 窗外天空：放在玻璃后方的更大平面 —— 让用户透过玻璃看到有空间的彩色天空。
   * toneMapped:false 保留饱和度；DoubleSide 防背面。
   * R11：显著扩大（width×1.95, height×1.85）→ 天空面积扩大。
   */
  const skyMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: sky,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [sky]);

  /* 玻璃：白色半透 + 低 roughness + 极轻 env 反射 → 配合 scene.environment
   * 产生克制微高光；opacity 按档：high 0.12 / med 0.14 / low 0.22
   */
  const glassOpacity = quality === 'high' ? 0.12 : quality === 'medium' ? 0.14 : 0.22;
  const glassRough = quality === 'low' ? 0.28 : 0.08;
  const glassEnv = quality === 'low' ? 0.15 : 0.4;
  const glassMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: glassOpacity,
      roughness: glassRough,
      metalness: 0,
      envMapIntensity: glassEnv,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [glassOpacity, glassRough, glassEnv]);

  /* R11：删除 Fresnel ShaderMaterial（窗边白圈源头）。 */

  const showFrame = quality !== 'low' && !isMobile;
  const frame = 0.05;
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: FRAME,
        roughness: 0.65,
      }),
    [],
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 窗外天空 plane：宽度与高度均显著大于玻璃（1.95×1.85） */}
      <mesh position={[0, height * 0.05, -1.6]}>
        <planeGeometry args={[width * 1.95, height * 1.85]} />
        <primitive object={skyMat} attach="material" />
      </mesh>
      {/* 玻璃：白色半透，让天空从后面透出 */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[width, height]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* R11：删除菲涅尔罩 */}
      {/* 极细窗框（顶/底/左/右）—— 仅承担建筑定位，HIGH/MED 桌面 */}
      {showFrame && (
        <>
          <mesh position={[0, height / 2 - frame / 2, 0]}>
            <boxGeometry args={[width + frame, frame, frame]} />
            <primitive object={frameMat} attach="material" />
          </mesh>
          <mesh position={[0, -height / 2 + frame / 2, 0]}>
            <boxGeometry args={[width + frame, frame, frame]} />
            <primitive object={frameMat} attach="material" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * (width / 2 - frame / 2), 0, 0]}
            >
              <boxGeometry args={[frame, height - frame * 2, frame]} />
              <primitive object={frameMat} attach="material" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}