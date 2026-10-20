'use client';

/**
 * IntroSequence —— 动漫 OP 开场引导（R66）
 *
 * 1.5s 一次性开场：
 *   0.00 ~ 0.30s  深钛黑底 + 品牌逐字入场
 *   0.08 ~ 0.70s  橙色激光扫描线自上而下掠过
 *   0.50 ~ 1.34s  六道斜切百叶窗交错（奇数上 / 偶数下）向外揭开，露出暖白 OP 背景
 *   0.92 ~ 1.30s  品牌标记淡出
 *
 * 全部只动 transform / opacity，跑在合成层上；`ready` 由 OpShell 在 680ms 打开，
 * 触发 .op-canvas 的 scale(0.85)→1 淡入 + 特斯拉红光晕。
 *
 * 引导手势：开场结束后浮出，用户第一次 滚轮 / 触摸 / 点击 / 按键 即 0.4s 淡出并永久隐藏。
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { subscribeAct } from '@/lib/opTimeline';

const BLINDS = 6;

export default function IntroSequence({ ready }: { ready: boolean }) {
  const [hint, setHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 开场结束后再浮出引导，避免与片头抢视线
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setHint(true), 820);
    return () => window.clearTimeout(t);
  }, [ready]);

  // 切章也收（R73：章节条点按直达后，提示不该压在别的分镜面板上）
  useEffect(() => {
    if (!hint) return;
    const off = subscribeAct((a) => {
      if (a !== 'INTRO') {
        setHint(false);
        setDismissed(true);
      }
    });
    return () => {
      off();
    };
  }, [hint]);

  // 首次交互 → 淡出并永久隐藏
  useEffect(() => {
    if (!hint) return;
    const hide = () => {
      setHint(false);
      setDismissed(true);
    };
    const opts: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener('wheel', hide, opts);
    window.addEventListener('touchstart', hide, opts);
    window.addEventListener('pointerdown', hide, opts);
    window.addEventListener('keydown', hide, opts);
    return () => {
      window.removeEventListener('wheel', hide);
      window.removeEventListener('touchstart', hide);
      window.removeEventListener('pointerdown', hide);
      window.removeEventListener('keydown', hide);
    };
  }, [hint]);

  return (
    <>
      <div className={`op-intro${ready ? ' is-ready' : ''}`} aria-hidden>
        <div className="op-intro-blinds">
          {Array.from({ length: BLINDS }).map((_, i) => (
            <i
              key={i}
              style={
                {
                  // 从中心向两侧依次揭开
                  '--d': `${Math.round(Math.abs(i - (BLINDS - 1) / 2) * 62)}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <span className="op-intro-scan" />

        <div className="op-intro-mark">
          <div className="op-intro-brand">
            {'VANLAN'.split('').map((ch, i) => (
              <b key={i} style={{ '--i': i } as CSSProperties}>
                {ch}
              </b>
            ))}
            <em>.OS</em>
          </div>
          <div className="op-intro-sub">ONBOARDING // OP STAGE</div>
          <div className="op-intro-bar">
            <i />
          </div>
        </div>
      </div>

      {/* 兽头背后的特斯拉红光晕：只在开场闪一次 */}
      <span className={`op-rim-flash${ready ? ' is-on' : ''}`} aria-hidden />

      <div
        className={`op-hint${hint ? ' is-on' : ''}${dismissed ? ' is-gone' : ''}`}
        aria-hidden
      >
        <span className="op-hint-ico">
          <i />
        </span>
        <span className="op-hint-txt">
          <b>SCROLL / DRAG</b>
          <em className="op-hint-desk">上下滑动或拖动侧边时间轴</em>
          <em className="op-hint-mob">上下滑动 · 驱动分镜</em>
        </span>
      </div>
    </>
  );
}
