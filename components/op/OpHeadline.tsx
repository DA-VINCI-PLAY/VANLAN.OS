'use client';

/**
 * OpHeadline —— 标题层（R56 从 AnimeBackdrop 抽出）
 *
 * 层级位于 3D 兽头之上、前景面板之下（z-index 15）：
 * 动漫 OP 的标准构图是标题压在角色身上，兽头不再遮挡 VANLAN。
 *
 * 驱动方式与 AnimeBackdrop 一致：单 rAF 读 scrub.progress，
 * 直写 4 个标题的 opacity / --lp / transform + is-enter 入场类，零 React 渲染。
 */

import { useEffect, useRef } from 'react';
import { ACTS, ACT_COPY, actWeight, scrub } from '@/lib/opTimeline';

export default function OpHeadline() {
  const rootRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<Record<string, HTMLElement | null>>({});
  const enteredRef = useRef<Record<string, boolean>>({});
  const enterTimers = useRef<Record<string, number>>({});
  // 启动幕 1100ms 后才允许触发（否则开场动画被启动幕盖住白播一遍）
  const bootGateRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    bootGateRef.current = performance.now() + 1700;
    let raf = 0;

    const tick = () => {
      const p = scrub.progress;
      const now = performance.now();

      for (let i = 0; i < ACTS.length; i += 1) {
        const act = ACTS[i];
        const el = actRefs.current[act.id];
        if (!el) continue;
        const w = actWeight(p, act);
        el.style.opacity = w.toFixed(3);
        // 层内局部进度：视差用
        const lt = (p - act.startP) / Math.max(act.endP - act.startP, 1e-6);
        el.style.setProperty('--lp', Math.max(0, Math.min(1, lt)).toFixed(4));
        // 章节切换时轻微升降，与背景层保持同款「翻页」错位
        el.style.transform = `translate3d(0, ${((1 - w) * 26).toFixed(2)}px, 0)`;

        // 入场引导：激活瞬间挂类播逐字动画，1.4s 后摘下
        if (w > 0.5 && !enteredRef.current[act.id] && now > bootGateRef.current) {
          enteredRef.current[act.id] = true;
          window.clearTimeout(enterTimers.current[act.id]);
          el.classList.add('is-enter');
          enterTimers.current[act.id] = window.setTimeout(() => {
            el.classList.remove('is-enter');
          }, 1400);
        } else if (w < 0.02 && enteredRef.current[act.id]) {
          enteredRef.current[act.id] = false;
          window.clearTimeout(enterTimers.current[act.id]);
          el.classList.remove('is-enter');
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} className="op-headline-layer" aria-hidden>
      {ACTS.map((act) => {
        const copy = ACT_COPY[act.id];
        return (
          <h1
            key={act.id}
            data-act={act.id}
            ref={(el) => {
              actRefs.current[act.id] = el;
            }}
            className={`op-headline op-headline-${act.id.toLowerCase()}`}
          >
            <span className="op-line op-line-outline">
              {copy.line1.split('').map((ch, i) => (
                <span key={i} className="op-ch" style={{ ['--i' as string]: i }}>
                  {ch}
                </span>
              ))}
            </span>
            <span className="op-line op-line-solid">{copy.line2}</span>
          </h1>
        );
      })}
    </div>
  );
}
