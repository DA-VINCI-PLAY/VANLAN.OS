'use client';

import type { ReactNode } from 'react';
import type { Mode } from '@/lib/store';

/**
 * MobileContentSafeArea —— 模式内容容器（R51 Tesla 玻璃面板）
 *
 * 定位契约（globals.css 统一执行）：
 *   <768px / 矮横屏 → 底部抽屉：58dvh 上限 + 内部滚动，锚定导航上方；
 *   ≥768px → 桌面侧栏：CONTACT / COMMISSION / ABOUT 靠左，
 *             GALLERY / ALBUM 靠右（中央留白给 3D 兽头）。
 */

const SUBSYS: Record<Mode, string> = {
  HOME: 'LOBBY',
  GALLERY: 'WORKS',
  CONTACT: 'CHANNELS',
  COMMISSION: 'ORDER DESK',
  ALBUM: 'DISC PLAYER',
  ABOUT: 'PROFILE',
};

const PANEL_SIDE_LEFT = new Set<Mode>(['CONTACT', 'COMMISSION', 'ABOUT']);

export default function MobileContentSafeArea({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) {
  const sideLeft = PANEL_SIDE_LEFT.has(mode);
  return (
    <section
      aria-labelledby="os-panel-title"
      className={`os-mode-panel os-glass os-scroll pointer-events-auto absolute overflow-y-auto overscroll-contain rounded-2xl
        top-24 bottom-24 w-80 p-5
        sm:top-[168px] sm:w-[350px] sm:p-6
        ${sideLeft ? 'left-4 sm:left-6' : 'right-4 sm:right-6'}`}
    >
      {/* 面板头：模式 + 子系统（Tesla 遥测语气） */}
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-3">
        <span
          id="os-panel-title"
          className="font-mono text-[10px] font-semibold tracking-[0.34em] text-ink"
        >
          {mode}
        </span>
        <span className="font-mono text-[8px] tracking-[0.16em] text-ink/30">
          {SUBSYS[mode]}
        </span>
      </div>

      <div className="pointer-events-auto">{children}</div>
    </section>
  );
}
