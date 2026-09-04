'use client';

/**
 * Character —— 数字圣堂中央的"核心意识 / Avatar Core"  第六轮视觉重构 +
 *                Phase 01 雕塑化 + R11 灯光/曝光重构
 *
 * R11 第十一轮关键改动：
 *  - 删除 Halo 平面与点光：Halo 4.6x4.6 的白色径向 plane 在窗户位置
 *    会渲染成「窗边白色圆圈」（用户指令 §一·删除），彻底删除该组件。
 *  - 去掉点光强度的逐帧正弦振荡（用户 §一·「光照变化必须平滑稳定，
 *    不要每帧随机变化」）；SculptLighting 三件套（Key/Fill/Rim）改为常量强度，
 *    按 quality 一次性赋予（不再每帧 lerp），避免 AdaptiveQuality 切换时的
 *    强度跳变。
 *  - 兽头仍然是真实 GLB 石膏，第一视觉主体；矩形陈列台由 Plinth 提供。
 *
 * 视觉目标：
 *  - 兽头占房间视觉高度 ~45%
 *  - 正面朝镜头（HEAD_YAW = -π/2：把 GLB forward = +X 转到 +Z 朝相机）
 *  - 白色石膏质感（丢弃 GLB 原 metal=1 + 颜色/法线贴图）
 *  - 微环境色映射（ALBUM 模式仅 ≤0.06 强度跟随专辑色；不会让石膏变彩色）
 *  - 性能：HIGH/MEDIUM 挂程序化 roughness/normal 微纹理；LOW 纯色
 *
 * Phase 01 雕塑化（§二~§八）：
 *  - SculptLighting —— Key（前上偏侧、突出额头/鼻梁/眼窝/耳/轮廓）
 *    + Fill（极弱、明显弱于 Key）+ Rim（后上方克制勾勒耳/头顶），
 *    全部瞄准头心；Key 在 HIGH/MEDIUM 桌面 castShadow。
 *  - applyPlasterQuality —— 按档给共享 PLASTER 单例挂程序化 roughness(0.82~0.94)
 *    + 极轻 normalMap（HIGH/MEDIUM）；LOW 回退纯色 0.88 哑光。
 *
 * 比例：先实测 GLB bounding box（h≈1.0），再按目标高度 TARGET_H=2.1 计算统一 scale：
 *    scale = TARGET_H / size.y
 */

import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { QUALITY_CFG } from '@/lib/perf';
import { useOS, type Quality } from '@/lib/store';
import { useIsMobile } from '@/lib/useIsMobile';
import { plasterBase } from '@/lib/glowColor';
import { getPlasterNormalMap, getPlasterRoughnessMap } from '@/lib/plasterTexture';
import { ALBUMS } from '@/content/albums';
import type { ReactNode } from 'react';

const MODEL_URL = '/models/vanlan.glb';
const HEAD_Y = 2.0;
/** GLB forward = +X（Tripo 默认导出），相机在 +Z 看向原点。
 *  绕 Y 旋转 -π/2 使 +X 转到 +Z（朝相机）。 */
const HEAD_YAW = -Math.PI / 2;
/** 兽头目标视觉高度（米）。约房间可视高度 4.6m 的 45% → 主体明显但不遮挡两侧窗。 */
const TARGET_H = 2.1;

/* ---------- 共享石膏材质（单例，多 mesh 引用同一份）
 * R11：roughness 0.88（落入用户要求的 0.85-0.95 区间），metalness 0（纯石膏）。
 */
const PLASTER = new THREE.MeshStandardMaterial({
  color: plasterBase,
  roughness: 0.88,
  metalness: 0,
  envMapIntensity: 0.4,
});

/* ---------- 石膏表面分级：HIGH/MEDIUM 挂 map，LOW 纯色 ---------- */
function applyPlasterQuality(q: Quality) {
  if (q === 'low') {
    PLASTER.roughnessMap = null;
    PLASTER.normalMap = null;
    PLASTER.normalScale.set(1, 1);
    PLASTER.roughness = 0.88;
  } else {
    PLASTER.roughness = 1;
    PLASTER.roughnessMap = getPlasterRoughnessMap();
    PLASTER.normalMap = getPlasterNormalMap();
    PLASTER.normalScale.set(0.5, 0.5);
  }
  PLASTER.needsUpdate = true;
}

/* ---------- 探测 GLB（HEAD 请求），缺失即占位头 ---------- */
function useModelExists(): boolean | null {
  const [exists, setExists] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((r) => alive && setExists(r.ok))
      .catch(() => alive && setExists(false));
    return () => {
      alive = false;
    };
  }, []);
  return exists;
}

