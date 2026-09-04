/**
 * VANLAN.OS 性能分级体系 —— HIGH / MEDIUM / LOW（+ FALLBACK 见 RenderRoot）
 *
 * 原则（第五轮约束）：
 * - 性能判断不依赖"设备型号/是否手机"一刀切，而是综合多项能力 + 缺失 API 安全回退。
 * - HIGH 也不允许无限堆效果；各档都给出明确上限。
 * - 视觉可降级，但 Character / 白建筑 / 窗 / 导航 / 内容在任何档都必须保留。
 * - 运行时 FPS 自适应只允许"向下"或"回升到初始档"，带 hysteresis 防抖动。
 */

import type { Quality } from './store';

/* ---------------- 每档渲染参数 ---------------- */

export interface QualityCfg {
  /** 桌面 DPR 上限（Canvas 构造期使用，运行期不可变） */
  dprCap: number;
  /** 移动 DPR 上限 */
  dprCapMobile: number;
  /** 是否启用实时阴影（Canvas shadows） */
  shadows: boolean;
  antialias: boolean;
  /** 参与 castShadow 的方向光数量（0 = 全关实时阴影） */
  castShadowLights: 0 | 1 | 2;
  /** shadow map 尺寸（宽=高） */
  shadowMapSize: number;
  /** 微尘粒子数 [desktop, mobile]（0 = 关闭） */
  dust: [number, number];
  /** 窗外黑色 ember 粒子数 [desktop, mobile]（仅 HOME 渲染；0 = 关闭） */
  embers: [number, number];
  /** 气泡上限 [desktop, mobile]（0 = 不渲染） */
  bubbleMax: [number, number];
  /** 右后窗副光强度系数（0 = 移除该光源效果） */
  rightLightScale: number;
  /** 天眼 SpotLight 强度系数 */
  spotLightScale: number;
  /** 石膏是否挂程序化 roughness/normal 微纹理（LOW 纯色） */
  plasterTexture: boolean;
  /** 兽头底部接触阴影柔影盘不透明度（0 = 关闭） */
  contactShadowOpacity: number;
  /** 建筑浅浮雕条数 [desktop, mobile]（0 = 无装饰，LOW 关闭） */
  reliefCount: [number, number];
}

export const QUALITY_CFG: Record<Quality, QualityCfg> = {
  high: {
    dprCap: 2,
    dprCapMobile: 1.5,
    shadows: true,
    antialias: true,
    castShadowLights: 2,
    shadowMapSize: 1024,
    dust: [90, 40],
    bubbleMax: [6, 3],
    embers: [140, 64],
    rightLightScale: 1,
    spotLightScale: 1,
    plasterTexture: true,
    contactShadowOpacity: 0.26,
    reliefCount: [4, 2],
  },
  medium: {
    dprCap: 1.5,
    dprCapMobile: 1.25,
    shadows: true,
    antialias: true,
    castShadowLights: 1,
    shadowMapSize: 512,
    dust: [48, 22],
    bubbleMax: [3, 2],
    embers: [80, 36],
    rightLightScale: 0.55,
    spotLightScale: 0.7,
    plasterTexture: true,
    contactShadowOpacity: 0.18,
    reliefCount: [2, 0],
  },
  low: {
    dprCap: 1,
    dprCapMobile: 1,
    shadows: false,
    antialias: false,
    castShadowLights: 0,
    shadowMapSize: 0,
    dust: [0, 0],
    bubbleMax: [2, 1],
    embers: [0, 0],
    rightLightScale: 0.35,
    spotLightScale: 0.5,
    plasterTexture: false,
    contactShadowOpacity: 0,
    reliefCount: [0, 0],
  },
};

/* ---------------- 能力检测（全部安全回退，不假设 API 存在） ---------------- */

/** WebGL 可用性：同步探测（不可用时走 2D Fallback，绝不停在加载屏） */
export function webglSupported(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const c = document.createElement('canvas');
    const gl =
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      c.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** OS / 浏览器 Reduced Motion 偏好 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** 视口取向：手机横屏矮视口（判断 compact 场景布局 / 气泡隐藏） */
export function isCompactLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w > h && h <= 560;
}

export interface DeviceSignals {
  cores: number;
  /** 单位 GB；未知时为 undefined（不算低端） */
  memoryGB: number | undefined;
  dpr: number;
  mobile: boolean;
  reducedMotion: boolean;
  /** 内存指纹缺失时按 cores 粗估，避免把未知当低端 */
}

export function readSignals(): DeviceSignals {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  // ?? 安全回退：API 不存在时给保守中值，不直接假设
  const cores =
    (nav as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  const memoryRaw = (nav as unknown as { deviceMemory?: number }).deviceMemory;
  const memoryGB = typeof memoryRaw === 'number' ? memoryRaw : undefined;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return {
    cores,
    memoryGB,
    dpr,
    mobile: isCoarsePointer() || (typeof window !== 'undefined' && window.innerWidth < 768),
    reducedMotion: prefersReducedMotion(),
  };
}

/**
 * 硬件检测 → Quality。
 * 明确避开"mobile ⇒ LOW"的粗暴映射：
 * 手机用多个维度（cores / memory / DPR）一起看，强机芯手机可达 HIGH。
 */
export function detectQuality(): Quality {
  const s = readSignals();
  // Reduced Motion 是独立轴：降低动画而不必砍画质，此处不影响画质档
  const mem = s.memoryGB ?? (s.cores >= 8 ? 4 : s.cores >= 4 ? 2 : 1);

  // HIGH：①强核 + 大内存 + 高 DPR（旗舰手机/高分屏） 或 ②顶级多核台式机（即使 dpr=1）
  const high =
    (s.cores >= 6 && mem >= 4 && s.dpr >= 1.5) || (s.cores >= 8 && mem >= 8);
  const med = s.cores >= 3 && mem >= 2 && s.dpr >= 1;

  // 只有双维度都明显弱时才给 LOW（例如 2 核 + 1GB 老手机、虚拟机）
  if (!med) return 'low';
  if (high) return 'high';
  return 'medium';
}

/** Quality 相对顺序（FPS 升降级比较用） */
const ORDER: Record<Quality, number> = { high: 2, medium: 1, low: 0 };

export function rankOf(q: Quality): number {
  return ORDER[q];
}

export function qualityFromRank(r: number): Quality {
  if (r <= 0) return 'low';
  if (r >= 2) return 'high';
  return 'medium';
}

/* ---------------- 动画减载（Reduced Motion） ---------------- */

export const MOTION = {
  /** 相机模式切换时长（s）：rm 时直接切换而非大幅摇镜 */
  cameraDuration: 1.5,
  cameraDurationRM: 0.25,
  /** 光照渐变时间常数（λ，95% 收敛 ≈ 3/λ ≈ 1.8s）——
   *  Phase 01 动画去同步：光照慢于相机 1.5s，形成"先构图后亮灯"的层次 */
  lightingRate: 1.65,
  /** 角色漂浮幅度系数（rm = 0 → 静态） */
  floatScale: 1,
  floatScaleRM: 0,
  /** 气泡漂移速度系数 */
  bubbleDrift: 1,
  bubbleDriftRM: 0.06,
};
