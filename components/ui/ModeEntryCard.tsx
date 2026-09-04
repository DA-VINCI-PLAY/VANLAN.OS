'use client';

/**
 * ModeEntryCard —— HOME 模式的模式入口（R31，按用户反馈精简）
 *
 * 纯文字卡：accent 色点 + 模式名 + 一行副标题 —— 不展示任何图片缩略
 * （用户明确要求主页不出现图片块）。
 *  - 「白博物馆」语言：磨砂玻璃白卡 + 极细边框，全 linear
 *  - 点击整卡 → setMode(entry.mode)；native button 键盘可操作
 *  - compact（矮横屏）：单行药丸条
 */

import type { ModeEntry } from '@/lib/modeEntries';
import { useOS, type Lang } from '@/lib/store';

export default function ModeEntryCard({
  entry,
  lang,
  compact = false,
}: {
  entry: ModeEntry;
  lang: Lang;
  /** 矮横屏紧凑变体：单行药丸条 */
  compact?: boolean;
}) {
  const setMode = useOS((s) => s.setMode);
  const name = lang === 'zh' ? entry.nameZh : entry.name;
  const sub = lang === 'zh' ? entry.subtitle.zh : entry.subtitle.en;
  const label = lang === 'zh' ? `进入${entry.nameZh}` : `Open ${entry.name}`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setMode(entry.mode)}
        aria-label={label}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/55 bg-white/30 px-3 py-1.5 shadow-[0_8px_24px_rgba(17,17,17,0.07),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-ink/[0.05] backdrop-blur-xl transition-colors duration-300 hover:bg-white/55"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: entry.accent }}
        />
        <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-ink">
          {name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setMode(entry.mode)}
      aria-label={label}
      className="pointer-events-auto flex w-full flex-col items-start rounded-xl border border-white/55 bg-white/30 px-3 py-2.5 text-left shadow-[0_10px_32px_rgba(17,17,17,0.07),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-ink/[0.05] backdrop-blur-xl transition-colors duration-300 hover:bg-white/55 sm:py-3"
    >
      {/* 名称 + accent 点 */}
      <span className="flex w-full items-center gap-1.5">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: entry.accent }}
        />
        <span className="truncate font-mono text-[10px] font-bold tracking-[0.18em] text-ink sm:text-[11px]">
          {name}
        </span>
      </span>
      {/* 副标题 */}
      <span className="mt-0.5 w-full truncate font-mono text-[8px] tracking-[0.14em] text-ink/55 sm:text-[9px]">
        {sub}
      </span>
    </button>
  );
}
