'use client';

/**
 * InkLayer —— 黑墨流体转场（R67）
 *
 * 一层全屏 Canvas：用多波峰三次贝塞尔画出不规则的墨面。
 * 边缘的有机感来自三组不同频率的正弦叠加（低频大起伏 + 中频褶皱 + 高频墨齿），
 * 不挂 SVG feTurbulence —— 那个滤镜每帧重建噪声，是整页最贵的一笔。
 *
 * 动画只在 0 → 1 / 1 → 0 的 1 秒出头里跑；两端静止时直接停帧，
 * 稳态不产生任何绘制调用，滚到底也不会白烧 GPU。
 */

import { useEffect, useRef } from 'react';
import { kpFX } from '@/lib/kepler';

let canvasEl: HTMLCanvasElement | null = null;
let inkToken = 0;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function runInkTo(target: number, duration = 1150): Promise<void> {
  const token = ++inkToken;
  const from = kpFX.ink;
  const to = Math.max(0, Math.min(1, target));
  if (Math.abs(to - from) < 0.001) {
    kpFX.ink = to;
    return Promise.resolve();
  }
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now: number) => {
      if (token !== inkToken) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - t0) / duration);
      kpFX.ink = from + (to - from) * easeInOut(t);
      if (t >= 1) {
        kpFX.ink = to;
        resolve();
        return;
      }
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  });
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}

export default function InkLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const dust = useRef<Dust[]>([]);
  const raf = useRef(0);
  const lastInk = useRef(-1);
  const time = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvasEl = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let dpr = 1;
    let W = 0;
    let H = 0;
    let last = performance.now();

    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    /** 墨面上沿：三频叠加，低频定形、中频起浪、高频做墨齿 */
    const edgeY = (i: number, ink: number, tt: number) => {
      const amp = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, ink * 1.06));
      const base = H - H * ink * 1.04;
      return (
        base +
        (30 * Math.sin(i * 0.72 + tt * 0.55) +
          18 * Math.sin(i * 1.31 + tt * 0.9) +
          9 * Math.sin(i * 2.73 - tt * 1.37) +
          5 * Math.sin(i * 5.1 + tt * 1.9)) *
          amp
      );
    };

    const draw = (ink: number, tt: number) => {
      ctx.clearRect(0, 0, W, H);
      if (ink <= 0.001) return;

      const N = 16;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i += 1) {
        pts.push({ x: (i / N) * (W + 40) - 20, y: edgeY(i, ink, tt) });
      }

      // 墨体
      ctx.beginPath();
      ctx.moveTo(-2, H + 2);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        const p = pts[i - 1];
        const c = pts[i];
        const mx = (p.x + c.x) / 2;
        const my = (p.y + c.y) / 2;
        ctx.quadraticCurveTo(p.x, p.y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(W + 2, H + 2);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, H - H * ink * 1.04, 0, H);
      grad.addColorStop(0, '#0d1528');
      grad.addColorStop(0.35, '#060b18');
      grad.addColorStop(1, '#02040c');
      ctx.fillStyle = grad;
      ctx.fill();

      // 墨缘：冷蓝细线 + 微弱外发光
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        const p = pts[i - 1];
        const c = pts[i];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2);
      }
      ctx.strokeStyle = 'rgba(150, 190, 255, 0.26)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(120, 168, 255, 0.5)';
      ctx.shadowBlur = 22;
      ctx.stroke();
      ctx.restore();

      // 墨滴：从边缘往上飘的冷星尘
      const arr = dust.current;
      if (ink < 0.995 && Math.random() < 0.55) {
        const idx = Math.floor(Math.random() * (N + 1));
        arr.push({
          x: pts[idx].x + (Math.random() - 0.5) * 80,
          y: pts[idx].y + Math.random() * 20,
          vx: (Math.random() - 0.5) * 14,
          vy: -12 - Math.random() * 34,
          r: 0.6 + Math.random() * 1.7,
          life: 1,
        });
      }
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        const d = arr[i];
        d.x += d.vx * 0.016;
        d.y += d.vy * 0.016;
        d.vy *= 0.995;
        d.life -= 0.012;
        if (d.life <= 0 || d.y < -20) {
          arr.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 222, 255, ${0.45 * d.life})`;
        ctx.fill();
      }
      if (arr.length > 64) arr.splice(0, arr.length - 64);
    };

    const loop = (now: number) => {
      raf.current = window.requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ink = kpFX.ink;

      // 把墨量与星光强度同步给 CSS（深空底色、星盘、星群一起亮起来）
      const host = canvas.parentElement;
      if (host && Math.abs(ink - lastInk.current) > 0.002) {
        host.style.setProperty('--kp-ink', ink.toFixed(3));
        const glow = Math.max(0, Math.min(1, (ink - 0.6) / 0.36));
        host.style.setProperty('--kp-stars', glow.toFixed(3));
      }

      // 稳态：完全透明 / 完全覆盖时停止绘制
      // 完全覆盖时把画布藏起来，否则它会把下面的星空整片挡住
      if (ink <= 0.001 || ink >= 0.999) {
        if (lastInk.current !== ink && ink <= 0.001) {
          ctx.clearRect(0, 0, W, H);
        }
        canvas.style.opacity = '0';
        lastInk.current = ink;
        return;
      }

      time.current += dt;
      canvas.style.opacity = '1';
      draw(ink, time.current);
      lastInk.current = ink;
    };

    raf.current = window.requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      if (canvasEl === canvas) canvasEl = null;
      ctx.clearRect(0, 0, W, H);
    };
  }, []);

  return (
    <canvas ref={ref} className="kp-ink" aria-hidden />
  );
}
