'use client';

/**
 * KeplerFinale —— 星辰汇聚 · 谢幕定格（R67）
 *
 * 0.0–0.6s  万星坍缩 + 丁达尔体积光
 * 0.5–1.4s  主视觉歌词逐字浮现（金属玻璃高光扫过 + 色散微光）
 * 1.2–2.0s  副标题与投稿入口渐显
 *
 * 「伪光追」全部是合成层：
 *   · 鼠标 / 手指位置 → --light-x / --light-y → 多层 radial-gradient 高光
 *   · 文字下方翻转渐隐图层 → 黑曜石水面倒影
 *   · 多层 box-shadow / drop-shadow → 镜头光晕溢出
 * 没有一帧在做真正的路径追踪。
 */

import { useEffect, useRef } from 'react';

const LINE = '藏在众多孤星之中，还是找得到你';

export default function KeplerFinale({
  onSubmit,
  onExit,
  onBack,
}: {
  onSubmit: () => void;
  onExit: () => void;
  onBack: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  // 实时追光
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = (x: number, y: number) => {
      el.style.setProperty('--light-x', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--light-y', `${(y * 100).toFixed(1)}%`);
    };
    apply(0.5, 0.3);

    let pending: { x: number; y: number } | null = null;
    const flush = () => {
      raf.current = 0;
      if (pending) apply(pending.x, pending.y);
      pending = null;
    };
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
      if (!raf.current) raf.current = window.requestAnimationFrame(flush);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  const chars = Array.from(LINE);

  return (
    <div className="kp-finale" ref={rootRef}>
      <div className="kp-rays" aria-hidden>
        <i /><i /><i /><i /><i />
      </div>
      <div className="kp-finale-halo" aria-hidden />
      <div className="kp-finale-core" aria-hidden />

      <div className="kp-finale-copy">
        <h2 className="kp-finale-line" aria-label={LINE}>
          {chars.map((c, i) => (
            <span
              key={i}
              style={{ animationDelay: `${0.5 + i * 0.045}s` }}
              aria-hidden={c === '，'}
            >
              {c}
            </span>
          ))}
        </h2>
        <div className="kp-finale-reflect" aria-hidden>
          {chars.map((c, i) => (
            <span key={i} style={{ animationDelay: `${0.5 + i * 0.045}s` }}>
              {c}
            </span>
          ))}
        </div>

        <p className="kp-finale-sub">欢迎投稿 // SHARE YOUR ORBIT</p>

        <button type="button" className="kp-finale-cta" onClick={onSubmit}>
          [ 点击去投稿：留下你的音乐、歌词或未曾说出口的故事 ➔ ]
        </button>

        <button type="button" className="kp-finale-hint" onClick={onExit}>
          （再次向上滑动，或点击此处直接返回地表主页 ↑）
        </button>
      </div>

      <div className="kp-finale-tools">
        <button type="button" onClick={onBack}>← 回到星图</button>
        <button type="button" onClick={onExit}>跳过 · 返回地表 ↑</button>
      </div>
    </div>
  );
}
