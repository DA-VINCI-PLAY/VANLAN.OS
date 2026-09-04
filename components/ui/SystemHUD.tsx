'use client';

import { useState } from 'react';
import { useOS } from '@/lib/store';
import { SITE } from '@/content/site';

/**
 * 右上角系统 HUD —— R36 「靠近才出现」双保险版
 *
 * 用户反馈：「隐藏他们修改改为靠近出现」—— 默认整个 HUD 都不见，
 * 只在鼠标进入右上角 170×180 透明区时整组浮现，移开则隐。
 *
 * 设计要点：
 *  - **嵌套 group**：外层 `.group fixed right-3 top-3 ...` 占据 170×180 框
 *    （pointer-events-auto）。鼠标进入外层即触发 `:hover`。
 *  - 内层 `group-hover:opacity-100` 通过 CSS 拉起；同时 JS `useState` 也设同样类
 *    兜底（Playwright headless 下 CSS group-hover 自己不可靠，JS 真事件稳妥）。
 *  - 内层 `pointer-events-none` 不拦截外层 hover（鼠标穿过 content 仍在外层）。
 *  - 整组过渡 duration-380ms ease-out；reduced-motion 150ms。
 *  - 移动端 touchstart/touchend 同步切换（覆盖触屏没有 hover 概念）。
 */
export default function SystemHUD() {
  const mode = useOS((s) => s.mode);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group fixed right-3 top-3 z-20 h-[180px] w-[170px] pointer-events-auto sm:right-6 sm:top-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      {/* 内层：CSS group-hover + JS 双开关；pointer-events-none 让外层 hover 始终生效 */}
      <div
        className={`
          pointer-events-none absolute inset-0
          flex flex-col items-end justify-start gap-2
          transition-opacity duration-[380ms] ease-out motion-reduce:duration-150
          ${hovered ? 'opacity-100 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `.trim()}
      >
        <span
          aria-hidden
          className="
            rounded-full border border-ink/30 bg-white/45 px-2 py-[3px]
            text-[9px] tracking-[0.28em] text-ink/70
            backdrop-blur-[6px]
          "
        >
          SYS&nbsp;▸
        </span>

        <div
          className="
            origin-top-right text-right
            text-[9px] leading-[1.75] tracking-[0.16em] text-ink/55
          "
        >
          <div className="rounded-md bg-white/40 px-3 py-2 backdrop-blur-[8px]">
            <div className="text-[10px] tracking-[0.28em] text-ink/85">{SITE.brand}</div>
            <div>
              SYSTEM ONLINE
              <span className="dot-pulse ml-1.5 inline-block h-1 w-1 rounded-full bg-ink/60 align-middle" />
            </div>
            <div>LOCATION HOME</div>
            <div>SPACE 01</div>
            <div className="text-ink/70">MODE {mode}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
