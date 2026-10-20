'use client';

/**
 * StarField —— 纯银河星场（R68）
 *
 * 设计取向：不做星盘、不做黄道刻度、不做星座连线。只有一片冷的银河，
 * 和散落在里面的十颗可交互星体。层级越少，越像深空。
 *
 * 结构：
 *   1. 银河层：一块离屏 canvas，进章节时绘制一次（星云带 + 微星 + 亮星）。
 *      拖拽时只改整层的 translate3d 做视差，永不重绘。
 *   2. 星体层：10 颗星按球面 (theta, phi, radius) 透视投影，单条 rAF 直写
 *      transform / opacity，拖动与自转都不进 React。
 *
 * 性能：DPR 封顶 1.5，静态层零重绘，rAF 在静置且无交互时降频到 20fps。
 */

import { useEffect, useRef, useState } from 'react';
import {
  KIND_COLOR,
  KIND_SIZE,
  kpFX,
  useKeplerStars,
  useKeplerUI,
  type KeplerStar,
} from '@/lib/kepler';
import { chime } from '@/lib/keplerAudio';

const TAU = Math.PI * 2;

function colorOf(s: KeplerStar): string {
  return s.color || KIND_COLOR[s.kind] || KIND_COLOR.planet;
}

/* ------------------------------------------------------------------
   银河绘制：一次成型，之后只做 transform
   ------------------------------------------------------------------ */

