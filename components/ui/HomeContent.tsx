'use client';

/**
 * HomeContent —— HOME 模式顶部铭牌（R37 精简）
 *
 * 用户反馈：「去掉中文名，把座右铭还有我的身份移动到手头下方的
 *           展台前方」（R37 落实）。
 *
 * 因此本组件只渲染：
 *  - 左上语言切换
 *  - 顶部：brand 小字 + VANLAN 主名
 *  - 底部：4 个模式入口（纯文字卡，无图）
 *
 * 座右铭 + 身份（role 行 / bio）+ 中文名「梵岚」均移到 `HomeSlab`
 * —— 浮在 HOME 3D 兽头下方的 plinth 屏幕投影区上方，含 hover 气泡
 * 放大效果。
 */

import { useEffect } from 'react';
import { useOS, type Lang } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { MODE_ENTRIES } from '@/lib/modeEntries';
import { SITE } from '@/content/site';
import ModeEntryCard from './ModeEntryCard';
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
  // 矮横屏（h≤560）：紧凑变体 —— 卡变单行药丸条，给兽头让出画面
  const compact = useViewport().compactLandscape;

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

      {/* ===== 顶部 nameplate（只剩 brand + 主名；R37 移走中文名/bio/motto 到 HomeSlab） =====
          R37b：nameplate 整体上移 8/14px（移动 / 桌面 sm），避开 HOME 桌面
          相机下兽头右耳尖对 VANLAN 最右 N 右下角的视觉"咬住"——
          右耳尖大致在 y≈70~95，VANLAN 文字底边原 y=81 时刚好重叠。
          移动端 -mt-2 / 桌面 sm -mt-4，分别上移 8 / 16px。 */}
      <div
        className={`absolute inset-x-0 top-0 -mt-2 flex flex-col items-center px-4 text-center sm:-mt-4 ${
          compact ? 'gap-1 pt-3' : 'gap-1.5 pt-4 sm:gap-2 sm:pt-6'
        }`}
      >
        {/* 品牌小字 */}
        <div className="font-mono text-[9px] tracking-[0.4em] text-ink/60 sm:text-[10px]">
          {SITE.brand}
        </div>
        {/* 主名 */}
        <h1
          className={`font-mono font-semibold leading-none text-ink ${
            compact
              ? 'text-[20px] tracking-[0.24em]'
              : 'text-[26px] tracking-[0.28em] sm:text-[34px]'
          }`}
        >
          {SITE.name}
        </h1>
      </div>

      {/* ===== 底部 4 个模式入口（纯文字；mini 播放条已撤，贴底排布） ===== */}
      <nav
        aria-label={lang === 'zh' ? '功能入口' : 'Sections'}
        className={
          compact
            ? 'absolute inset-x-0 flex flex-wrap items-center justify-center gap-2 px-4'
            : 'absolute inset-x-0 mx-auto grid max-w-[520px] grid-cols-2 gap-2 px-4 sm:flex sm:max-w-[720px] sm:justify-center sm:gap-3'
        }
        style={{
          bottom: compact
            ? 'calc(14px + env(safe-area-inset-bottom))'
            : 'calc(18px + env(safe-area-inset-bottom))',
        }}
      >
        {MODE_ENTRIES.map((entry) => (
          <div key={entry.mode} className={compact ? '' : 'flex sm:w-[168px]'}>
            <ModeEntryCard entry={entry} lang={lang} compact={compact} />
          </div>
        ))}
      </nav>
      </section>
    </PanelSwap>
  );
}
