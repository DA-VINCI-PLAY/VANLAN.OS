'use client';

/**
 * OpShell —— R52 舞台外壳
 *
 * 负责三件全局的事：
 *   1. 手势：滚轮 / 触摸上下滑动推进时间轴（面板内部滚动时不劫持）
 *   2. 键盘：↑↓ 步进 2%，L 切换中英文，Home 回到开头
 *   3. 开场引导：1.5s 动漫 OP 片头，680ms 时点亮 3D 兽头（破空入场）
 */

import { useEffect, useState } from 'react';
import AnimeBackdrop from './AnimeBackdrop';
import KemonoHeadCanvas from './KemonoHeadCanvas';
import OpHeadline from './OpHeadline';
import FeaturedCarousel from './FeaturedCarousel';
import MobileWorksDrawer from './MobileWorksDrawer';
import MobileChrome from './MobileChrome';
import IntroSequence from './IntroSequence';
import TimelineScrubber from './TimelineScrubber';
import StageOverlay from './StageOverlay';
import AdminConsole from '@/components/ui/AdminConsole';
import KeplerPortal from '@/components/kepler/KeplerPortal';
import { openKepler, useKeplerUI } from '@/lib/kepler';
import {
  actFocus,
  cancelSettle,
  clamp01,
  nearestActStart,
  scrub,
  setProgress,
  settleProgress,
  subscribeFrame,
} from '@/lib/opTimeline';
import { useOS } from '@/lib/store';

/** 面板内部可滚动区域：滚到底/顶之后才把滚动权交回时间轴 */
function insideScrollable(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== document.body) {
    // 移动端抽屉整体接管手势，不做逐元素判断
    if (el.dataset && el.dataset.drawer !== undefined) return true;
    if (el.dataset && el.dataset.scroll !== undefined) {
      // 容器本身可滚动 → 手势归容器；不可滚动（内容没溢出）才让给时间轴
      return el.scrollHeight - el.clientHeight > 6;
    }
    el = el.parentElement;
  }
  return false;
}

const NARROW = '(max-width: 767px)';
const isNarrow = () =>
  typeof window !== 'undefined' && window.matchMedia(NARROW).matches;

export default function OpShell() {
  const toggleLang = useOS((s) => s.toggleLang);
  /** 片头揭幕进度：680ms 时点亮兽头，片头本身由 CSS 动画自主跑满 1.5s */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setReady(true), reduce ? 40 : 680);
    return () => window.clearTimeout(t);
  }, []);

  // 滚轮推进
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (insideScrollable(e.target)) return;
      const st = useOS.getState();
      if (st.adminOpen || st.qrPlatform) return;
      // 星空章节打开时，滚轮归它自己（墨/缩放/谢幕）
      if (useKeplerUI.getState().open) return;
      e.preventDefault();
      // 片尾再往下滚 = 潜入克卜勒星图
      if (scrub.progress > 0.994 && e.deltaY > 4) {
        openKepler();
        return;
      }
      cancelSettle();
      // 统一方向：向下滚 = 往后播；统一灵敏度（触控板 / 鼠标分别标定）
      const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 400 : 1;
      setProgress(scrub.progress + (e.deltaY * unit) / 5200);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // 触摸滑动推进：窄屏灵敏度更高（一次滑动≈一幕），松手吸附到幕起点
  useEffect(() => {
    let startY = 0;
    let tracking = false;
    let blocked = false;
    let travel = 0;

    const onStart = (e: TouchEvent) => {
      if (useKeplerUI.getState().open) return;
      cancelSettle();
      blocked = insideScrollable(e.target);
      travel = 0;
      if (blocked) return;
      startY = e.touches[0].clientY;
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      if (useKeplerUI.getState().open) return;
      if (!tracking || blocked) return;
      if ((e.target as HTMLElement)?.closest?.('.op-timeline')) return;
      const dy = startY - e.touches[0].clientY;
      if (Math.abs(dy) < 2) return;
      e.preventDefault();
      travel += dy;
      // 窄屏 1250：约 200px 的滑动 ≈ 一幕，既跟手又不用反复划
      setProgress(scrub.progress + dy / (isNarrow() ? 1250 : 2600));
      startY = e.touches[0].clientY;
    };
    const onEnd = () => {
      const wasTracking = tracking && !blocked;
      tracking = false;
      // 片尾继续上滑 = 潜入克卜勒星图
      if (wasTracking && scrub.progress > 0.99 && travel > 60) {
        openKepler();
        return;
      }
      // 回退保护：手机端松手后吸附到最近幕起点，绝不卡在两幕之间
      if (wasTracking && isNarrow() && Math.abs(travel) > 12) {
        settleProgress(nearestActStart(scrub.progress));
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // 焦点权重：把 actFocus 写进 .op-stage-layer 的 CSS 变量，
  // 移动端由 CSS 换算成 opacity / scale —— 全程不触发 React 重渲染
  useEffect(() => {
    const layer = document.querySelector<HTMLElement>('.op-stage-layer');
    if (!layer) return;
    let last = -1;
    return subscribeFrame((p) => {
      const f = actFocus(p);
      if (Math.abs(f - last) < 0.004) return;
      last = f;
      layer.style.setProperty('--focus', f.toFixed(3));
    });
  }, []);

  // 键盘
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useKeplerUI.getState().open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (typing) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (scrub.progress > 0.99) {
          openKepler();
          return;
        }
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
    <main className={`op-root${ready ? ' is-ready' : ''}`}>
      <AnimeBackdrop />
      <KemonoHeadCanvas />
      <OpHeadline />
      <FeaturedCarousel />
      <MobileWorksDrawer />
      <StageOverlay />
      <TimelineScrubber />
      <MobileChrome />
      <AdminConsole />
      <KeplerPortal />

      {/* 动漫 OP 开场引导 + 首次交互提示 */}
      <IntroSequence ready={ready} />
    </main>
  );
}

/** 供外部快速跳到某个进度（调试 / 深链用） */
export function jumpTo(p: number) {
  setProgress(clamp01(p));
}
