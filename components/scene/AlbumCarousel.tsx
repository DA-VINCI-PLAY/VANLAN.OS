'use client';

/**
 * Album Carousel（3D 轮播）
 * - 当前专辑：居中 / 放大 / 微抬升 / 正对相机
 * - 其余专辑：缩小 / 旋转 / 分布左右
 * - 支持 mouse drag / touch swipe / wheel / 键盘方向键
 * - 切换专辑 → store.activeAlbum → LightingController 同步 accentColor
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { useOS } from '@/lib/store';
import { useIsMobile } from '@/lib/useIsMobile';
import { ALBUMS, type Album } from '@/content/albums';

const SIZE = 1.5;
const SPREAD = 2.35;

/* R11 §六：恒速线性插值（替代 damp 的 exponential "ease-out"）
 *   cur += clamp(target - cur, -maxStep, maxStep)
 *   步进距离 maxStep 由调用方按"单位/秒"传入；delta 控制 dt */
function moveToward(cur: number, target: number, maxStep: number): number {
  const d = target - cur;
  if (Math.abs(d) <= maxStep) return target;
  return cur + Math.sign(d) * maxStep;
}

/* ---------- 程序化封面：白底 + accent 渐变 + 标题 ---------- */
function makeCoverTexture(album: Album): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, album.accentColor + '4d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // 细网格
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const p = (512 / 8) * i;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  // accent 色块角标
  ctx.fillStyle = album.accentColor;
  ctx.fillRect(36, 36, 44, 10);

  // 标题
  ctx.fillStyle = '#111111';
  ctx.font = '700 34px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(album.vanlan, 36, 452);
  ctx.fillStyle = 'rgba(17,17,17,0.55)';
  ctx.font = '400 22px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(String(album.year), 36, 480);

  // 边框
  ctx.strokeStyle = 'rgba(17,17,17,0.85)';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 500);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function CoverMaterial({ album }: { album: Album }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // 有真实封面时异步加载，失败静默回退到程序化封面
  useEffect(() => {
    setTexture(null);
    if (!album.cover) return;
    const loader = new THREE.TextureLoader();
    let alive = true;
    loader.load(
      album.cover,
      (t) => {
        if (alive) {
          t.colorSpace = THREE.SRGBColorSpace;
          setTexture(t);
        }
      },
      undefined,
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [album.cover]);

  const fallback = useMemo(
    () => makeCoverTexture(album),
    [album.vanlan, album.year, album.accentColor],
  );

  return (
    <meshStandardMaterial
      map={texture ?? fallback}
      roughness={0.5}
      metalness={0}
    />
  );
}

function AlbumCard({
  album,
  index,
  active,
  onSelect,
  dragOffset,
}: {
  album: Album;
  index: number;
  active: boolean;
  onSelect: (i: number) => void;
  dragOffset: { current: number };
}) {
  const n = ALBUMS.length;
  const group = useRef<THREE.Group>(null);
  const activeIndex = useOS((s) => s.activeAlbum);

  // 环形偏移，保持 [-n/2, n/2)
  const wrapped = useMemo(() => {
    let o = ((index - activeIndex) % n + n) % n;
    if (o > n / 2) o -= n;
    return o;
  }, [index, activeIndex, n]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const isActive = wrapped === 0;
    const drag = isActive ? 0 : Math.sign(wrapped) * 0;
    const targetX = (isActive ? 0 : wrapped * SPREAD) + drag + dragOffset.current * (isActive ? 0.3 : 1);
    const targetY = isActive ? 0.22 : -Math.abs(wrapped) * 0.04;
    const targetZ = isActive ? 0.7 : -Math.abs(wrapped) * 0.55;
    const targetRotY = -wrapped * 0.4;
    const targetScale = isActive ? 1 : Math.max(0.5, 0.74 - Math.abs(wrapped) * 0.05);

    // Reduced Motion：直接到位（无运动）
    if (useOS.getState().reducedMotion) {
      group.current.position.set(targetX, targetY, targetZ);
      group.current.rotation.y = targetRotY;
      group.current.scale.setScalar(targetScale);
      return;
    }
    // R11 §六：线性恒速运动（禁止 damp = exponential "ease-out"）
    // 速度单位/秒，按轴调整：位置 ~2.8、旋转 ~2.4 rad/s、scale ~2.4
    const stepPos = 2.8 * delta;
    const stepRot = 2.4 * delta;
    const stepScale = 2.4 * delta;
    group.current.position.x = moveToward(group.current.position.x, targetX, stepPos);
    group.current.position.y = moveToward(group.current.position.y, targetY, stepPos);
    group.current.position.z = moveToward(group.current.position.z, targetZ, stepPos);
    group.current.rotation.y = moveToward(group.current.rotation.y, targetRotY, stepRot);
    const next = moveToward(group.current.scale.x, targetScale, stepScale);
    group.current.scale.setScalar(next);
  });

  return (
    <group ref={group}>
      {/* 白色外框背板 */}
      <mesh castShadow position={[0, 0, -0.02]} scale={[1.08, 1.08, 1]}>
        <boxGeometry args={[SIZE, SIZE, 0.03]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      {/* 封面 */}
      <mesh
        castShadow
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (!active) onSelect(index);
        }}
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <CoverMaterial album={album} />
      </mesh>
    </group>
  );
}