/** 确定性随机：同一个种子每次刷新星图一致，不会「换一片天」 */
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function paintGalaxy(cv: HTMLCanvasElement, W: number, H: number) {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(W * dpr));
  cv.height = Math.max(1, Math.round(H * dpr));
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;

  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const rnd = makeRandom(20261020);

  /* ---- 1. 全场面星点：幂律亮度，多数极暗，少数很亮 ---- */
  const field = Math.round(Math.min(1500, (W * H) / 1400));
  for (let i = 0; i < field; i += 1) {
    const x = rnd() * W;
    const y = rnd() * H;
    const t = Math.pow(rnd(), 2.6);
    const r = 0.24 + t * 1.05;
    const a = 0.1 + t * 0.72;
    ctx.fillStyle =
      rnd() > 0.8 ? `rgba(178, 208, 255, ${a})` : `rgba(242, 248, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  /* ---- 2. 十几颗带十字芒的亮星：深空的「锚点」 ---- */
  const bright = 14;
  for (let i = 0; i < bright; i += 1) {
    const x = W * (0.06 + rnd() * 0.88);
    const y = H * (0.08 + rnd() * 0.84);
    const size = 0.9 + rnd() * 0.9;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 16);
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    halo.addColorStop(0.22, 'rgba(206, 230, 255, 0.34)');
    halo.addColorStop(0.6, 'rgba(132, 178, 255, 0.1)');
    halo.addColorStop(1, 'rgba(132, 178, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, size * 16, 0, TAU);
    ctx.fill();

    // 十字芒：两条极细的线性渐变
    const len = size * (16 + rnd() * 14);
    const spikeH = ctx.createLinearGradient(x - len, y, x + len, y);
    spikeH.addColorStop(0, 'rgba(200, 226, 255, 0)');
    spikeH.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    spikeH.addColorStop(1, 'rgba(200, 226, 255, 0)');
    ctx.fillStyle = spikeH;
    ctx.fillRect(x - len, y - 0.35, len * 2, 0.7);

    const spikeV = ctx.createLinearGradient(x, y - len, x, y + len);
    spikeV.addColorStop(0, 'rgba(200, 226, 255, 0)');
    spikeV.addColorStop(0.5, 'rgba(255, 255, 255, 0.42)');
    spikeV.addColorStop(1, 'rgba(200, 226, 255, 0)');
    ctx.fillStyle = spikeV;
    ctx.fillRect(x - 0.35, y - len, 0.7, len * 2);
  }
}

/* ------------------------------------------------------------------
   闪烁层：一颗「星」= 一张预渲染光斑 + 相位不同的正弦呼吸
   ------------------------------------------------------------------ */

type Twinkle = { x: number; y: number; r: number; phase: number; speed: number; amp: number };

let sprite: HTMLCanvasElement | null = null;

/** 预渲染一颗星的光斑（只做一次），后面每帧只是 drawImage */
function starSprite(): HTMLCanvasElement | null {
  if (sprite) return sprite;
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const c = cv.getContext('2d');
  if (!c) return null;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.16, 'rgba(228, 242, 255, 0.86)');
  g.addColorStop(0.42, 'rgba(148, 194, 255, 0.26)');
  g.addColorStop(1, 'rgba(110, 160, 255, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  sprite = cv;
  return sprite;
}

function buildTwinkles(W: number, H: number): Twinkle[] {
  const rnd = makeRandom(77123);
  const n = Math.round(Math.min(96, Math.max(44, (W * H) / 16000)));
  const list: Twinkle[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = Math.pow(rnd(), 1.7);
    list.push({
      x: rnd() * W,
      y: rnd() * H,
      r: 1.1 + t * 3.4,
      phase: rnd() * TAU,
      speed: 0.5 + rnd() * 1.5,
      amp: 0.35 + rnd() * 0.65,
    });
  }
  return list;
}


/* ------------------------------------------------------------------ */

export default function StarField() {
  const stars = useKeplerStars((s) => s.stars);
  const selectedId = useKeplerUI((s) => s.selectedId);
  const filter = useKeplerUI((s) => s.filter);

  const rootRef = useRef<HTMLDivElement>(null);
  const galaxyRef = useRef<HTMLCanvasElement>(null);
  const twinkleRef = useRef<HTMLCanvasElement>(null);
  const twinkles = useRef<Twinkle[]>([]);
  const starRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const reticleRef = useRef<HTMLDivElement>(null);
  const probeCodeRef = useRef<HTMLSpanElement>(null);
  const probeNameRef = useRef<HTMLElement>(null);
  const probeMetaRef = useRef<HTMLSpanElement>(null);

  const starsRef = useRef(stars);
  starsRef.current = stars;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  hoverRef.current = hoverId;

  const targetRef = useRef(selectedId);
  targetRef.current = selectedId;

  /** 视角状态：yaw / pitch + 惯性速度 */
  const view = useRef({ yaw: 0.35, pitch: -0.12, vyaw: 0, vpitch: 0, flyYaw: null as number | null });

  /* ---------- 星空：进章节画一次底图，闪烁层建一次表 ---------- */
  useEffect(() => {
    const cv = galaxyRef.current;
    const tw = twinkleRef.current;
    if (!cv) return;

    const build = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      paintGalaxy(cv, W, H);
      twinkles.current = buildTwinkles(W, H);
      if (tw) {
        const dpr = Math.min(1.25, window.devicePixelRatio || 1);
        tw.width = Math.max(1, Math.round(W * dpr));
        tw.height = Math.max(1, Math.round(H * dpr));
        tw.style.width = `${W}px`;
        tw.style.height = `${H}px`;
      }
    };
    build();

    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* ---------- 选中：把星星转到黄金分割位 ---------- */
  useEffect(() => {
    if (!selectedId) {
      view.current.flyYaw = null;
      return;
    }
    const star = stars.find((s) => s.id === selectedId);
    if (!star) return;
    const x0 = star.radius * Math.cos(star.phi) * Math.cos(star.theta);
    const z0 = star.radius * Math.cos(star.phi) * Math.sin(star.theta);
    const az = Math.atan2(x0, z0);
    // 目标方位角 -0.62rad ≈ 屏幕左侧 38% 处
    let target = -0.62 - az;
    const cur = view.current.yaw;
    target = cur + ((((target - cur) % TAU) + TAU * 1.5) % TAU) - Math.PI;
    view.current.flyYaw = target;
    chime(star.kind === 'star' ? 523.25 : 659.25, 0.16);
  }, [selectedId, stars]);

  /* ---------- 主循环 ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const galaxy = galaxyRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;

    let raf = 0;
    let dragging = false;
    let last = performance.now();
    let acc = 0;
    let W = window.innerWidth;
    let H = window.innerHeight;

    /* ---- 闪烁层节拍 ---- */
    const twCanvas = twinkleRef.current;
    let twLast = 0;
    let meteor = { active: false, t0: 0, x: 0, y: 0, vx: 0, vy: 0, life: 1000 };
    let nextMeteor = performance.now() + 3200 + Math.random() * 4200;

    /** 几十颗星按各自的相位呼吸；每帧只做 drawImage，成本可以忽略 */
    const drawTwinkle = (now: number) => {
      if (!twCanvas || now - twLast < 42) return;
      twLast = now;
      const ctx = twCanvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const sp = starSprite();
      if (!sp) return;
      const t = now / 1000;
      const conv = kpFX.converge;
      const fieldAlpha = 1 - conv * 0.9;

      for (const s of twinkles.current) {
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const a = (0.16 + pulse * 0.84) * s.amp * fieldAlpha;
        if (a <= 0.01) continue;
        const size = s.r * (2.4 + pulse * 2.1);
        ctx.globalAlpha = a;
        ctx.drawImage(sp, s.x - size / 2, s.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      /* 偶尔划过的流星：久不久来一颗，提醒你这是活的天空 */
      if (!meteor.active && now > nextMeteor && conv < 0.05) {
        const sx = W * (0.42 + Math.random() * 0.5);
        const sy = H * (0.06 + Math.random() * 0.34);
        meteor = {
          active: true,
          t0: now,
          x: sx,
          y: sy,
          vx: -W * 0.00042,
          vy: H * 0.00055,
          life: 820 + Math.random() * 420,
        };
        nextMeteor = now + 6800 + Math.random() * 6200;
      }
      if (meteor.active) {
        const k = (now - meteor.t0) / meteor.life;
        if (k >= 1) {
          meteor.active = false;
        } else {
          const x = meteor.x + meteor.vx * (now - meteor.t0);
          const y = meteor.y + meteor.vy * (now - meteor.t0);
          const fade = Math.sin(k * Math.PI);
          const tail = 120 + fade * 90;
          const len = Math.hypot(meteor.vx, meteor.vy) || 1;
          const tx = x - (meteor.vx / len) * tail;
          const ty = y - (meteor.vy / len) * tail;
          const g = ctx.createLinearGradient(x, y, tx, ty);
          g.addColorStop(0, `rgba(232, 244, 255, ${0.85 * fade * fieldAlpha})`);
          g.addColorStop(0.45, `rgba(160, 200, 255, ${0.28 * fade * fieldAlpha})`);
          g.addColorStop(1, 'rgba(120, 170, 255, 0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      }
    };


    const measure = () => {
      W = window.innerWidth;
      H = window.innerHeight;
    };
    measure();
    window.addEventListener('resize', measure);

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;

      // 闪烁层自己控频（≈24fps），静置时也不停 —— 「星星在动」是这片天的底气
      drawTwinkle(now);

      const v = view.current;
      // 静置且无飞行：降频到 20fps
      const still = !v.vyaw && !v.vpitch && v.flyYaw === null && kpFX.converge === 0 && !dragging;
      if (still && acc < 0.05) return;

      // ---- 视角积分 ----
      if (v.flyYaw !== null) {
        const diff = v.flyYaw - v.yaw;
        v.yaw += diff * (1 - Math.exp(-3.4 * dt));
        if (Math.abs(diff) < 0.002) {
          v.yaw = v.flyYaw;
          v.flyYaw = null;
        }
      } else {
        v.yaw += v.vyaw * dt;
        v.pitch += v.vpitch * dt;
        v.vyaw *= Math.exp(-3.2 * dt);
        v.vpitch *= Math.exp(-3.2 * dt);
        if (Math.abs(v.vyaw) < 0.004) v.vyaw = 0;
        if (Math.abs(v.vpitch) < 0.004) v.vpitch = 0;
        if (!reduce && !dragging && !targetRef.current) v.yaw += dt * 0.028;
      }
      v.pitch = Math.max(-1.15, Math.min(1.15, v.pitch));

      // ---- 银河视差：只动整层，绝不重绘 ----
      if (galaxy) {
        const gx = -v.yaw * 34;
        const gy = v.pitch * 26;
        galaxy.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) scale(1.05)`;
        galaxy.style.opacity = String(1 - kpFX.converge * 0.92);
      }

      const zoom = Math.max(1, Math.min(2.2, kpFX.zoom));
      const camZ = (5.35 / zoom) * (1 - kpFX.focus * 0.16);
      const f = Math.min(H * 1.12, W * 1.34);
      const cx = W / 2;
      const cy = H * 0.5;

      const cyaw = Math.cos(v.yaw);
      const syaw = Math.sin(v.yaw);
      const cp = Math.cos(v.pitch);
      const sp = Math.sin(v.pitch);
      const conv = kpFX.converge;

      const pts = new Map<string, { x: number; y: number; z: number }>();

      for (const s of starsRef.current) {
        const el = starRefs.current.get(s.id);
        if (!el) continue;

        const cphi = Math.cos(s.phi);
        const x = s.radius * cphi * Math.cos(s.theta);
        const y = s.radius * Math.sin(s.phi);
        const z = s.radius * cphi * Math.sin(s.theta);

        const x1 = x * cyaw + z * syaw;
        const z1 = -x * syaw + z * cyaw;
        const y1 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const zc = z2 + camZ;
        if (zc < 0.4) {
          el.style.opacity = '0';
          continue;
        }

        const sc = f / zc;
        let sx = cx + x1 * sc;
        let sy = cy + y1 * sc;

        // 谢幕坍缩：绕中心旋进
        if (conv > 0) {
          const ang = conv * 2.6;
          const dr = Math.hypot(sx - cx, sy - cy) * (1 - conv * 0.93);
          const a = Math.atan2(sy - cy, sx - cx) + ang;
          sx = cx + Math.cos(a) * dr;
          sy = cy + Math.sin(a) * dr;
        }

        const depth = Math.max(0, Math.min(1, (zc - 2.4) / 5.4));
        const dimmed =
          (filterRef.current && s.album !== filterRef.current) ||
          (targetRef.current && targetRef.current !== s.id);

        const base = Math.max(0.55, Math.min(2.5, sc / 230));
        const scale = base * KIND_SIZE[s.kind] * (1 - conv * 0.7);
        const edgeFade = Math.max(
          0,
          Math.min(1, (W / 2 + 140 - Math.abs(sx - cx)) / 140, (H / 2 + 140 - Math.abs(sy - cy)) / 140),
        );
        const op =
          (1 - depth * 0.62) * edgeFade * (dimmed ? 0.2 : 1) * (1 - conv * 0.9);

        el.dataset.x = String(sx);
        el.dataset.y = String(sy);
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(zc * 100));
        // 远景模糊（景深）—— 小屏关掉，省一次 raster
        if (!small) {
          const blur = depth > 0.55 ? (depth - 0.55) * 3.2 : 0;
          if (Math.abs(Number(el.dataset.blur || 0) - blur) > 0.12) {
            el.dataset.blur = blur.toFixed(2);
            el.style.filter = blur > 0.12 ? `blur(${blur.toFixed(2)}px)` : '';
          }
        }
        pts.set(s.id, { x: sx, y: sy, z: zc });
      }

      // ---- 准星 / 读数 ----
      const locked = targetRef.current || hoverRef.current;
      const p = locked ? pts.get(locked) : null;
      const ret = reticleRef.current;
      if (ret) {
        if (p && conv < 0.1) {
          ret.style.opacity = '1';
          ret.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        } else {
          ret.style.opacity = '0';
        }
      }
      const probeStar = locked ? starsRef.current.find((x) => x.id === locked) : null;
      if (probeStar) {
        const code = `STAR ${probeStar.id.toUpperCase()} · ${probeStar.year || '——'}`;
        const meta = `${probeStar.album} · ${probeStar.kind === 'star' ? 'PRIMARY' : 'SATELLITE'}`;
        if (probeCodeRef.current && probeCodeRef.current.textContent !== code) {
          probeCodeRef.current.textContent = code;
        }
        if (probeNameRef.current && probeNameRef.current.textContent !== probeStar.name) {
          probeNameRef.current.textContent = probeStar.name;
        }
        if (probeMetaRef.current && probeMetaRef.current.textContent !== meta) {
          probeMetaRef.current.textContent = meta;
        }
      } else if (probeNameRef.current && probeNameRef.current.textContent !== '自由漫游') {
        if (probeCodeRef.current) probeCodeRef.current.textContent = 'KEPLER';
        probeNameRef.current.textContent = '自由漫游';
        if (probeMetaRef.current) {
          probeMetaRef.current.textContent = `${starsRef.current.length} 颗星 · 拖动 / 选中任意一颗`;
        }
      }
      acc = 0;
    };

    raf = window.requestAnimationFrame(loop);

    /* ---------- 拖拽 / 双指缩放 ---------- */
    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinch = 0;

    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.kp-star') || t.closest('.kp-card') || t.closest('.kp-compass')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragging = true;
        view.current.vyaw = 0;
        view.current.vpitch = 0;
        root.setPointerCapture(e.pointerId);
      } else if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId)!;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        const [a, b] = Array.from(pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch > 0) {
          kpFX.zoom = Math.max(1, Math.min(2.2, kpFX.zoom * (dist / lastPinch)));
        }
        lastPinch = dist;
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      view.current.yaw += dx * 0.0042;
      view.current.pitch += dy * 0.0028;
      view.current.vyaw = dx * 0.12;
      view.current.vpitch = dy * 0.08;
      view.current.flyYaw = null;
      if (Math.abs(dx) + Math.abs(dy) > 2) root.classList.add('is-dragging');
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinch = 0;
      if (pointers.size === 0) {
        dragging = false;
        root.classList.remove('is-dragging');
      }
    };

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    return () => {
      window.cancelAnimationFrame(raf);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className="kp-space" ref={rootRef}>
      {/* 星场：底图一块 canvas 画一次，闪烁层另一块每帧轻量重绘 */}
      <canvas className="kp-galaxy" ref={galaxyRef} aria-hidden />
      <canvas className="kp-twinkle" ref={twinkleRef} aria-hidden />

      {/* 星群 */}
      <div className="kp-stars">
        {stars.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`kp-star is-${s.kind}${selectedId === s.id ? ' is-on' : ''}${
              hoverId === s.id ? ' is-hover' : ''
            }`}
            style={{ '--star': colorOf(s) } as React.CSSProperties}
            ref={(el) => {
              if (el) starRefs.current.set(s.id, el);
              else starRefs.current.delete(s.id);
            }}
            aria-label={`${s.name} · ${s.album}`}
            onPointerEnter={() => {
              setHoverId(s.id);
              chime(s.kind === 'star' ? 587.33 : 880, 0.09);
            }}
            onPointerLeave={() => setHoverId((v) => (v === s.id ? null : v))}
            onClick={(e) => {
              e.stopPropagation();
              const ui = useKeplerUI.getState();
              ui.select(ui.selectedId === s.id ? null : s.id);
            }}
          >
            <span className="kp-star-glow" />
            <span className="kp-star-rays" />
            <span className="kp-star-core" />
            {s.lyric && <span className="kp-star-lyric">{s.lyric}</span>}
          </button>
        ))}
      </div>

      {/* 锁定准星 */}
      <div className="kp-reticle" ref={reticleRef} aria-hidden>
        <i /><i /><i /><i />
        <span className="kp-reticle-core" />
      </div>

      {/* 天体读数 */}
      <div className="kp-probe" aria-live="polite">
        <span className="kp-probe-code" ref={probeCodeRef}>
          KEPLER
        </span>
        <b className="kp-probe-name" ref={probeNameRef}>
          自由漫游
        </b>
        <span className="kp-probe-meta" ref={probeMetaRef}>
          共 {stars.length} 颗星 · 拖动 / 选中任意一颗
        </span>
      </div>
    </div>
  );
}
