'use client';

/**
 * KeplerPortal —— 星空章节总装（R67）
 *
 * 相位机（唯一的 React 状态源）：
 *   idle ──open──▶ ink-in ──墨满──▶ space ──上滚/返回──▶ finale
 *        ──再上滚/跳过──▶ ink-out ──墨退──▶ idle
 *
 * 墨的进度、坍缩、缩放都在 kpFX 里逐帧跑，只有相位切换才进 React。
 */

import { useEffect, useRef, useState } from 'react';
import InkLayer, { runInkTo } from './InkLayer';
import StarField from './StarField';
import StoryCard from './StoryCard';
import KeplerCompass from './KeplerCompass';
import KeplerFinale from './KeplerFinale';
import SubmissionModal from './SubmissionModal';
import {
  kpFX,
  openKepler,
  useKeplerStars,
  useKeplerUI,
  useSubmissions,
} from '@/lib/kepler';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function KeplerPortal() {
  const open = useKeplerUI((s) => s.open);
  const phase = useKeplerUI((s) => s.phase);
  const setPhase = useKeplerUI((s) => s.setPhase);
  const close = useKeplerUI((s) => s.close);
  const select = useKeplerUI((s) => s.select);
  const setSubmitOpen = useKeplerUI((s) => s.setSubmitOpen);
  const submitOpen = useKeplerUI((s) => s.submitOpen);

  const rootRef = useRef<HTMLDivElement>(null);
  const upAcc = useRef(0);
  const touchY = useRef(0);
  /** R80：中央引导语在交互或 3.5s 后淡出，避免压住星盘 */
  const [introGone, setIntroGone] = useState(false);

  useEffect(() => {
    if (!open) {
      setIntroGone(false);
      return;
    }
    const t = window.setTimeout(() => setIntroGone(true), 3500);
    const hide = () => setIntroGone(true);
    window.addEventListener('pointerdown', hide, { passive: true });
    window.addEventListener('wheel', hide, { passive: true });
    window.addEventListener('touchstart', hide, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', hide);
      window.removeEventListener('wheel', hide);
      window.removeEventListener('touchstart', hide);
    };
  }, [open]);

  /* 深链：#/kepler 直接入轨（分享 / 移动端快捷方式用） */
  useEffect(() => {
    const check = () => {
      if (window.location.hash.replace('#', '') === 'kepler') openKepler();
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  /* 首次进入：hydrate + 复位所有逐帧变量 */
  useEffect(() => {
    if (!open) return;
    useKeplerStars.getState().hydrate();
    useSubmissions.getState().hydrate();
    kpFX.ink = 0;
    kpFX.converge = 0;
    kpFX.focus = 0;
    kpFX.zoom = 1;
    upAcc.current = 0;
  }, [open]);

  /* 墨入 */
  useEffect(() => {
    if (phase !== 'ink-in') return;
    let alive = true;
    void runInkTo(1, 1250).then(() => {
      if (alive) setPhase('space');
    });
    return () => {
      alive = false;
    };
  }, [phase, setPhase]);

  /* 墨退 */
  useEffect(() => {
    if (phase !== 'ink-out') return;
    select(null);
    setSubmitOpen(false);
    let alive = true;
    void runInkTo(0, 1050).then(() => {
      if (alive) close();
    });
    return () => {
      alive = false;
    };
  }, [phase, close, select, setSubmitOpen]);

  /* 坍缩 / 复位 */
  useEffect(() => {
    const target = phase === 'finale' ? 1 : 0;
    const from = kpFX.converge;
    if (from === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 700);
      const e = 1 - Math.pow(1 - t, 3);
      kpFX.converge = from + (target - from) * e;
      if (t < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [phase]);

  /* 滚轮：上滚进谢幕，谢幕再上滚退回地表；下滚回到星图 / 拉近 */
  useEffect(() => {
    if (!open) return;
    const onWheel = (e: WheelEvent) => {
      const st = useKeplerUI.getState();
      if (st.submitOpen) return;
      e.preventDefault();
      if (st.phase === 'space') {
        if (e.deltaY < 0) {
          upAcc.current += -e.deltaY;
          if (upAcc.current > 130) {
            upAcc.current = 0;
            st.select(null);
            st.setPhase('finale');
          }
        } else {
          upAcc.current = 0;
          kpFX.zoom = clamp(kpFX.zoom + e.deltaY * 0.0011, 1, 2.2);
        }
      } else if (st.phase === 'finale') {
        if (e.deltaY < -8) st.setPhase('ink-out');
        else if (e.deltaY > 30) st.setPhase('space');
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [open]);

  /* 触摸：双指缩放交给 StarField；这里只在谢幕阶段接管上下滑 */
  useEffect(() => {
    if (!open) return;
    const onStart = (e: TouchEvent) => {
      touchY.current = e.touches[0]?.clientY ?? 0;
    };
    const onMove = (e: TouchEvent) => {
      const st = useKeplerUI.getState();
      if (st.submitOpen || st.phase !== 'finale' || e.touches.length !== 1) return;
      const dy = touchY.current - e.touches[0].clientY;
      if (Math.abs(dy) < 70) return;
      touchY.current = e.touches[0].clientY;
      if (dy > 0) st.setPhase('ink-out');
      else st.setPhase('space');
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
    };
  }, [open]);

  /* 键盘 */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const st = useKeplerUI.getState();
      if (e.key === 'Escape') {
        e.preventDefault();
        if (st.submitOpen) st.setSubmitOpen(false);
        else if (st.selectedId) st.select(null);
        else if (st.phase === 'space') st.setPhase('finale');
        else if (st.phase === 'finale') st.setPhase('ink-out');
      } else if (e.key === 'ArrowUp' && st.phase === 'space' && !st.submitOpen) {
        e.preventDefault();
        st.select(null);
        st.setPhase('finale');
      } else if (e.key === 'ArrowDown' && st.phase === 'finale' && !st.submitOpen) {
        e.preventDefault();
        st.setPhase('space');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className={`kp-root is-${phase}${submitOpen ? ' is-modal' : ''}`} ref={rootRef}>
      <StarField />
      <InkLayer />

      <header className="kp-hud">
        <div className="kp-hud-brand">
          <b>KEPLER</b>
          <span>克卜勒星图音乐故事集</span>
        </div>
        <div className="kp-hud-meta">
          <span>CHAPTER 06 · DEEP FIELD</span>
          <button
            type="button"
            onClick={() => {
              const st = useKeplerUI.getState();
              if (st.phase === 'finale') st.setPhase('ink-out');
              else if (st.phase === 'space') {
                st.select(null);
                st.setPhase('finale');
              }
            }}
            aria-label="离开星图"
          >
            EXIT ↑
          </button>
        </div>
      </header>

      <div className={`kp-intro-title${introGone ? ' is-gone' : ''}`} aria-hidden>
        <span>AND THE STARS REMEMBER</span>
        <h2>每一颗星，都是一句没说完的话</h2>
      </div>

      <KeplerCompass />
      <StoryCard />

      {phase === 'finale' && (
        <KeplerFinale
          onSubmit={() => setSubmitOpen(true)}
          onExit={() => setPhase('ink-out')}
          onBack={() => setPhase('space')}
        />
      )}

      <SubmissionModal />

      <div className="kp-tip">
        <span>拖拽旋转星盘</span>
        <i />
        <span>滚轮 / 双指缩放</span>
        <i />
        <span>点击星星听故事</span>
      </div>
    </div>
  );
}