export default function AlbumCarousel() {
  const mode = useOS((s) => s.mode);
  const activeAlbum = useOS((s) => s.activeAlbum);
  const setActiveAlbum = useOS((s) => s.setActiveAlbum);

  // 第七轮：移动端隐藏 3D 横向大轮播 —— 专辑展示改由 ALBUM 面板
  // （MobileContentSafeArea 内 ‹/› 卡片）负责，兽头/空间保持主体。
  const isMobile = useIsMobile();

  // 拖拽状态
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragTotal = useRef(0);
  const dragOffset = useRef(0);
  const lastWheel = useRef(0);

  // wheel + 键盘切换（仅桌面 ALBUM 模式；移动端由面板按钮接管，
  // 避免滚轮翻专辑与内容卡片滚动冲突）
  useEffect(() => {
    if (mode !== 'ALBUM' || isMobile) return;

    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheel.current < 450) return;
      if (Math.abs(e.deltaY) < 24 && Math.abs(e.deltaX) < 24) return;
      lastWheel.current = now;
      if (e.deltaY > 0 || e.deltaX > 0) useOS.getState().nextAlbum();
      else useOS.getState().prevAlbum();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') useOS.getState().nextAlbum();
      if (e.key === 'ArrowLeft') useOS.getState().prevAlbum();
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [mode, isMobile]);

  // 非 ALBUM 模式 / 移动端隐藏（第八轮 MUSIC 并入 ALBUM；移动端由面板卡片接管）
  const visible = mode === 'ALBUM' && !isMobile;

  // 拖拽：透明感应平面
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragTotal.current = 0;
  };
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragTotal.current = e.clientX - dragStartX.current;
    dragOffset.current = THREE.MathUtils.clamp(
      dragTotal.current * 0.004,
      -0.8,
      0.8,
    );
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    dragOffset.current = 0;
    if (dragTotal.current < -60) useOS.getState().nextAlbum();
    else if (dragTotal.current > 60) useOS.getState().prevAlbum();
  };

  if (!visible) return null;

  return (
    <group
      position={[0, 0.72, 1.2]}
      scale={0.8}
      visible={visible}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {ALBUMS.map((album, i) => (
        <AlbumCard
          key={album.vanlan}
          album={album}
          index={i}
          active={i === activeAlbum}
          onSelect={setActiveAlbum}
          dragOffset={dragOffset}
        />
      ))}

      {/* 拖拽感应区（透明） */}
      <mesh position={[0, 0, 1.1]} renderOrder={-1}>
        <planeGeometry args={[7, 3.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
