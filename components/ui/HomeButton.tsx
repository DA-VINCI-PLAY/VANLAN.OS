'use client';

import { useOS } from '@/lib/store';

/** 左上角返回 HOME 按钮（HOME 模式下隐藏） */
export default function HomeButton() {
  const mode = useOS((s) => s.mode);
  const setMode = useOS((s) => s.setMode);
  if (mode === 'HOME') return null;

  return (
    <button
      type="button"
      aria-label="Back to home mode"
      onClick={() => setMode('HOME')}
      className="glitch-hover touch-target fixed left-4 top-4 z-20 border border-white/50 bg-white/25 px-3 py-1.5 text-[10px] tracking-[0.25em] text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-ink/[0.06] backdrop-blur-xl transition-colors hover:border-white/80 hover:bg-white/40 hover:text-ink sm:left-6 sm:top-6 sm:text-[11px]"
    >
      ← HOME
    </button>
  );
}
