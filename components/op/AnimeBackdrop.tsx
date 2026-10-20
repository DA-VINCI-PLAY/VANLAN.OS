'use client';

/**
 * AnimeBackdrop —— 2D 动漫 OP 分镜背景（R52）
 *
 * 全部视觉由 CSS 图层 + 一个 rAF 循环驱动：
 *   rAF 读 scrub.progress → 写 CSS 变量（--p / --lp）与 4 个分镜层的 opacity。
 *   拖动时间轴时**零 React 渲染**，只改样式，GPU 合成即可，几乎不耗电。
 *
 * 分镜语言：大字报 Kinetic Typography + 斜切分镜条 + 印刷网格 + 章节色块，
 * 参照动漫 OP 的「标题卡 / Staff 表 / 章节切换」三段式构图。
 */

import { useEffect, useRef } from 'react';
import { ACTS, actWeight, scrub } from '@/lib/opTimeline';
import { SITE } from '@/content/site';

const ACT_COPY: Record<
  string,
  { line1: string; line2: string; sub: string; tag: string }
> = {
  INTRO: {
    line1: 'VANLAN',
    line2: 'COMPOSER & CREATOR',
    sub: '交互式个人终端 · INTERACTIVE PORTFOLIO',
    tag: 'OP // MAIN VISUAL',
  },
  SOUND: {
    line1: 'SOUND',
    line2: 'TRACK / 02',
    sub: '原创编曲 · 混音 · 音色设计',
    tag: 'OP // THEME SONG',
  },
  COMMISSION: {
    line1: 'COMMERCIAL',
    line2: 'WORKS // OPEN',
    sub: '编曲 / 混音 / 3D 角色 / 商业定制',
    tag: 'OP // STORE DESK',
  },
  CREDITS: {
    line1: 'CREDITS',
    line2: 'STAFF ROLL',
    sub: '系统状态 · 语言 · 管理员终端',
    tag: 'OP // END CARD',
  },
};

export default function AnimeBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<Record<string, HTMLElement | null>>({});
  // R54：入场引导动画 —— 章节激活瞬间挂 is-enter，播完摘下；拖回重进会重播
  const enteredRef = useRef<Record<string, boolean>>({});
  const enterTimers = useRef<Record<string, number>>({});
  // 启动幕 1100ms 后才允许触发（否则开场动画被启动幕盖住白播一遍）
  const bootGateRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    bootGateRef.current = performance.now() + 1250;
    let raf = 0;

    const tick = () => {
      const p = scrub.progress;
      root.style.setProperty('--p', p.toFixed(5));
      const now = performance.now();

      for (let i = 0; i < ACTS.length; i += 1) {
        const act = ACTS[i];
        const el = actRefs.current[act.id];
        if (!el) continue;
        const w = actWeight(p, act);
        el.style.opacity = w.toFixed(3);
        // 层内局部进度：章节内在 0→1 缓慢推进（做视差用）
        const lt = (p - act.startP) / Math.max(act.endP - act.startP, 1e-6);
        el.style.setProperty('--lp', Math.max(0, Math.min(1, lt)).toFixed(4));
        // 章节切换时整层轻微升降，制造「翻页」错位感
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
          // 离开章节：复位，下次进入重播
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
    <div ref={rootRef} className="op-backdrop" aria-hidden>
      {/* 底色 + 章节色晕 */}
      <div className="op-base" />
      <div className="op-aurora" />
      <div className="op-grid" />

      {/* 斜切分镜条（3 条，随进度横移） */}
      <div className="op-slash op-slash-a" />
      <div className="op-slash op-slash-b" />
      <div className="op-slash op-slash-c" />

      {/* 兽头背光：让 3D 头部在深色大字上有承托 */}
      <div className="op-halo" />

      {/* 四段分镜 */}
      {ACTS.map((act) => {
        const copy = ACT_COPY[act.id];
        return (
          <section
            key={act.id}
            data-act={act.id}
            ref={(el) => {
              actRefs.current[act.id] = el;
            }}
            className={`op-act op-act-${act.id.toLowerCase()}`}
          >
            <div className="op-act-index">
              <span className="op-act-code">{act.code}</span>
              <span className="op-act-en">{act.en}</span>
            </div>

            {/* 大字报：描边巨字（逐字 span，入场 stagger）+ 实心副行 */}
            <h1 className="op-headline">
              <span className="op-line op-line-outline">
                {copy.line1.split('').map((ch, i) => (
                  <span key={i} className="op-ch" style={{ ['--i' as string]: i }}>
                    {ch}
                  </span>
                ))}
              </span>
              <span className="op-line op-line-solid">{copy.line2}</span>
            </h1>

            <div className="op-act-foot">
              <span className="op-tag">{copy.tag}</span>
              <span className="op-sub">{copy.sub}</span>
            </div>

            {/* 章节专属装饰 */}
            {act.id === 'SOUND' && (
              <div className="op-equalizer">
                {Array.from({ length: 28 }).map((_, i) => (
                  <i key={i} style={{ ['--i' as string]: i }} />
                ))}
              </div>
            )}
            {act.id === 'COMMISSION' && (
              <ul className="op-checklist">
                {['COMPOSITION', 'MIXING & MASTER', '3D CHARACTER', 'CUSTOM WORK'].map(
                  (row, i) => (
                    <li key={row}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {row}
                      <b>OPEN</b>
                    </li>
                  ),
                )}
              </ul>
            )}
            {act.id === 'CREDITS' && (
              <ul className="op-staff">
                <li>
                  <span>DIRECTION</span>VANLAN
                </li>
                <li>
                  <span>MUSIC</span>VANLAN
                </li>
                <li>
                  <span>3D / KEMONO HEAD</span>VANLAN
                </li>
                <li>
                  <span>SYSTEM</span>{SITE.brand}
                </li>
              </ul>
            )}
          </section>
        );
      })}

      {/* 角标遥测（不参与分镜切换） */}
      <div className="op-meta op-meta-tl">
        <span className="op-dot" />
        {SITE.brand}
      </div>
      <div className="op-meta op-meta-br">
        <span>24 FPS</span>
        <b>·</b>
        <span>2D OP STAGE</span>
      </div>
    </div>
  );
}
