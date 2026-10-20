/**
 * opTimeline —— 动漫 OP 分镜时间轴（R52）
 *
 * 设计要点：
 *  - 单一数据源 `scrub.progress`（0~1，对应 00:00 → 01:30 的 90 秒）。
 *  - 拖动时不触发 React 渲染：3D 层在 useFrame 里直接读，2D 背景在 rAF 里
 *    直接读，只有「进入新章节」这一件事会广播给 React（StageOverlay 换屏）。
 *  - 关键帧用 smoothstep 插值，兽头的旋转 / 推拉 / FOV / 边缘光强度都吃同一套。
 */

export const TOTAL_SEC = 90;
/** 时间码使用 24fps 帧计数（动漫 OP 语感） */
export const FPS = 24;

export type ActId =
  | 'INTRO'
  | 'SOUND'
  | 'COMMISSION'
  | 'MEDIA'
  | 'CREDITS';

export interface Act {
  id: ActId;
  /** ACT 01 */
  code: string;
  /** OP_INTRO */
  en: string;
  /** 中文小标 */
  zh: string;
  /** 起始秒 */
  start: number;
  /** 结束秒 */
  end: number;
  /** 起始进度 0~1 */
  startP: number;
  endP: number;
  accent: string;
}

const S = (sec: number) => sec / TOTAL_SEC;

export const ACTS: Act[] = [
  {
    id: 'INTRO',
    code: 'ACT 01',
    en: 'OP_INTRO',
    zh: '主视觉 · 名片',
    start: 0,
    end: 18,
    startP: S(0),
    endP: S(18),
    accent: '#F35A17',
  },
  {
    id: 'COMMISSION',
    code: 'ACT 02',
    en: 'COMMISSION_STORE',
    zh: '接单 · 工坊',
    start: 18,
    end: 40,
    startP: S(18),
    endP: S(40),
    accent: '#F35A17',
  },
  {
    id: 'SOUND',
    code: 'ACT 03',
    en: 'SOUND_TRACK',
    zh: '原声 · 专辑',
    start: 40,
    end: 60,
    startP: S(40),
    endP: S(60),
    accent: '#FF8A3D',
  },
  {
    id: 'MEDIA',
    code: 'ACT 04',
    en: 'MEDIA_MATRIX',
    zh: '自媒体 · 矩阵',
    start: 60,
    end: 75,
    startP: S(60),
    endP: S(75),
    accent: '#FF8A3D',
  },
  {
    id: 'CREDITS',
    code: 'ACT 05',
    en: 'CREDITS_SYS',
    zh: '职员表 · 终端',
    start: 75,
    end: 90,
    startP: S(75),
    endP: S(90),
    accent: '#8A8F98',
  },
];

export function actAt(p: number): ActId {
  const v = clamp01(p);
  for (let i = ACTS.length - 1; i >= 0; i -= 1) {
    if (v >= ACTS[i].startP) return ACTS[i].id;
  }
  return ACTS[0].id;
}

export function actMeta(id: ActId): Act {
  return ACTS.find((a) => a.id === id) ?? ACTS[0];
}

/* ---------------- 数值工具 ---------------- */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 平滑阶跃（0→1 两端导数为 0，普通三次 smoothstep） */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 在时间轴上把 p 映射到某区间内的 0~1 */
export function localT(p: number, from: number, to: number): number {
  if (to <= from) return 0;
  return clamp01((p - from) / (to - from));
}

/* ---------------- 3D 关键帧 ---------------- */
export interface HeadKey {
  /** 时间轴位置 */
  p: number;
  /** 额外偏航（弧度，叠在基准朝向之上） */
  yaw: number;
  /** 俯仰 */
  pitch: number;
  /** 头部横向偏移（屏幕构图重心） */
  x: number;
  /** 头部纵向偏移 */
  y: number;
  /** 相机距离 */
  camZ: number;
  /** 垂直视场角 */
  fov: number;
  /** 橙色轮廓光强度 */
  rim: number;
  /** 主光强度 */
  key: number;
}

/**
 * 四个章节各一个机位，章节内缓慢推进 —— 让每一次拖动都有连续反馈，
 * 而不是「跳四张图」。数值按 16:9 桌面构图调，窄屏由相机层再补偿。
 * R55：幕序改为 名片 → 工坊 → 专辑 → 片尾，机位跟随各幕重排。
 */