/* ---------- GLB 加载/解析失败降级：仅替换为占位头，Scene 不崩 ---------- */
class GlbSafe extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ---------- 漂浮动画：作用于最内层 group，呼吸/漂移/微摆动。
 * 全部用 sin/cos 周期运动（非 easing），用户 R11 指令允许。
 * 关键：这里没有逐帧 light intensity 变化（已移除 Halo）。
 */
function useFloat(group: React.RefObject<THREE.Group | null>) {
  useFrame((state) => {
    if (!group.current) return;
    const rm = useOS.getState().reducedMotion;
    const t = state.clock.elapsedTime;
    if (rm) {
      group.current.scale.setScalar(1);
      group.current.position.y = 0;
      group.current.rotation.y = 0;
      group.current.rotation.z = 0;
      return;
    }
    // 呼吸 1 → 1.006
    group.current.scale.setScalar(1 + Math.sin(t * 0.85) * 0.006);
    // 漂浮：双正弦叠加（相对父级 y=0），周期 4~6s
    group.current.position.y =
      Math.sin(t * 1.25) * 0.05 + Math.sin(t * 0.45) * 0.03;
    // 微旋转
    group.current.rotation.y = Math.sin(t * 0.16) * 0.025;
    group.current.rotation.z = Math.sin(t * 0.21) * 0.01;
  });
}

function GLBCharacter() {
  const { scene } = useGLTF(MODEL_URL, true);
  const yawRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);

  const { model, scale, centerOffsetY } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.material = PLASTER;
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = Math.max(size.y, 0.001);
    const s = TARGET_H / h;
    const center = box.getCenter(new THREE.Vector3());
    return { model: cloned, scale: s, centerOffsetY: -center.y * s };
  }, [scene]);

  useFloat(floatRef);

  return (
    <group ref={yawRef} position={[0, HEAD_Y, 0]} rotation={[0, HEAD_YAW, 0]}>
      <group ref={floatRef}>
        <group scale={scale} position={[0, centerOffsetY, 0]}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}

