'use client';

/**
 * OpShell —— R52 舞台外壳
 *
 * 负责三件全局的事：
 *   1. 手势：滚轮 / 触摸上下滑动推进时间轴（面板内部滚动时不劫持）
 *   2. 键盘：↑↓ 步进 2%，L 切换中英文，Home 回到开头
 *   3. 启动幕：等 GLB 就绪 + 最短 900ms，避免闪白
 */

import { useEffect, useState } from 'react';
import AnimeBackdrop from './AnimeBackdrop';
import KemonoHeadCanvas from './KemonoHeadCanvas';
import TimelineScrubber from './TimelineScrubber';
import StageOverlay from './StageOverlay';
import AdminConsole from '@/components/ui/AdminConsole';
import { clamp01, scrub, setProgress } from '@/lib/opTimeline';
import { useOS } from '@/lib/store';

/** 面板内部可滚动区域：滚到底/顶之后才把滚动权交回时间轴 */
function insideScrollable(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.scroll !== undefined) {
      // 容器本身可滚动 → 手势归容器；不可滚动（内容没溢出）才让给时间轴
      return el.scrollHeight - el.clientHeight > 6;
    }
    el = el.parentElement;
  }
  return false;
}

export default function OpShell() {
  const toggleLang = useOS((s) => s.toggleLang);
  const [booted, setBooted] = useState(false);

  // 启动幕
  useEffect(() => {
    const t = window.setTimeout(() => setBooted(true), 1100);
    return () => window.clearTimeout(t);
  }, []);

  // 滚轮推进
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (insideScrollable(e.target)) return;
      const st = useOS.getState();
      if (st.adminOpen || st.qrPlatform) return;
      e.preventDefault();
      // 统一方向：向下滚 = 往后播；统一灵敏度（触控板 / 鼠标分别标定）
      const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 400 : 1;
      setProgress(scrub.progress + (e.deltaY * unit) / 5200);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // 触摸滑动推进
  useEffect(() => {
    let startY = 0;
    let tracking = false;
    let blocked = false;

    const onStart = (e: TouchEvent) => {
      blocked = insideScrollable(e.target);
      if (blocked) return;
      startY = e.touches[0].clientY;
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking || blocked) return;
      if ((e.target as HTMLElement)?.closest?.('.op-timeline')) return;
      const dy = startY - e.touches[0].clientY;
      if (Math.abs(dy) < 2) return;
      e.preventDefault();
      setProgress(scrub.progress + dy / 2600);
      startY = e.touches[0].clientY;
    };
    const onEnd = () => {
      tracking = false;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  // 键盘
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (typing) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        setProgress(scrub.progress + 0.02);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setProgress(scrub.progress - 0.02);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setProgress(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setProgress(1);
      } else if (e.key === 'l' || e.key === 'L') {
        toggleLang();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleLang]);

  return (
    <main className="op-root">
      <AnimeBackdrop />
      <KemonoHeadCanvas />
      <StageOverlay />
      <TimelineScrubber />
      <AdminConsole />

      {/* 启动幕 */}
      <div className={`op-boot${booted ? ' is-done' : ''}`} aria-hidden={booted}>
        <div className="op-boot-inner">
          <span className="op-boot-brand">VANLAN.OS</span>
          <span className="op-boot-line">
            <i />
          </span>
          <span className="op-boot-sub">LOADING 2D OP STAGE</span>
        </div>
      </div>
    </main>
  );
}

/** 供外部快速跳到某个进度（调试 / 深链用） */
export function jumpTo(p: number) {
  setProgress(clamp01(p));
}