export const HEAD_KEYS: HeadKey[] = [
  { p: 0.0, yaw: 0.34, pitch: -0.02, x: -0.04, y: 0.0, camZ: 3.25, fov: 38, rim: 0.55, key: 1.0 },
  { p: 0.2, yaw: -0.95, pitch: 0.05, x: 0.55, y: -0.03, camZ: 3.55, fov: 42, rim: 1.05, key: 1.15 },
  { p: 0.4444, yaw: -0.16, pitch: 0.03, x: 0.28, y: -0.02, camZ: 3.0, fov: 40, rim: 0.8, key: 1.1 },
  { p: 0.6667, yaw: 0.92, pitch: -0.03, x: 0.44, y: -0.01, camZ: 3.7, fov: 44, rim: 0.95, key: 1.05 },
  { p: 0.8333, yaw: 1.1, pitch: -0.04, x: 0.18, y: 0.0, camZ: 3.65, fov: 44, rim: 0.7, key: 0.9 },
  { p: 1.0, yaw: 1.5, pitch: 0.0, x: 0.0, y: 0.0, camZ: 4.1, fov: 46, rim: 0.45, key: 0.75 },
];

export interface HeadSample {
  yaw: number;
  pitch: number;
  x: number;
  y: number;
  camZ: number;
  fov: number;
  rim: number;
  key: number;
}

export function sampleHead(p: number): HeadSample {
  const v = clamp01(p);
  let i = 0;
  while (i < HEAD_KEYS.length - 2 && v > HEAD_KEYS[i + 1].p) i += 1;
  const a = HEAD_KEYS[i];
  const b = HEAD_KEYS[i + 1];
  const t = smoothstep((v - a.p) / Math.max(b.p - a.p, 1e-6));
  return {
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    camZ: lerp(a.camZ, b.camZ, t),
    fov: lerp(a.fov, b.fov, t),
    rim: lerp(a.rim, b.rim, t),
    key: lerp(a.key, b.key, t),
  };
}

/* ---------------- 时间码 ---------------- */
const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** 00:42:18 —— mm:ss:ff（ff = 帧） */
export function formatTimecode(p: number): string {
  const total = clamp01(p) * TOTAL_SEC;
  const mm = Math.floor(total / 60);
  const ss = Math.floor(total % 60);
  const ff = Math.floor((total % 1) * FPS);
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/** 01:30:00 —— 总时长固定展示 */
export const TOTAL_TIMECODE = formatTimecode(1);

/* ---------------- 可变的单例进度 + 订阅 ---------------- */
type FrameCb = (p: number) => void;
type ActCb = (act: ActId, index: number) => void;

const frameSubs = new Set<FrameCb>();
const actSubs = new Set<ActCb>();

/** 直接读取，不进 React；3D 每帧读它 */
export const scrub = {
  progress: 0,
  /** 上一次广播的章节，用于去重 */
  act: 'INTRO' as ActId,
};

export function subscribeFrame(cb: FrameCb): () => void {
  frameSubs.add(cb);
  cb(scrub.progress);
  return () => {
    frameSubs.delete(cb);
  };
}

export function subscribeAct(cb: ActCb): () => void {
  actSubs.add(cb);
  cb(scrub.act, ACTS.findIndex((a) => a.id === scrub.act));
  return () => {
    actSubs.delete(cb);
  };
}

export function setProgress(next: number): number {
  const p = clamp01(next);
  if (Math.abs(p - scrub.progress) < 0.00005) return scrub.progress;
  scrub.progress = p;
  frameSubs.forEach((cb) => cb(p));

  const a = actAt(p);
  if (a !== scrub.act) {
    scrub.act = a;
    const idx = ACTS.findIndex((x) => x.id === a);
    actSubs.forEach((cb) => cb(a, idx));
  }
  return p;
}

export function nudgeProgress(delta: number): number {
  return setProgress(scrub.progress + delta);
}

/* ---------------- 移动端：吸附回退 + 焦点权重 ---------------- */

/** 离 p 最近的幕起点（吸附目标，保证不会卡在两幕中间） */
export function nearestActStart(p: number): number {
  let best = ACTS[0].startP;
  let bd = Infinity;
  for (const a of ACTS) {
    const d = Math.abs(p - a.startP);
    if (d < bd) {
      bd = d;
      best = a.startP;
    }
  }
  return best;
}

let settleRaf = 0;

/** 指数阻尼插值到目标进度；每帧只有一次 setProgress，不触发 React 渲染 */
export function settleProgress(target: number, stiffness = 13): void {
  cancelSettle();
  const goal = clamp01(target);
  let last = performance.now();
  let idle = 0;

  const step = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const p = scrub.progress;
    const next = p + (goal - p) * (1 - Math.exp(-stiffness * dt));
    setProgress(next);

    if (Math.abs(goal - next) < 0.0004) {
      idle += 1;
      // 连续两帧贴近目标即正式落位，避免浮点尾巴永远收敛不完
      if (idle >= 2) {
        setProgress(goal);
        settleRaf = 0;
        return;
      }
    } else {
      idle = 0;
    }
    settleRaf = window.requestAnimationFrame(step);
  };

  settleRaf = window.requestAnimationFrame(step);
}

