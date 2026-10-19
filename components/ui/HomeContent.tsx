'use client';

/**
 * HomeContent —— HOME 顶部层（R51 Tesla 极简版）
 * 保留：左上语言切换、顶部品牌小字（单像素级视觉权重）。
 * 主名 / 身份 / 联系方式 / 社交入口在 BusinessCard。
 */

import { useEffect } from 'react';
import { useOS, type Lang } from '@/lib/store';
import { SITE } from '@/content/site';
import PanelSwap from './PanelSwap';

function LangPill({
  lang,
  active,
  label,
  onSelect,
}: {
  lang: Lang;
  active: boolean;
  label: string;
  onSelect: (l: Lang) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Switch language to ${label}`}
      onClick={() => onSelect(lang)}
      className={`touch-target inline-flex min-w-[36px] items-center justify-center rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] transition-colors duration-200 ${
        active
          ? 'border border-[#E82127]/60 bg-[#E82127]/12 text-white'
          : 'border border-white/10 text-ink/45 hover:border-white/25 hover:text-ink/80'
      }`}
    >
      {label}
    </button>
  );
}

export default function HomeContent() {
  const mode = useOS((s) => s.mode);
  const lang = useOS((s) => s.lang);
  const setLang = useOS((s) => s.setLang);

  // 'L' 快捷键切换（输入控件聚焦时让行）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'l' && e.key !== 'L') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      setLang(lang === 'zh' ? 'en' : 'zh');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lang, setLang]);

  return (
    <PanelSwap show={mode === 'HOME'} z={20}>
      <section aria-label="Home" className="pointer-events-none fixed inset-0 z-20">
        {/* 语言切换（左上角） */}
        <div
          role="group"
          aria-label="Language switch"
          className="pointer-events-auto absolute left-4 top-4 flex items-center gap-1.5 sm:left-6 sm:top-5"
        >
          <LangPill lang="en" active={lang === 'en'} label="EN" onSelect={setLang} />
          <LangPill
            lang="zh"
            active={lang === 'zh'}
            label="中文"
            onSelect={setLang}
          />
        </div>

        {/* 顶部品牌：单像素呼吸感 */}
        <div className="absolute inset-x-0 top-0 flex justify-center pt-4 sm:pt-5">
          <div className="font-mono text-[9px] tracking-[0.46em] text-ink/30 sm:text-[10px]">
            {SITE.brand}
          </div>
        </div>
      </section>
    </PanelSwap>
  );
}
