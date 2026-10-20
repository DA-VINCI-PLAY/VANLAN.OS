'use client';

/**
 * StarField —— 2.5D 克卜勒星盘（R67）
 *
 * 三层结构：
 *   1. SVG 天文星盘：外/中/内三环按不同角速度逆向旋转，模拟机械天体仪
 *   2. 3D 球面星群：每颗星有真实 (theta, phi, radius)，透视投影到屏幕
 *   3. 星座连线：同专辑的星按经度串成呼吸虚线
 *
 * 全部由单条 rAF 直写 transform / opacity / path d，拖动和自转都不进 React。
 * 稳态时若既没拖动也没有自转需求（reduced-motion），循环自动降频到 20fps。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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

/** 12 星座符号（黄道刻度环用） */
const ZODIAC = ['白羊', '金牛', '双子', '巨蟹', '狮子', '室女', '天秤', '天蝎', '人马', '摩羯', '宝瓶', '双鱼'];

function colorOf(s: KeplerStar): string {
  return s.color || KIND_COLOR[s.kind] || KIND_COLOR.planet;
}

export default function StarField() {
  const stars = useKeplerStars((s) => s.stars);
  const selectedId = useKeplerUI((s) => s.selectedId);
  const filter = useKeplerUI((s) => s.filter);

  const rootRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const linkRefs = useRef<Map<string, SVGPathElement[]>>(new Map());
  const ringRefs = useRef<(SVGGElement | null)[]>([]);
  const reticleRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<SVGGElement>(null);
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

  /* ---------- 星座分组（按 album） ---------- */
  const groups = useMemo(() => {
    const map = new Map<string, KeplerStar[]>();
    for (const s of stars) {
      const arr = map.get(s.album) ?? [];
      arr.push(s);
      map.set(s.album, arr);
    }
    return Array.from(map, ([album, list]) => ({
      album,
      list: [...list].sort((a, b) => a.theta - b.theta),
    }));
  }, [stars]);

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
    // 取最短路径
    target = cur + ((((target - cur) % TAU) + TAU * 1.5) % TAU) - Math.PI;
    view.current.flyYaw = target;
    chime(star.kind === 'star' ? 523.25 : 659.25, 0.16);
  }, [selectedId, stars]);

  /* ---------- 主循环 ---------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let dragging = false;
    let last = performance.now();
    let acc = 0;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const measure = () => {
      W = window.innerWidth;
      H = window.innerHeight;
    };
    measure();

    const focusPoint = (id: string | null) => {
      if (!id) return null;
      const el = starRefs.current.get(id);
      if (!el) return null;
      const x = Number(el.dataset.x || 0);
      const y = Number(el.dataset.y || 0);
      return { x, y };
    };

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      // 静态画面（没有拖动 / 惯性 / 飞行 / 自转需求）降到 20fps
      const v = view.current;
      const idle =
        reduce &&
        !v.vyaw &&
        !v.vpitch &&
        v.flyYaw === null &&
        kpFX.converge === 0;
      if (idle && acc < 0.05) return;

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
        if (!reduce && !dragging && !targetRef.current) v.yaw += dt * 0.035;
      }
      v.pitch = Math.max(-1.15, Math.min(1.15, v.pitch));

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

      // ---- 星盘三环视差 ----
      const deg = (v.yaw * 180) / Math.PI;
      const setRing = (i: number, d: number) => {
        const g = ringRefs.current[i];
        if (g) g.setAttribute('transform', `rotate(${d.toFixed(2)} 500 500)`);
      };
      setRing(0, -deg * 0.22);
      setRing(1, deg * 0.4);
      setRing(2, -deg * 0.62 + 12);

      const pts = new Map<string, { x: number; y: number; z: number; r: number }>();

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
          (1 - depth * 0.66) *
          edgeFade *
          (dimmed ? 0.22 : 1) *
          (1 - conv * 0.9);

        el.dataset.x = String(sx);
        el.dataset.y = String(sy);
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(zc * 100));
        // 远景模糊（景深）
        const blur = depth > 0.55 ? (depth - 0.55) * 3.2 : 0;
        if (Math.abs(Number(el.dataset.blur || 0) - blur) > 0.12) {
          el.dataset.blur = blur.toFixed(2);
          el.style.filter = blur > 0.12 ? `blur(${blur.toFixed(2)}px)` : '';
        }
        pts.set(s.id, { x: sx, y: sy, z: zc, r: s.radius });
      }

      // ---- 星座连线 ----
      for (const g of groups) {
        const paths = linkRefs.current.get(g.album);
        if (!paths) continue;
        let d = '';
        const list = g.list;
        for (let i = 0; i < list.length - 1; i += 1) {
          const a = pts.get(list[i].id);
          const b = pts.get(list[i + 1].id);
          if (!a || !b) continue;
          d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        }
        for (const p of paths) p.setAttribute('d', d);
        const dim = filterRef.current && filterRef.current !== g.album;
        for (const p of paths) p.style.opacity = String((dim ? 0.06 : 0.5) * (1 - conv));
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
        const orbit = ((((probeStar.theta * 180) / Math.PI) % 360) + 360) % 360;
        const code = `STAR ID: ${probeStar.id.toUpperCase()} // ${probeStar.year || '——'}`;
        const meta = `ORBIT ${orbit.toFixed(1)}° · ${probeStar.album} · ${probeStar.kind === 'star' ? 'PRIMARY' : 'SATELLITE'}`;
        if (probeCodeRef.current && probeCodeRef.current.textContent !== code) {
          probeCodeRef.current.textContent = code;
        }
        if (probeNameRef.current && probeNameRef.current.textContent !== probeStar.name) {
          probeNameRef.current.textContent = probeStar.name;
        }
        if (probeMetaRef.current && probeMetaRef.current.textContent !== meta) {
          probeMetaRef.current.textContent = meta;
        }
      } else if (probeNameRef.current && probeNameRef.current.textContent !== '自由漫游 · DRAG TO ORBIT') {
        probeCodeRef.current!.textContent = 'KEPLER STARFIELD';
        probeNameRef.current.textContent = '自由漫游 · DRAG TO ORBIT';
        probeMetaRef.current!.textContent = '共 ' + starsRef.current.length + ' 颗星体 · 选中任意一颗开始';
      }

      // 扫描极线
      if (sweepRef.current) {
        sweepRef.current.setAttribute('transform', `rotate(${(now * 0.006) % 360} 500 500)`);
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
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(raf);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', measure);
    };
  }, [groups]);

  return (
    <div className="kp-space" ref={rootRef}>
      <div className="kp-nebula" aria-hidden />
      <div className="kp-vignette" aria-hidden />

      {/* 2D 精密星盘 */}
      <svg className="kp-astrolabe" viewBox="0 0 1000 1000" aria-hidden>
        <defs>
          <radialGradient id="kp-plate" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="rgba(255,216,155,0.05)" />
            <stop offset="100%" stopColor="rgba(255,216,155,0)" />
          </radialGradient>
          <linearGradient id="kp-sweep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,216,155,0.12)" />
            <stop offset="100%" stopColor="rgba(255,216,155,0)" />
          </linearGradient>
        </defs>

        <circle cx="500" cy="500" r="470" fill="url(#kp-plate)" />

        <g ref={(el) => { ringRefs.current[0] = el; }}>
          <circle cx="500" cy="500" r="470" className="kp-ring kp-ring-outer" />
          <circle cx="500" cy="500" r="452" className="kp-ring kp-ring-dim" />
          {Array.from({ length: 120 }).map((_, i) => {
            const major = i % 10 === 0;
            const a = (i / 120) * TAU;
            const r1 = 470;
            const r2 = 470 - (major ? 22 : 10);
            return (
              <line
                key={i}
                x1={500 + Math.cos(a) * r1}
                y1={500 + Math.sin(a) * r1}
                x2={500 + Math.cos(a) * r2}
                y2={500 + Math.sin(a) * r2}
                className={major ? 'kp-tick is-major' : 'kp-tick'}
              />
            );
          })}
          {ZODIAC.map((z, i) => {
            const a = (i / 12) * TAU - Math.PI / 2;
            return (
              <g key={z + i} transform={`rotate(${i * 30} 500 500)`}>
                <text x={500} y={72} className="kp-zodiac" textAnchor="middle">
                  {z}
                </text>
              </g>
            );
          })}
        </g>

        <g ref={(el) => { ringRefs.current[1] = el; }}>
          <circle cx="500" cy="500" r="352" className="kp-ring kp-ring-mid" />
          <circle cx="500" cy="500" r="344" className="kp-ring kp-ring-dim" strokeDasharray="2 9" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * TAU;
            return (
              <line
                key={i}
                x1={500 + Math.cos(a) * 352}
                y1={500 + Math.sin(a) * 352}
                x2={500 + Math.cos(a) * 330}
                y2={500 + Math.sin(a) * 330}
                className="kp-tick"
              />
            );
          })}
        </g>

        {/* 赤经赤纬网格 */}
        <g ref={(el) => { ringRefs.current[2] = el; }} className="kp-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1="500"
              y1="150"
              x2="500"
              y2="850"
              transform={`rotate(${(i / 12) * 180} 500 500)`}
            />
          ))}
          {[110, 220, 300].map((r) => (
            <circle key={r} cx="500" cy="500" r={r} />
          ))}
        </g>

        <circle cx="500" cy="500" r="300" className="kp-ring kp-ring-inner" />
        <g ref={sweepRef}>
          <path d="M500 500 L500 120 A380 380 0 0 1 640 138 Z" fill="url(#kp-sweep)" opacity="0.35" />
          <line x1="500" y1="500" x2="500" y2="120" className="kp-sweep-line" />
        </g>
        <circle cx="500" cy="500" r="3" className="kp-center-dot" />
        <circle cx="500" cy="500" r="18" className="kp-ring kp-ring-dim" />
      </svg>

      {/* 星座连线 */}
      <svg className="kp-links" aria-hidden>
        {groups.map((g) => (
          <g key={g.album}>
            <path
              className="kp-link-glow"
              ref={(el) => {
                if (!el) return;
                const arr = linkRefs.current.get(g.album) ?? [];
                if (!arr.includes(el)) arr.push(el);
                linkRefs.current.set(g.album, arr);
              }}
            />
            <path
              className="kp-link"
              ref={(el) => {
                if (!el) return;
                const arr = linkRefs.current.get(g.album) ?? [];
                if (!arr.includes(el)) arr.push(el);
                linkRefs.current.set(g.album, arr);
              }}
            />
          </g>
        ))}
      </svg>

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
            {s.kind === 'star' && <span className="kp-star-orbit" />}
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
          KEPLER STARFIELD
        </span>
        <b className="kp-probe-name" ref={probeNameRef}>
          自由漫游 · DRAG TO ORBIT
        </b>
        <span className="kp-probe-meta" ref={probeMetaRef}>
          共 {stars.length} 颗星体 · 选中任意一颗开始
        </span>
      </div>
    </div>
  );
}
