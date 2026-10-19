'use client';

/**
 * TimelineScrubber —— 右侧垂直时间轴（R52）
 *
 * 交互契约：
 *   · 按住轨道任意位置拖动 → 直接 scrub（Pointer Events + setPointerCapture，跟手无延迟）
 *   · 点击刻度 / 章节锚点 → 吸附跳转
 *   · 滚轮与触摸由 OpShell 统一接管（这里只负责显示与拖拽）
 *
 * 性能：拖拽与播放头位置都通过 rAF 订阅直接写 DOM（transform / textContent），
 * 不走 React state，避免每帧重渲染整棵树。
 */

import { useEffect, useRef } from 'react';
import {
  ACTS,
  TOTAL_SEC,
  TOTAL_TIMECODE,
  clamp01,
  formatTimecode,
  scrub,
  setProgress,
  subscribeFrame,
} from '@/lib/opTimeline';

const TICK_STEP = 5; // 每 5 秒一条刻度

export default function TimelineScrubber() {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);

  // 播放头 / 时间码：订阅时间轴，直写样式
  useEffect(() => {
    return subscribeFrame((p) => {
      const pct = `${(p * 100).toFixed(3)}%`;
      if (fillRef.current) fillRef.current.style.height = pct;
      if (thumbRef.current) thumbRef.current.style.top = pct;
      if (nowRef.current) nowRef.current.textContent = formatTimecode(p);
    });
  }, []);

  const progressFromY = (clientY: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return clamp01((clientY - r.top) / Math.max(r.height, 1));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setProgress(progressFromY(e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setProgress(progressFromY(e.clientY));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <aside className="op-timeline" aria-label="时间轴控制器 Timeline">
      {/* 时间码 */}
      <div className="op-tl-clock">
        <span ref={nowRef} className="op-tl-now">
          00:00:00
        </span>
        <span className="op-tl-total">/ {TOTAL_TIMECODE}</span>
      </div>

      {/* 轨道 */}
      <div
        ref={trackRef}
        className="op-tl-track"
        role="slider"
        tabIndex={0}
        aria-label="拖动以浏览分镜"
        aria-valuemin={0}
        aria-valuemax={TOTAL_SEC}
        aria-valuenow={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            setProgress(clamp01(scrub.progress + 0.02));
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            setProgress(clamp01(scrub.progress - 0.02));
          }
        }}
      >
        <div className="op-tl-rail" />
        <div ref={fillRef} className="op-tl-fill" />

        {/* 刻度 */}
        {Array.from({ length: TOTAL_SEC / TICK_STEP + 1 }).map((_, i) => {
          const sec = i * TICK_STEP;
          const major = ACTS.some((a) => a.start === sec);
          return (
            <i
              key={sec}
              className={`op-tl-tick${major ? ' is-major' : ''}`}
              style={{ top: `${(sec / TOTAL_SEC) * 100}%` }}
            />
          );
        })}

        {/* 播放头 */}
        <div ref={thumbRef} className="op-tl-thumb">
          <span className="op-tl-thumb-dot" />
        </div>

        {/* 章节锚点 */}
        {ACTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="op-tl-anchor"
            style={{ top: `${(a.start / TOTAL_SEC) * 100}%` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setProgress(a.startP + 0.001);
            }}
            aria-label={`跳到 ${a.code} ${a.en}`}
          >
            <b>{a.code.replace('ACT ', '')}</b>
          </button>
        ))}
      </div>

      {/* 底部参数 */}
      <div className="op-tl-meta">
        <span>BPM 92</span>
        <span>·</span>
        <span>24 FPS</span>
      </div>
    </aside>
  );
}
