'use client';

/**
 * Plinth —— 兽头长方形博物馆陈列台（R11 第十一轮 §三）
 *
 * 视觉目标：
 *  - 纯白色 / 暖白长方体博物馆台 —— 比例简洁、厚重、现代；
 *    顶部一圈浅凹槽（克制装饰线），底面切小斜角形成"台阶式"
 *    收边（museum plinth 视觉语言）。
 *  - 完全没有圆环、圆台、发光圈 / 光池（用户 R11 明确禁止）。
 *  - 接地阴影：① Key 灯 castShadow → 台体在地面真实投影；
 *    ② 台体下方一个极柔矩形暗影平面（box footprint 大致贴合台底，
 *    中央稍深、四角 0，长方形而非圆形），强化"压在地面"感。
 *  - 兽头阴影投射在台面顶面（real shadow，台面 receiveShadow）。
 *
 * 性能：
 *  - 按 quality 调整地面暗影 plane 是否渲染（HIGH/MED 开，LOW 关）。
 *  - 台体 box 单一几何 + 顶部凹槽 plane（始终渲染，简单）。
 *  - 不引入透明 / Additive / Fresnel / 任何发光层。
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { QUALITY_CFG } from '@/lib/perf';
import { useOS } from '@/lib/store';
import { getContactShadowTexture } from '@/lib/plasterTexture';

/* ---- 矩形台几何参数（museum plinth 比例） ----
 * 宽 × 深 = 1.5 × 1.5（稍宽于兽头底径 ~1.0，给"展台"留呼吸）
 * 高 0.62，与原 Plinth 顶面 y 同位 → 兽头基线 / 浮空节奏保持不变。
 */
const W = 1.5;
const D = 1.5;
const H = 0.62;
const Y = H / 2;

/* ---- 顶面凹槽（顶部一圈 0.06m 浅槽） ---- */
const GROOVE_W = 0.06;

/** 矩形暗影渐变（中心深、四角 0）。Box footprint 适配，避免圆形。 */
let plinthShadowTex: THREE.CanvasTexture | null = null;
function getPlinthShadowTexture(): THREE.CanvasTexture | null {
  if (plinthShadowTex) return plinthShadowTex;
  if (typeof document === 'undefined') return null;
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  // 用径向渐变画一个方形 feather（在矩形内椭圆衰减），四角更透
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, SIZE / 2 - 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.3)');
  g.addColorStop(0.85, 'rgba(0,0,0,0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // 锐化矩形边缘：用一个额外的遮罩让圆外全部清除 → 真正方形 footprint
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  // 圆角化 footprint
  const radius = 22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(SIZE - radius, 0);
  ctx.quadraticCurveTo(SIZE, 0, SIZE, radius);
  ctx.lineTo(SIZE, SIZE - radius);
  ctx.quadraticCurveTo(SIZE, SIZE, SIZE - radius, SIZE);
  ctx.lineTo(radius, SIZE);
  ctx.quadraticCurveTo(0, SIZE, 0, SIZE - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  plinthShadowTex = tex;
  return tex;
}

export default function Plinth() {
  const quality = useOS((s) => s.quality);
  const qc = QUALITY_CFG[quality];

  /* ---- 共享白瓷材质（顶面略亮、底面略暗 → 真实光照层级） ---- */
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f1ede4',
        roughness: 0.62,
        metalness: 0,
        envMapIntensity: 0.45,
      }),
    [],
  );

  /* ---- 顶部凹槽用更深一档的暖灰 → 浅浅分隔线 ---- */
  const grooveMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c9c2b3',
        roughness: 0.7,
        metalness: 0,
      }),
    [],
  );

  /* ---- 矩形暗影盘（HIGH/MEDIUM 显示） ---- */
  const shadowMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getPlinthShadowTexture() ?? getContactShadowTexture() ?? undefined,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      color: '#101010',
    });
  }, []);
  const showShadowDisc = qc.contactShadowOpacity > 0;

  return (
    <group>
      {/* ---- 矩形暗影盘（box footprint 略大于底面） ---- */}
      {showShadowDisc && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.012, 0]}
          material={shadowMat}
          renderOrder={1}
        >
          <planeGeometry args={[W + 1.0, D + 1.0]} />
        </mesh>
      )}

      {/* ---- 主体：纯白长方体 ---- */}
      <mesh
        position={[0, Y, 0]}
        castShadow
        receiveShadow
        material={mat}
      >
        <boxGeometry args={[W, H, D]} />
      </mesh>

      {/* ---- 顶部一圈浅凹槽（四条窄边） ---- */}
      <mesh position={[0, H - GROOVE_W / 2, D / 2 - GROOVE_W / 2]}>
        <boxGeometry args={[W - 0.06, GROOVE_W, GROOVE_W]} />
        <primitive object={grooveMat} attach="material" />
      </mesh>
      <mesh position={[0, H - GROOVE_W / 2, -(D / 2 - GROOVE_W / 2)]}>
        <boxGeometry args={[W - 0.06, GROOVE_W, GROOVE_W]} />
        <primitive object={grooveMat} attach="material" />
      </mesh>
      <mesh
        position={[W / 2 - GROOVE_W / 2, H - GROOVE_W / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[D - 0.06, GROOVE_W, GROOVE_W]} />
        <primitive object={grooveMat} attach="material" />
      </mesh>
      <mesh
        position={[-(W / 2 - GROOVE_W / 2), H - GROOVE_W / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[D - 0.06, GROOVE_W, GROOVE_W]} />
        <primitive object={grooveMat} attach="material" />
      </mesh>

      {/* ---- 底部收边（窄台阶，更"现代"） ---- */}
      <mesh position={[0, 0.02, 0]} material={mat}>
        <boxGeometry args={[W + 0.06, 0.04, D + 0.06]} />
      </mesh>
    </group>
  );
}