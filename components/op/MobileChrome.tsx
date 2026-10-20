'use client';

/**
 * MobileChrome —— 移动端竖屏专用的「顶部章节胶囊栏 + 右缘极简滑轨」（R73）
 *
 * R66 只做了「标题 + 底部横条」，两个痛点：
 *   1. 底部横条吃掉最后 30px，名片卡被迫上抬，一屏塞不下；
 *   2. 只能滑，不能「点某一章直达」。
 *
 * R73 改成：
 *   · 顶部一行：VANLAN.OS + [01 名片][02 工坊][03 试听][04 矩阵][05 片尾][✦ 星图]
 *     章节名与真实分镜序号一致（工坊就是 ACT 02），点一下 gotoAct 直达；
 *   · 右缘 3px 竖轨：`--p` 直写 scaleY / top，全程 0 React 渲染，按住可拖动；
 *   · 底部彻底让空，名片卡能贴到屏幕下沿 14px。
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
import { openKepler } from '@/lib/kepler';

const ACT_LABEL: Record<ActId, string> = {
  INTRO: '名片',
  COMMISSION: '工坊',
  SOUND: '试听',
  MEDIA: '矩阵',
  CREDITS: '片尾',
};

/** 跳到某幕起点（+1e-3 保证 actAt 落在这幕而不是上一幕边界） */
const jump = (id: ActId) => {
  const act = ACTS.find((a) => a.id === id) ?? ACTS[0];
  cancelSettle();
  setProgress(act.startP + 0.001);
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

  // --p 直写：竖轨填充与拖点都靠它换算，不经过 React
  useEffect(() => {
    return subscribeFrame((p) => {
      rootRef.current?.style.setProperty('--p', p.toFixed(4));
    });
  }, []);

  const progressFromY = (clientY: number): number => {
    const el = railRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return clamp01(1 - (clientY - r.top) / Math.max(r.height, 1));
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    cancelSettle();
    e.currentTarget.setPointerCapture(e.pointerId);
    setProgress(progressFromY(e.clientY));
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setProgress(progressFromY(e.clientY));
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

  return (
    <div ref={rootRef} className="op-mchrome">
      <header className="op-mhead">
        <span className="op-mhead-brand">VANLAN.OS</span>

        <nav className="op-macts" aria-label="章节切换">
          {ACTS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={`op-mact${act === a.id ? ' is-on' : ''}`}
              aria-current={act === a.id}
              onClick={() => jump(a.id)}
            >
              <i className="op-num">{String(i + 1).padStart(2, '0')}</i>
              {ACT_LABEL[a.id]}
            </button>
          ))}
          <button
            type="button"
            className="op-mact is-kp"
            aria-label="进入克卜勒星图"
            onClick={() => openKepler()}
          >
            <i aria-hidden>✦</i>星图
          </button>
        </nav>
      </header>

      {/* data-drawer：让 OpShell 的全局滑动手势让位给这条竖轨 */}
      <div className="op-mrail" data-drawer>
        <div
          ref={railRef}
          className="op-mrail-track"
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
          <span className="op-mrail-fill" />
          <span className="op-mrail-dot" />
        </div>
      </div>
    </div>
  );
}
