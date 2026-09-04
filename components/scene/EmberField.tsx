'use client';

/**
 * 窗外黑色 ember 粒子 —— R21
 *
 * 设计意图：
 *   - 仅在 HOME 模式渲染（其他模式的窗外仍有彩色，不该混入黑灰烬）。
 *   - 围绕圣堂墙内两扇大型玻璃窗，在窗外（玻璃 plane 后方）布置黑色 Points，
 *     让用户透过玻璃看到窗外漂浮的"灰烬"层 —— 给"无色首页"增加颗粒感与氛围。
 *   - 颜色 #0d0d0d 黑，opacity 0.55 + sizeAttenuation，配合 size ≈ 0.07。
 *   - 数量按 Quality 走 QUALITY_CFG.embers；LOW 关闭。
 *   - Reduced Motion 时静止；否则每片绕自身 y 轴极慢漂移（0.005 rad/s），
 *     并随全局时间上下飘 ±0.04。
 *   - 几何在窗口本地系内生成（x ∈ [-W/2, W/2]，y ∈ [-H/2, H/2]，
 *     z ∈ [-3.0, -0.6]），父 group 负责把坐标系对齐到该窗户。
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { QUALITY_CFG } from '@/lib/perf';
import { useOS } from '@/lib/store';

const WINDOW_ANGLES = [54]; // 与 Room.tsx 一致（圣堂墙内大窗的角度位置）
const R = 7; // 与 Room.tsx 中 R 一致
const WIDTH = 5.6;
const HEIGHT = 4.55;
const WINDOW_Y = 2.35; // 与 Room.tsx 玻璃窗中心 y 一致

const rad = (d: number) => (d * Math.PI) / 180;
function polar(phiDeg: number, r: number): [number, number] {
  const a = rad(phiDeg);
  return [Math.sin(a) * r, -Math.cos(a) * r];
}

/** 一扇窗外的 ember 粒子集合（在 window-local 坐标系内） */
function WindowEmbers({
  phi,
  count,
  side,
  isMobile,
}: {
  phi: number;
  count: number;
  side: -1 | 1;
  isMobile: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  /* 粒子位置：本地坐标下，分布在玻璃窗整个面积后方一段深度内。
   * 移动端相机更高 + 距离更远 + 窗偏屏外侧 → 仅窗的上半内侧窄条在画面里，
   * 所以把 y 偏向上半部、并向窗的内侧（朝相机一侧）密集。 */
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      if (isMobile) {
        /* 移动端：x 朝内侧 (side=+1 右窗，camera 在 x=0，故偏向 -x；反之)，
         * y 偏向上半部让粒子落在窗的上沿带（相机俯视下能看到的区域）。 */
        const innerShift = -side * WIDTH * 0.55;
        positions[i * 3] = innerShift + (Math.random() - 0.5) * WIDTH * 0.55;
        positions[i * 3 + 1] =
          HEIGHT * 0.45 - Math.random() * HEIGHT * 0.45;
        positions[i * 3 + 2] = -0.4 - Math.random() * 2.0;
      } else {
        positions[i * 3] = (Math.random() - 0.5) * WIDTH * 0.95;
        positions[i * 3 + 1] = (Math.random() - 0.5) * HEIGHT * 0.85;
        positions[i * 3 + 2] = -0.6 - Math.random() * 2.4;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count, isMobile]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    if (useOS.getState().reducedMotion) return;
    const t = state.clock.elapsedTime;
    pointsRef.current.rotation.y = t * 0.005 + side * 0.04;
    pointsRef.current.position.y = Math.sin(t * 0.12 + side * 0.7) * 0.04;
  });

  const [wx, wz] = polar(phi, R);

  return (
    <group
      position={[wx, WINDOW_Y, wz]}
      rotation={[0, -rad(phi), 0]}
    >
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={isMobile ? 0.16 : 0.07}
          color="#0d0d0d"
          transparent
          opacity={isMobile ? 0.78 : 0.55}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export default function EmberField({ isMobile }: { isMobile: boolean }) {
  const mode = useOS((s) => s.mode);
  const quality = useOS((s) => s.quality);
  const count = useMemo(
    () => QUALITY_CFG[quality].embers[isMobile ? 1 : 0],
    [quality, isMobile],
  );

  /* 仅在 HOME 渲染；切走模式时本组件不挂载 → 减少常驻粒子开销。 */
  if (mode !== 'HOME' || count <= 0) return null;

  return (
    <>
      {([-1, 1] as const).map((side) =>
        WINDOW_ANGLES.map((a) => (
          <WindowEmbers
            key={`ember${side}${a}`}
            phi={a * side}
            count={count}
            side={side}
            isMobile={isMobile}
          />
        )),
      )}
    </>
  );
}