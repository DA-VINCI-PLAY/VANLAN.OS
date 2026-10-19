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
 * BottomNavigation —— Tesla In-Car OS 悬浮导航（R51 重构）
 *
 * - 深钛黑玻璃胶囊 + 单像素浅钛灰描边；激活项为「红色胶囊 + 白字」
 * - 6 个模式（新增 COMMISSION 接单）；移动端横向滚动、当前项自动居中
 * - 触控区 ≥ 40px（touch-target），桌面 hover 提升字色
 */

const EASE = 'linear';

const NAV_ZH: Record<Mode, string> = {
  HOME: '首页',
  GALLERY: '画廊',
  CONTACT: '联系',
  COMMISSION: '接单',
  ALBUM: '专辑',
  ABOUT: '关于',
};

/** 英文导航用短标签（COMMISSION 太长，导航内用 ORDER） */
const NAV_EN: Record<Mode, string> = {
  HOME: 'HOME',
  GALLERY: 'GALLERY',
  CONTACT: 'CONTACT',
  COMMISSION: 'ORDER',
  ALBUM: 'ALBUM',
  ABOUT: 'ABOUT',
};

const NAV_ARIA: Record<Lang, string> = {
  zh: '模式导航',
  en: 'Mode navigation',
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

  return (
    <nav
      className="fixed left-1/2 z-30 -translate-x-1/2 bottom-[calc(14px+env(safe-area-inset-bottom))] sm:bottom-6"
      aria-label={NAV_ARIA[lang]}
    >
      <div className="os-glass flex items-center rounded-full">
        <div
          ref={listRef}
          className="no-scrollbar relative flex items-center gap-0.5 overflow-x-auto rounded-full px-1.5 py-1 max-sm:max-w-[calc(100vw_-_24px)]"
        >
          {/* 激活胶囊：特斯拉红 */}
          {cap.ready && (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full bg-[#E82127] shadow-[0_6px_20px_rgba(232,33,39,0.35)]"
              style={{
                left: cap.left,
                width: cap.width,
                transitionProperty: 'left, width',
                transitionDuration: '380ms',
                transitionTimingFunction: EASE,
              }}
            />
          )}

          {MODES.map((m) => {
            const active = mode === m;
            const label = lang === 'zh' ? NAV_ZH[m] : NAV_EN[m];
            return (
              <button
                key={m}
                type="button"
                ref={(el) => {
                  btnRefs.current[m] = el;
                }}
                onClick={() => setMode(m)}
                aria-current={active ? 'page' : undefined}
                aria-label={lang === 'zh' ? `切换到${NAV_ZH[m]}` : `Switch to ${m}`}
                className={`touch-target relative z-10 whitespace-nowrap rounded-full px-2.5 py-1.5 font-mono text-[9px] tracking-[0.14em] transition-colors duration-300 sm:px-3 sm:text-[10px] sm:tracking-[0.2em] ${
                  active
                    ? 'font-semibold text-white'
                    : 'text-ink/55 hover:text-ink/90'
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
