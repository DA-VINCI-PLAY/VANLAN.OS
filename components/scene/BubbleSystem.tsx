'use client';

/**
 * Bubble System —— 漂浮在数字空间中的信息节点
 * - 气泡只出现在头部上方 / 左上 / 右上高位的"弧线带"，
 *   让出屏幕右下（Content UI）与下方（Navigation / Audio）的空间
 * - 切换 Mode：逐个从空间中生成（120~200ms stagger，自下而上 + 淡入）
 * - 常态：缓慢升降 + 左右漂移（周期约 2~8s，自然呼吸感）
 * - 移动端：数量收敛到 2~3 个，坐标向内收拢、上移，远离底部内容区
 */

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { isCompactLandscape, MOTION, QUALITY_CFG } from '@/lib/perf';
import { useOS, type Mode } from '@/lib/store';
import { SOCIALS } from '@/content/social';
import { qqAdd, QQ_UIN } from '@/lib/qq';

type BubbleAction =
  | { type: 'link'; url: string }
  | { type: 'qr'; platform: string }
  | { type: 'copy'; label: string; value: string }
  | { type: 'qq' }
  | { type: 'album'; index: number }
  | { type: 'none' };

interface BubbleSpec {
  label: string;
  /** 桌面坐标：头部（0,2,0）上方弧线带 */
  position: [number, number, number];
  scale: number;
  action: BubbleAction;
}

/* Phase 01 动画去同步（§十五）：入场匀速 linear（与相机/光照/面板时长错开） */
const easeLinear = (x: number) => x;

/* 弧线槽位（世界坐标，头部 y≈2.0）：
 * - 左高 / 右高：头顶两侧
 * - 左中：头部左侧偏上
 * - 头顶：头部正上方（略偏）
 */
const SLOT = {
  UP_L: [-1.95, 3.62, 0.2],
  UP_R: [1.62, 3.66, 0.2],
  UP_C: [0.28, 3.85, 0.15],
  MID_L: [-2.2, 2.75, 0.5],
} as const;

const byMode = (
  label: string,
  pos: readonly [number, number, number],
  action: BubbleAction,
  scale = 1,
): BubbleSpec => ({
  label,
  position: [...pos],
  scale,
  action,
});

/* 社交渠道值按 id 取（避免对 SOCIALS 顺序做脆弱索引引用） */
const socialValue = (id: string): string =>
  SOCIALS.find((s) => s.id === id)?.value ?? '#';

/* 各模式气泡（5 模式收敛后）：
 * GALLERY —— 作品类型关键词（纯装饰，交互在右下档案面板）
 * CONTACT —— 高频联系渠道（WECHAT QR / EMAIL COPY / BILIBILI LINK / QQ COPY）
 * ALBUM   —— 以中央 3D 封面轮播为核心：不叠加气泡，保持留白
 * ABOUT   —— 身份关键词（纯装饰，内容在 ABOUT 公众身份条面板）
 */
const BUBBLES: Record<Exclude<Mode, 'HOME'>, BubbleSpec[]> = {
  GALLERY: [
    byMode('MV', SLOT.UP_L, { type: 'none' }),
    byMode('VLOG', SLOT.UP_R, { type: 'none' }),
    byMode('INTERVIEW', SLOT.UP_C, { type: 'none' }, 0.85),
  ],
  CONTACT: [
    byMode('WECHAT', SLOT.UP_L, { type: 'qr', platform: 'wechat' }),
    byMode('EMAIL', SLOT.UP_R, {
      type: 'copy',
      label: 'EMAIL',
      value: 'jason901888@163.com',
    }),
    byMode('BILIBILI', SLOT.UP_C, { type: 'link', url: socialValue('bilibili') }, 0.85),
    byMode('QQ', SLOT.MID_L, { type: 'qq' }, 0.85),
  ],
  ALBUM: [],
  ABOUT: [
    byMode('COMPOSER', SLOT.UP_L, { type: 'none' }),
    byMode('MUSICIAN', SLOT.UP_R, { type: 'none' }),
    byMode('CREATOR', SLOT.UP_C, { type: 'none' }, 0.8),
    byMode('VANLAN', SLOT.MID_L, { type: 'none' }, 0.85),
  ],
};

/* 移动端：向内收拢 + 上移 + 最多保留 3 个 */
function mobileSpecs(list: BubbleSpec[]): BubbleSpec[] {
  const n = Math.min(3, list.length);
  return list.slice(0, n).map((s) => ({
    ...s,
    position: [s.position[0] * 0.6, s.position[1] + 0.35, s.position[2] - 0.02],
  }));
}

