'use client';

import { useEffect, useState } from 'react';
import { useOS } from '@/lib/store';

/**
 * 加载屏：场景 onCreated 后延迟撤除
 */
export default function LoadingScreen() {
  const loaded = useOS((s) => s.loaded);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => setHidden(true), 500);
    return () => window.clearTimeout(t);
  }, [loaded]);

  // 兜底：无论场景是否就绪，加载屏最多展示 10s（绝不无限 LOADING）
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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        loaded ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-sm tracking-[0.5em] text-ink">VANLAN.OS</div>
      <div className="mt-6 h-px w-40 bg-ink/10 overflow-hidden">
        <div className="loadbar-inner h-full w-full bg-ink/70" />
      </div>
      <div className="mt-4 text-[10px] tracking-[0.3em] text-ink/40">
        INITIALIZING ROOM 01
      </div>
    </div>
  );
}
