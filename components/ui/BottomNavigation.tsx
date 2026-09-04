'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { MODES, useOS, type Lang, type Mode } from '@/lib/store';

/**
 * Floating Navigation Pill —— R10 §七 玻璃拟态重构
 * - 不再全宽贴边：居中悬浮胶囊（桌面 bottom 24px / 移动端 14px）
 * - 空间关系：真正的磨砂玻璃 —— 低纯白填充（bg-white/20）+ 强 backdrop-blur
 *   + 细白边框 + ring-ink 极细描边 + 顶缘内高光（inset 1px white，模拟玻璃受光）
 *   → 半透明地"罩"在 3D 空间上，而非普通白色按钮条
 * - Sliding Active Capsule：选中态为一块"提亮玻璃片"（bg-white/55 + inset 微辉光），
 *   450ms linear 横移（第七轮 §16：导航动画保持 linear）
 * - 移动端横向滚动、隐藏滚动条、自动把当前项滚到可视中央
 * - R31 home 重构：HOME 模式下隐藏（4 张 ModeEntryCard 接管入口职责）
 */

const EASE = 'linear'; // 第七轮：滑动胶囊动画 linear（禁止 ease-in/out/power）

/* === 模式名本地化（R12：中文模式导航栏要翻译） === */
const NAV_ZH: Record<Mode, string> = {
  HOME: '首页',
  GALLERY: '画廊',
  CONTACT: '联系',
  ALBUM: '专辑',
  ABOUT: '关于',
};
const NAV_ARIA: Record<Lang, string> = {
  zh: '模式导航',
  en: 'Mode navigation',
};
const TRACKING: Record<Lang, string> = {
  zh: 'tracking-[0.16em]', // 中文两字，字距过大反而稀疏
  en: 'tracking-[0.22em]', // 英文等宽代码感
};

export default function BottomNavigation() {
  const mode = useOS((s) => s.mode);
  const setMode = useOS((s) => s.setMode);
  const lang = useOS((s) => s.lang);

  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const [cap, setCap] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const el = btnRefs.current[mode];
    if (!el) return;
    setCap({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    // lang 切换后按钮宽度变化，需重量激活胶囊
  }, [mode, lang]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // 移动端：当前项滚到可视区中央
  useEffect(() => {
    btnRefs.current[mode]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [mode]);

  // R31：HOME 由 ModeEntryCard 入口卡接管导航 —— 本组件让位
  if (mode === 'HOME') return null;

  return (
    <nav
      className="fixed left-1/2 z-30 -translate-x-1/2 bottom-[calc(14px+env(safe-area-inset-bottom))] sm:bottom-6"
      aria-label={NAV_ARIA[lang]}
    >
      <div className="flex items-center rounded-full border border-white/45 bg-white/20 shadow-[0_16px_48px_rgba(17,17,17,0.13),inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-ink/[0.06] backdrop-blur-2xl">
        <div
          ref={listRef}
          className="no-scrollbar relative flex items-center gap-0.5 overflow-x-auto rounded-full px-1.5 py-1 max-sm:max-w-[calc(100vw_-_24px)]"
        >
          {/* Sliding Active Capsule（提亮玻璃片；语义由 aria-current 提供） */}
          {cap.ready && (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full border border-white/80 bg-white/55 shadow-[inset_0_1px_3px_rgba(255,255,255,0.95),inset_0_0_16px_rgba(255,255,255,0.5),0_2px_12px_rgba(17,17,17,0.06)]"
              style={{
                left: cap.left,
                width: cap.width,
                transitionProperty: 'left, width',
                transitionDuration: '450ms',
                transitionTimingFunction: EASE,
              }}
            />
          )}

          {MODES.map((m) => {
            const active = mode === m;
            const label = lang === 'zh' ? NAV_ZH[m] : m;
            return (
              <button
                key={m}
                type="button"
                ref={(el) => {
                  btnRefs.current[m] = el;
                }}
                onClick={() => setMode(m)}
                aria-current={active ? 'page' : undefined}
                aria-label={lang === 'zh' ? `切换到${NAV_ZH[m]}` : undefined}
                className={`touch-target relative z-10 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] transition-colors duration-300 max-sm:tracking-[0.1em] sm:px-3 sm:text-[11px] ${
                  TRACKING[lang]
                } ${
                  active
                    ? 'font-semibold text-ink'
                    : 'text-ink/55 hover:text-ink/85'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
