'use client';

/**
 * Settings / Accessibility 入口 —— 用户可手动控制体验档位，无需刷新：
 * - 3D EXPERIENCE  [ON|OFF]：关闭 → 立即进入 Lightweight 2D（RenderRoot 分流）
 * - REDUCED MOTION [OFF|ON]：关闭漂浮/大幅相机/脉动/过渡动画
 * - PROFILE 只读显示当前性能档（硬件检测 + FPS 自适应后的结果）
 * 键盘：触发钮 aria-expanded；Esc 关闭并归还焦点；开关为 aria-pressed 按钮。
 */

import { useEffect, useRef, useState } from 'react';
import { useOS, type Quality } from '@/lib/store';
import { markRmUserTouched } from '@/components/RenderRoot';

const QUALITY_LABEL: Record<Quality, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

function Switch({
  label,
  on,
  onLabel,
  offLabel,
  onToggle,
}: {
  label: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5">
      <span className="text-[9px] tracking-[0.28em] text-ink/70">{label}</span>
      <button
        type="button"
        aria-pressed={on}
        aria-label={`${label} ${on ? onLabel : offLabel}`}
        onClick={onToggle}
        className="touch-target inline-flex min-w-[92px] items-center justify-center border border-ink/20 bg-white/60 px-2.5 py-1 text-[9px] tracking-[0.24em] text-ink/80 transition-colors hover:border-ink"
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            on ? 'bg-ink' : 'border border-ink/40'
          }`}
        />
        <span className="ml-2">{on ? onLabel : offLabel}</span>
      </button>
    </div>
  );
}

export default function SettingsToggle() {
  const threeD = useOS((s) => s.threeD);
  const setThreeD = useOS((s) => s.setThreeD);
  const reducedMotion = useOS((s) => s.reducedMotion);
  const setReducedMotion = useOS((s) => s.setReducedMotion);
  const quality = useOS((s) => s.quality);

  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Esc 关闭并归还焦点
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    }
  };

  const toggle3D = () => {
    setThreeD(!threeD);
  };
  const toggleRM = () => {
    markRmUserTouched();
    setReducedMotion(!reducedMotion);
  };

  return (
    <div
      ref={boxRef}
      onKeyDown={onKeyDown}
      className="fixed right-4 top-[164px] z-30 sm:right-6 sm:top-[188px]"
    >
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Accessibility and display settings"
        onClick={() => setOpen((v) => !v)}
        className="border border-white/50 bg-white/25 px-2.5 py-1.5 text-[9px] tracking-[0.3em] text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-ink/[0.06] backdrop-blur-xl transition-colors hover:border-white/80 hover:bg-white/40 hover:text-ink"
      >
        {open ? 'SYS ▾' : 'SYS ▸'}
      </button>

      {open && (
        <div className="fade-in mt-2 w-[228px] border border-ink/10 bg-white/75 p-3.5 shadow-[0_16px_44px_rgba(17,17,17,0.12)] backdrop-blur-2xl">
          <div className="mb-1 text-[8px] tracking-[0.3em] text-ink/40">
            A11Y / DISPLAY
          </div>
          <Switch
            label="3D EXPERIENCE"
            on={threeD}
            onLabel="ON"
            offLabel="OFF"
            onToggle={toggle3D}
          />
          <Switch
            label="REDUCED MOTION"
            on={reducedMotion}
            onLabel="ON"
            offLabel="OFF"
            onToggle={toggleRM}
          />
          <div className="mt-1 flex items-center justify-between border-t border-ink/10 pt-2">
            <span className="text-[9px] tracking-[0.28em] text-ink/70">
              PROFILE
            </span>
            <span className="border border-ink/15 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-ink/60">
              {QUALITY_LABEL[quality]}
            </span>
          </div>
          <p className="mt-2 text-[8px] leading-relaxed tracking-[0.12em] text-ink/40">
            QUALITY AUTO-ADAPTS TO DEVICE. 3D OFF = LIGHTWEIGHT MODE.
          </p>
        </div>
      )}
    </div>
  );
}
