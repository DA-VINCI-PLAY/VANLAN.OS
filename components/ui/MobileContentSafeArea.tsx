'use client';

import type { ReactNode } from 'react';
import type { Mode } from '@/lib/store';

/**
 * MobileContentSafeArea —— 模式内容统一安全区（第七轮）
 *
 * 定位契约（由 globals.css 的 .os-mode-panel 媒体规则统一执行）：
 *   竖屏手机(<640px) / 矮横屏(landscape & h≤520)
 *     → position:fixed；水平真居中；bottom 锚定在 BottomNavigation 上方
 *       （calc(var(--bottom-nav-height) + safe-area + 20px)）；
 *       width:min(100vw-32px,420px)；内容超高只滚动面板、不滚 viewport。
 *   桌面 / 平板竖屏（R13：按模式分左右，镜像对称、中央留白给兽头）
 *     → CONTACT / ABOUT 靠左（left-6），GALLERY / ALBUM 靠右（right-6）；
 *       垂直锚定不变（top-172px → bottom-24），desktop 构图不再全部挤右侧。
 *
 * 层级契约（§13）：Scene（Canvas）与 UI 彻底分层 —— 本组件属于 UIRoot，
 * 其父级（main）不含 transform/perspective/filter 等会改变 fixed
 * containing block 的属性，fixed 定位始终相对 viewport。
 *
 * pointer-events：容器默认穿透，只有直接交互的子内容可点（§5）。
 */
const SUBSYS: Record<Mode, string> = {
  HOME: 'LOBBY',
  GALLERY: 'WORKS',
  CONTACT: 'CHANNELS',
  ALBUM: 'DISC PLAYER',
  ABOUT: 'PROFILE',
};

/**
 * 桌面端面板侧（R13）：左右镜像对称，中央留白给兽头主体。
 * CONTACT / ABOUT → 左；GALLERY / ALBUM → 右。HOME 无面板。
 */
const PANEL_SIDE_LEFT = new Set<Mode>(['CONTACT', 'ABOUT']);

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
      className={`os-mode-panel pointer-events-auto absolute overflow-y-auto rounded-xl
        border border-ink/12 bg-white/75 backdrop-blur-md
        shadow-[0_16px_48px_rgba(17,17,17,0.07)]
        top-24 bottom-24 w-80 p-5
        sm:top-[172px] sm:w-[340px] sm:p-6
        ${
          sideLeft
            ? 'left-4 sm:left-6'
            : 'right-4 sm:right-6'
        }
        max-sm:rounded-2xl
        ${mode === 'ALBUM' ? 'os-panel-album' : ''}`}
    >
      {/* 面板头：mode / node / 层级提示（desktop 与 mobile 共用） */}
      <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
        <span
          id="os-panel-title"
          className="text-[10px] font-bold tracking-[0.4em] text-ink"
        >
          {mode}
        </span>
        <span className="text-[9px] tracking-[0.2em] text-ink/50">
          CONTENT / {SUBSYS[mode]}
        </span>
      </div>

      <div className="pointer-events-auto">{children}</div>
    </section>
  );
}
