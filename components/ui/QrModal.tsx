'use client';

import { useEffect, useRef } from 'react';
import { useOS } from '@/lib/store';
import { SOCIALS } from '@/content/social';

/**
 * 二维码弹窗（键盘 / 屏幕阅读器友好）
 * - role="dialog" aria-modal：打开后焦点进入弹窗
 * - Tab Focus Trap：焦点在弹窗内循环，不会跑到背景页面
 * - Esc 关闭（Experience 的全局 Esc→HOME 会让行，见其 qrPlatform 判断）
 * - 关闭后焦点归还触发按钮
 */
export default function QrModal() {
  const qrPlatform = useOS((s) => s.qrPlatform);
  const setQrPlatform = useOS((s) => s.setQrPlatform);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!qrPlatform) return;
    // 记录触发元素，供关闭后归还焦点
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        useOS.getState().setQrPlatform(null);
        return;
      }
      if (e.key !== 'Tab') return;
      // Focus Trap：循环遍历弹窗内可聚焦元素
      const root = panelRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      // 归还焦点
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
    };
  }, [qrPlatform]);

  if (!qrPlatform) return null;

  const entry = SOCIALS.find((s) => s.id === qrPlatform);
  const label = entry?.platform ?? 'QR';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm"
      onClick={() => setQrPlatform(null)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} QR code`}
        className="fade-in border border-ink/20 bg-white p-6 shadow-[0_24px_64px_rgba(17,17,17,0.10)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-8">
          <span className="text-[11px] tracking-[0.3em] text-ink">
            {label}
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close QR code dialog"
            onClick={() => setQrPlatform(null)}
            className="text-[11px] tracking-[0.2em] text-ink/60 transition-colors hover:text-ink"
          >
            [CLOSE]
          </button>
        </div>

        <div className="flex h-56 w-56 items-center justify-center border border-ink/10 bg-paper">
          <QrImage src={entry?.value ?? ''} />
        </div>
        <div className="mt-3 text-[10px] tracking-[0.2em] text-ink/50">
          SCAN TO CONNECT — {label}
        </div>
      </div>
    </div>
  );
}

function QrImage({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QR Code"
      className="h-full w-full object-contain"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = 'none';
        const parent = el.parentElement;
        if (parent && !parent.querySelector('[data-qr-pending]')) {
          const div = document.createElement('div');
          div.dataset.qrPending = '1';
          div.className = 'text-center text-[10px] leading-5 tracking-[0.2em] text-ink/45';
          div.textContent = 'QR PENDING — REPLACE /public/social/wechat-qr.png';
          parent.appendChild(div);
        }
      }}
    />
  );
}