function Bubble({
  spec,
  index,
}: {
  spec: BubbleSpec;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const spawn = useRef(0);
  // Phase 01 去同步：每气泡不同入场时长（0.7/0.9/1.1s）+ 错峰 delay
  const delay = index * (0.12 + (index % 3) * 0.04);
  const dur = 0.7 + (index % 3) * 0.2;
  const total = dur + delay;

  // 每气泡独立的漂移参数（确定性种子），主漂移周期约 2~6s
  const drift = useMemo(() => {
    const seed = index * 1.7 + spec.label.length * 0.37;
    return {
      ampY: 0.04 + (seed % 0.3) * 0.06,
      ampX: 0.04 + (seed % 0.26) * 0.05,
      speedY: 1.1 + (seed % 0.9) * 0.35, // 2π/1.1≈5.7s → 2π/2≈3.1s
      speedX: 0.75 + (seed % 0.7) * 0.45,
      phase: seed,
    };
  }, [index, spec.label]);

  useFrame((state, delta) => {
    if (!group.current || !matRef.current) return;
    const rm = useOS.getState().reducedMotion;
    // Reduced Motion：入场后近乎静止（漂移速度 ×0.06 → 周期拉长 16 倍）
    const driftScale = rm ? MOTION.bubbleDriftRM : MOTION.bubbleDrift;

    spawn.current = Math.min(total, spawn.current + delta);
    const p = THREE.MathUtils.clamp((spawn.current - delay) / dur, 0, 1);
    const e = easeLinear(p);

    const t = state.clock.elapsedTime + drift.phase;
    const floatY = Math.sin(t * drift.speedY * driftScale) * drift.ampY;
    const floatX = Math.cos(t * drift.speedX * driftScale) * drift.ampX;

    const targetY = spec.position[1] + floatY;
    group.current.position.set(
      spec.position[0] + floatX * e,
      THREE.MathUtils.lerp(spec.position[1] - 1.7, targetY, e),
      spec.position[2],
    );

    const hoverScale = hovered ? 1.16 : 1;
    group.current.scale.setScalar(spec.scale * e * hoverScale);
    matRef.current.opacity = (flash ? 0.85 : hovered ? 0.68 : 0.42) * e;
  });

  const runAction = () => {
    const a = spec.action;
    switch (a.type) {
      case 'link':
        window.open(a.url, '_blank', 'noopener');
        break;
      case 'qr':
        useOS.getState().setQrPlatform(a.platform);
        break;
      case 'copy':
        navigator.clipboard?.writeText(a.value).catch(() => {});
        setFlash('COPIED');
        window.setTimeout(() => setFlash(null), 1200);
        break;
      case 'qq': {
        const r = qqAdd();
        if (!r.ok && r.wechatBlocked) {
          // 微信内置浏览器禁止 mqqapi/tencent 协议 → 复制号码并提示去浏览器
          navigator.clipboard?.writeText(QQ_UIN).catch(() => {});
          setFlash(`COPIED ${QQ_UIN} — OPEN IN BROWSER`);
          window.setTimeout(() => setFlash(null), 2600);
        }
        break;
      }
      case 'album':
        useOS.getState().setActiveAlbum(a.index);
        useOS.getState().setMode('ALBUM');
        break;
      case 'none':
        break;
    }
  };

  return (
    <group
      ref={group}
      position={[spec.position[0], spec.position[1] - 1.7, spec.position[2]]}
    >
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          runAction();
        }}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          ref={matRef}
          color="#ffffff"
          transparent
          opacity={0}
          roughness={0.08}
          metalness={0.05}
        />
      </mesh>

      <Html center position={[0, -0.55, 0]} distanceFactor={7} zIndexRange={[10, 0]}>
        <div
          style={{ pointerEvents: 'none' }}
          className="text-[10px] tracking-[0.2em] text-ink/80 whitespace-nowrap select-none"
        >
          {flash ?? spec.label}
        </div>
      </Html>
    </group>
  );
}

export default function BubbleSystem({ isMobile }: { isMobile: boolean }) {
  const mode = useOS((s) => s.mode);
  const quality = useOS((s) => s.quality);

  // 手机横屏矮视口：隐藏气泡（居中 Panel 与导航占满底部，避免 UI 重叠 §35）
  const [compact, setCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isCompactLandscape() : false,
  );
  useEffect(() => {
    const check = () => setCompact(isCompactLandscape());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (mode === 'HOME') return null;

  const list = BUBBLES[mode as Exclude<Mode, 'HOME'>];
  if (!list.length || compact) return null;

  // Quality：按档截断气泡数量（High 桌面 6 / Medium 3 / Low 2，移动端更收敛）
  const cap = QUALITY_CFG[quality].bubbleMax[isMobile ? 1 : 0];
  const specs = (isMobile ? mobileSpecs(list) : list).slice(0, cap);
  if (!specs.length) return null;

  return (
    <group key={mode}>
      {specs.map((spec, i) => (
        <Bubble key={`${mode}-${spec.label}`} spec={spec} index={i} />
      ))}
    </group>
  );
}
