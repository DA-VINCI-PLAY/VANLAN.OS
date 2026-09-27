'use client';

/**
 * HomeContent —— HOME 模式顶部层（R46 名片化精简）
 *
 * R46：首屏名片化后本组件只保留：
 *  - 左上语言切换
 *  - 顶部 brand 小字（VANLAN.OS）
 * 主名 VANLAN / 身份 / 微信 / 社交 / 作品集入口全部移入 `BusinessCard`
 * （贴底居中名片卡）；R37 的底部 4 入口卡由全局 BottomNavigation 接管
 * （R46 起 HOME 也显示底部导航）。
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
      className={`touch-target inline-flex min-w-[34px] items-center justify-center rounded-full px-2.5 py-1 text-[9px] tracking-[0.22em] transition-colors duration-300 ease-linear sm:min-w-[38px] ${
        active
          ? 'bg-ink/[0.08] text-ink border border-ink/30'
          : 'border border-ink/15 text-ink/55 hover:text-ink hover:border-ink/35'
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

  // R32：HOME 层走 PanelSwap —— 离开 HOME 时整层缩小退出，回来时上浮进入
  return (
    <PanelSwap show={mode === 'HOME'} z={20}>
      <section
        aria-label="Home"
        className="pointer-events-none fixed inset-0 z-20"
      >
      {/* ===== 语言切换（左上角，避开兽头；与右上 HUD 呼应） ===== */}
      <div
        role="group"
        aria-label="Language switch"
        className="pointer-events-auto absolute left-4 top-4 flex items-center gap-1.5 sm:left-6 sm:top-6"
      >
        <LangPill lang="en" active={lang === 'en'} label="EN" onSelect={setLang} />
        <LangPill
          lang="zh"
          active={lang === 'zh'}
          label="中文"
          onSelect={setLang}
        />
        <span
          aria-hidden
          className="ml-1 font-mono text-[8px] tracking-[0.28em] text-ink/35"
          title="Press L to toggle language"
        >
          L
        </span>
      </div>

      {/* ===== 顶部 brand 小字（R46：主名移入 BusinessCard，避免重复大字） ===== */}
      <div className="absolute inset-x-0 top-0 flex justify-center pt-4 sm:pt-5">
        <div className="font-mono text-[9px] tracking-[0.4em] text-ink/60 sm:text-[10px]">
          {SITE.brand}
        </div>
      </div>
      </section>
    </PanelSwap>
  );
}
