'use client';

import { useEffect, useState } from 'react';
import { useOS } from '@/lib/store';
import { SITE } from '@/content/site';

/**
 * SystemHUD —— Tesla 风格轻量遥测栏（R51）
 *
 * 右上角常驻（极低视觉权重）：SYS ONLINE / FPS / MODE / 本地时间。
 * 下方挂「SYS // AUTH」管理员入口（极小，不打断浏览）。
 * 移动端只显示状态点 + FPS，节省横向空间。
 *
 * FPS 来源于 Canvas 内 FpsProbe（demand 模式下的真实渲染帧率）。
 */
export default function SystemHUD() {
  const mode = useOS((s) => s.mode);
  const fps = useOS((s) => s.fps);
  const [clock, setClock] = useState('');
  const setAdminOpen = useOS((s) => s.setAdminOpen);
  const adminUnlocked = useOS((s) => s.adminUnlocked);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, '0')}:${String(
          d.getMinutes(),
        ).padStart(2, '0')}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-20 flex flex-col items-end gap-2 sm:right-6 sm:top-5">
      {/* 遥测条 */}
      <div className="os-glass pointer-events-auto flex items-center gap-2.5 rounded-full px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="dot-pulse h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />
          <span className="font-mono text-[8px] tracking-[0.18em] text-ink/70 max-sm:hidden">
            SYS ONLINE
          </span>
        </span>
        <span className="h-3 w-px bg-white/10 max-sm:hidden" />
        <span className="font-mono text-[8px] tracking-[0.14em] text-ink/45">
          {fps > 0 ? `${fps} FPS` : '—'}
        </span>
        <span className="h-3 w-px bg-white/10 max-sm:hidden" />
        <span className="font-mono text-[8px] tracking-[0.14em] text-ink/70 max-sm:hidden">
          {mode}
        </span>
        <span className="font-mono text-[8px] tracking-[0.14em] text-ink/35 max-sm:hidden">
          {clock}
        </span>
      </div>

      {/* 品牌 + 管理员入口 */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[8px] tracking-[0.26em] text-ink/30 max-sm:hidden">
          {SITE.brand}
        </span>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          aria-label="Open system authentication"
          className="pointer-events-auto rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[8px] tracking-[0.2em] text-ink/45 transition-colors duration-200 hover:border-[#E82127]/60 hover:text-[#E82127]"
        >
          SYS // {adminUnlocked ? 'CTRL' : 'AUTH'}
        </button>
      </div>
    </div>
  );
}
