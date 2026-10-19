'use client';

import { useEffect, useState } from 'react';
import { useOS } from '@/lib/store';

/**
 * LoadingScreen —— 特斯拉式启动画面（R51）
 * 钛黑底 + 细红进度线 + 等宽启动日志；场景 onCreated 后淡出。
 * 兜底：最多 10s，绝不无限 LOADING。
 */
export default function LoadingScreen() {
  const loaded = useOS((s) => s.loaded);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => setHidden(true), 500);
    return () => window.clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    const t = window.setTimeout(() => setHidden(true), 10000);
    return () => window.clearTimeout(t);
  }, []);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading VANLAN.OS"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090A0C] transition-opacity duration-500 ${
        loaded ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="font-mono text-[12px] tracking-[0.62em] text-ink">
        VANLAN.OS
      </div>
      <div className="mt-7 h-px w-44 overflow-hidden bg-white/[0.07]">
        <div className="loadbar-inner h-full w-full bg-[#E82127]" />
      </div>
      <div className="mt-5 font-mono text-[9px] tracking-[0.32em] text-ink/35">
        INITIALIZING CABIN · ROOM 01
      </div>
    </div>
  );
}
