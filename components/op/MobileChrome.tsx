'use client';

/**
 * MobileChrome —— 移动端竖屏专用的「Mini Header + 底部微型进度条」（R66）
 *
 * 侧边时间轴在 <768px 会隐藏（抓取带 74px 太占手指），这里补两件替代品：
 *   1. 顶部迷你标题栏：品牌 / 章节序号 / 章节名
 *   2. 底部横向进度条：可直接按住拖动，松手按 nearestActStart 吸附回幕起点
 *
 * 进度条用 --p 自定义属性驱动 scaleX / translate3d，全程不触发 React 渲染；
 * 只在换幕时 setAct 渲染一次。
 */

import { useEffect, useRef, useState } from 'react';
import {
  ACTS,
  type ActId,
  cancelSettle,
  clamp01,
  nearestActStart,
  scrub,
  setProgress,
  settleProgress,
  subscribeAct,
  subscribeFrame,
} from '@/lib/opTimeline';

const ACT_LABEL: Record<ActId, string> = {
  INTRO: '名片',
  COMMISSION: '工坊',
  SOUND: '专辑',
  MEDIA: '矩阵',
  CREDITS: '片尾',
};

export default function MobileChrome() {
  const [act, setAct] = useState<ActId>(scrub.act);
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const off = subscribeAct((a) => setAct(a));
    return () => {
      off();
    };
  }, []);

  // --p 直写：填充条与滑块都靠它换算，不经过 React
  useEffect(() => {
    return subscribeFrame((p) => {
      rootRef.current?.style.setProperty('--p', p.toFixed(4));
    });
  }, []);

  const progressFromX = (clientX: number): number => {
    const el = railRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return clamp01((clientX - r.left) / Math.max(r.width, 1));
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    cancelSettle();
    e.currentTarget.setPointerCapture(e.pointerId);
    setProgress(progressFromX(e.clientX));
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setProgress(progressFromX(e.clientX));
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // 回退保护：松手吸到最近的幕起点，绝不卡在两幕中间
    settleProgress(nearestActStart(scrub.progress));
  };

  const idx = ACTS.findIndex((a) => a.id === act);

  return (
    <div ref={rootRef} className="op-mchrome">
      <header className="op-mhead" aria-hidden>
        <span className="op-mhead-brand">VANLAN.OS</span>
        <span className="op-mhead-sep" />
        <span className="op-mhead-act op-num">
          {String(idx + 1).padStart(2, '0')}/{String(ACTS.length).padStart(2, '0')}
        </span>
        <span className="op-mhead-label">{ACT_LABEL[act]}</span>
      </header>

      {/* data-drawer：让 OpShell 的全局手势让位给这个拖拽条 */}
      <div className="op-mprog" data-drawer>
        <div
          ref={railRef}
          className="op-mprog-rail"
          role="slider"
          tabIndex={-1}
          aria-label="分镜进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrub.progress * 100)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="op-mprog-fill" />
          <span className="op-mprog-dot" />
        </div>
      </div>
    </div>
  );
}