export function cancelSettle(): void {
  if (settleRaf) {
    window.cancelAnimationFrame(settleRaf);
    settleRaf = 0;
  }
}

export function isSettling(): boolean {
  return settleRaf !== 0;
}

/**
 * 焦点权重 1 → 0（移动端淡出缩放用）。
 *
 * 幕内前 58% 保持满权重，越靠近幕尾越退焦；返回 0 表示该面板已「退到背景」。
 * 只输出 0~1 的锐度，具体的不透明度 / 缩放区间交给 CSS：
 *   opacity = 0.35 + 0.65 × focus, scale = 0.94 + 0.06 × focus
 */
export function actFocus(p: number): number {
  const v = clamp01(p);
  const act = ACTS.find((a) => v >= a.startP && v < a.endP) ?? ACTS[ACTS.length - 1];
  const len = Math.max(act.endP - act.startP, 1e-6);
  const t = clamp01((v - act.startP) / len);
  return 1 - smoothstep(clamp01((t - 0.58) / 0.42));
}

/**
 * 章节内插值权重（用于 2D 背景层的切换）。
 *
 * 设计成「硬切」而非对称交叉淡化：
 *   · 出场层在 [endP - fade, endP] 内淡出，endP 之后立即归零；
 *   · 入场层在 [startP - fade, startP + 0.3·fade] 内快速升起；
 *   → 两个大字报不会在边界处长期 50/50 叠影，切换读起来像分镜硬切。
 */
export function actWeight(p: number, act: Act, fade = 0.006): number {
  const v = clamp01(p);
  const isFirst = act.startP === 0;
  const isLast = act.endP === 1;
  if (v < act.startP - fade || v > act.endP) return 0;

  let w = 1;
  // 入场：在到达 startP 前的 fade 窗口内升到 ~0.77，越过 startP 后迅速到 1
  if (!isFirst && v < act.startP + fade * 0.3) {
    w = Math.min(w, clamp01((v - (act.startP - fade)) / (fade * 1.3)));
  }
  // 出场：endP 前的 fade 窗口内降到 0，endP 处精确归零
  if (!isLast && v > act.endP - fade) {
    w = Math.min(w, clamp01((act.endP - v) / fade));
  }
  return w;
}

/* ---------------- 分镜文案（2D 背景与标题层共用，R56 抽出） ---------------- */
export interface ActCopy {
  line1: string;
  line2: string;
  sub: string;
  tag: string;
}

export const ACT_COPY: Record<ActId, ActCopy> = {
  INTRO: {
    line1: 'VANLAN',
    line2: 'COMPOSER & CREATOR',
    sub: '交互式个人终端 · INTERACTIVE PORTFOLIO',
    tag: 'OP // MAIN VISUAL',
  },
  SOUND: {
    line1: 'SOUND',
    line2: 'TRACK / 03',
    sub: '原创编曲 · 混音 · 音色设计',
    tag: 'OP // THEME SONG',
  },
  MEDIA: {
    line1: 'MEDIA',
    line2: 'MATRIX // ON AIR',
    sub: '自媒体矩阵 · 全平台内容生态',
    tag: 'OP // INFO CARD',
  },
  COMMISSION: {
    line1: 'COMMERCIAL',
    line2: 'WORKS // OPEN',
    sub: '编曲 / 混音 / 3D 角色 / 商业定制',
    tag: 'OP // STORE DESK',
  },
  CREDITS: {
    line1: 'CREDITS',
    line2: 'STAFF ROLL',
    sub: '系统状态 · 语言 · 管理员终端',
    tag: 'OP // END CARD',
  },
};