/* ---------- 程序化白色兽头（GLB 不可用时） ---------- */
function PlaceholderHead() {
  const yawRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);
  const phScale = TARGET_H / 1.1;

  useFloat(floatRef);

  return (
    <group ref={yawRef} position={[0, HEAD_Y, 0]} rotation={[0, HEAD_YAW, 0]}>
      <group ref={floatRef}>
        <group scale={phScale} position={[0, -0.5 * phScale, 0]}>
          {/* 主头骨 */}
          <mesh castShadow receiveShadow scale={[1, 0.94, 0.96]}>
            <sphereGeometry args={[0.48, 32, 28]} />
            <primitive object={PLASTER} attach="material" />
          </mesh>
          {/* 口鼻 */}
          <mesh castShadow position={[0, -0.15, 0.37]} scale={[1, 0.8, 0.95]}>
            <sphereGeometry args={[0.24, 22, 18]} />
            <primitive object={PLASTER} attach="material" />
          </mesh>
          {/* 鼻头（深色） */}
          <mesh position={[0, -0.06, 0.59]}>
            <sphereGeometry args={[0.058, 14, 12]} />
            <meshStandardMaterial color="#3b3a36" roughness={0.55} metalness={0} />
          </mesh>
          {/* 双眼（深色） */}
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * 0.19, 0.06, 0.42]}>
              <sphereGeometry args={[0.05, 14, 12]} />
              <meshStandardMaterial color="#2a2a26" roughness={0.45} metalness={0} />
            </mesh>
          ))}
          {/* 脸颊绒毛 */}
          {([-1, 1] as const).map((s) => (
            <mesh
              key={s}
              castShadow
              position={[s * 0.37, -0.11, 0.2]}
              scale={[1, 0.82, 0.9]}
            >
              <sphereGeometry args={[0.18, 18, 16]} />
              <primitive object={PLASTER} attach="material" />
            </mesh>
          ))}
          {/* 双耳 */}
          {([-1, 1] as const).map((s) => (
            <mesh
              key={s}
              castShadow
              position={[s * 0.3, 0.56, -0.02]}
              rotation={[-0.08, 0, s * -0.3]}
            >
              <coneGeometry args={[0.18, 0.5, 12]} />
              <primitive object={PLASTER} attach="material" />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ---------- 雕塑灯光三件套（R11：常量强度，不再每帧 lerp）
 * 固定在头心 [0, HEAD_Y, 0]（不随漂浮 group 移动 → 兽头微动时阴影轻微游移，立体感更强）：
 *  - Key  ：前上方偏侧（右前上）→ 额头/鼻梁/眼窝/耳/轮廓的"雕塑高光"
 *  - Fill ：对侧前下极弱冷白 → 只提亮暗部、绝不与 Key 抗衡
 *  - Rim  ：后上方（头左后）→ 勾勒耳外缘/头顶一圈"边缘光"（克制、非发光描边）
 * R11：Key/Fill/Rim 改为常量（按 quality 静态赋值），避免 AdaptiveQuality
 * 切换品质档时引起的强度跳变（用户 §一·"光照变化必须平滑稳定"）。
 * Key 在 HIGH/MEDIUM 桌面 castShadow → 兽头 + 陈列台在地面真实阴影。
 */
function SculptLighting() {
  const quality = useOS((s) => s.quality);
  const isMobile = useIsMobile();
  const keyTarget = useMemo(() => new THREE.Object3D(), []);

  const castKey = quality !== 'low' && !isMobile;
  const map = isMobile ? 512 : 1024;
  // R11：常量强度（quality 决定数值，运行期不再 lerp）
  const keyI = quality === 'low' ? 0.95 : 1.65;
  const fillI = quality === 'low' ? 0.18 : 0.28;
  const rimI = quality === 'low' ? 0.55 : 0.95;

  return (
    <group position={[0, HEAD_Y, 0]}>
      <primitive object={keyTarget} />
      <directionalLight
        position={[3.4, 2.3, 3.1]}
        intensity={keyI}
        color="#fffaf1"
        target={keyTarget}
        castShadow={castKey}
        shadow-mapSize-width={map}
        shadow-mapSize-height={map}
        shadow-camera-left={-3.8}
        shadow-camera-right={3.8}
        shadow-camera-top={3.8}
        shadow-camera-bottom={-3.8}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-bias={-0.00035}
        shadow-normalBias={0.02}
      />
      {/* Fill：对侧弱冷白，只填暗部 */}
      <directionalLight
        position={[-3.2, -1.1, 3.4]}
        intensity={fillI}
        color="#eef2f6"
        target={keyTarget}
      />
      {/* Rim：后上方，从头左后勾轮廓 */}
      <directionalLight
        position={[-2.1, 3.0, -3.2]}
        intensity={rimI}
        color="#fffdf5"
        target={keyTarget}
      />
    </group>
  );
}

/* ---------- 石膏表面分级 ---------- */
function PlasterSurface() {
  const quality = useOS((s) => s.quality);
  useEffect(() => {
    applyPlasterQuality(quality);
  }, [quality]);
  return null;
}

/* ---------- 极轻微环境色 tint（ALBUM 模式：石膏朝专辑色 lerp 0.05）
 * 其他模式：复位到 plasterBase（白）。每帧 lerp 用时间常数 k（~1.5s 平滑）。
 * 复用 tmpTarget 实例避免每帧 new THREE.Color。
 */
function PlasterTint() {
  const tmpAccent = useMemo(() => new THREE.Color(), []);
  const tmpTarget = useMemo(() => new THREE.Color(), []);
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-2.5 * Math.min(delta, 0.1));
    const mode = useOS.getState().mode;
    tmpTarget.copy(plasterBase);
    if (mode === 'ALBUM') {
      tmpAccent.set(ALBUMS[useOS.getState().activeAlbum]?.accentColor ?? '#ffffff');
      tmpTarget.lerp(tmpAccent, 0.05);
    }
    PLASTER.color.lerp(tmpTarget, k);
  });
  return null;
}

export default function Character() {
  const exists = useModelExists();

  // GLB 预加载：与 HEAD 探测并行，命中缓存后 GLBCharacter 的 useGLTF
  // 不再 suspend（缩短占位头展示时间；空白屏由下方局部 Suspense 兜住）
  useEffect(() => {
    useGLTF.preload(MODEL_URL, true);
  }, []);

  // R11：删除 Halo 组件（4.6x4.6 白圆 plane + 点光）—— 这是「窗边白色圆圈」
  // 的源头（plane 大到覆盖窗户位置），用户指令 §一·删除。HEAD 中心不再
  // 任何发光面层，光影完全交给 SculptLighting + 矩形陈列台接地阴影。

  if (exists !== true) {
    return (
      <group>
        <PlasterSurface />
        <SculptLighting />
        <PlaceholderHead />
        <PlasterTint />
      </group>
    );
  }
  return (
    <group>
      <PlasterSurface />
      <SculptLighting />
      {/* 局部 Suspense：GLB 解析期间只降级为占位头，房间/陈列台/灯光保持挂载，
          不再出现整场景空白（P1 修复） */}
      <Suspense fallback={<PlaceholderHead />}>
        <GlbSafe fallback={<PlaceholderHead />}>
          <GLBCharacter />
        </GlbSafe>
      </Suspense>
      <PlasterTint />
    </group>
  );
}