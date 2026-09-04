'use client';

/**
 * HomeSlab —— HOME 模式「展台前告示牌」+ 6 欲气泡（R37 + R38 + R39）
 *
 * 用户反馈（R39）：「把座右铭不触碰时缩小为小胶囊，靠近触碰时展开，
 * 点击时放大」—— 三态交互：
 *
 *  - rest（不触碰）    → 小胶囊：圆点 + "座右铭 / MOTTO" 短标签，
 *                        `rounded-full` 34px 高，半透明白玻璃。
 *  - hover（靠近触碰） → 展开成完整面板：role + bio + motto 主/副行，
 *                        6 个"欲"气泡围圆 60° 等分布局向外浮出
 *                        （scale 0.3→1 + opacity 0→1，stagger 35ms）。
 *  - focus（点击）     → 放大：slab scale → 1.12 + `#3d9bff` accent 蓝
 *                        ring + 底部提示行；同时 CameraController 监听
 *                        `homeFocus` dolly in 到 plinth 凑近位。再点恢复。
 *
 * 形态过渡（胶囊 ↔ 面板）用 inline-style 驱动 width/height/border-radius/
 * opacity，全部 linear（项目规范）；reduced-motion 由全局规则压至 0.01ms。
 * 展开态 `expanded = hovered || homeFocus`，气泡跟随 expanded 浮出。
 *
 * 设计要点：
 *  - 3D plinth 屏幕投影在 HOME 桌面下 32-40vh / 移动 28-38vh，
 *    slab center 锚定该区。wrapper pointer-events-auto（hover+click）。
 *  - desktop 始终渲染，移动 portrait + landscape 都显示，compactLandscape R 缩小。
 */

import { useEffect, useState } from 'react';
import { useOS, type Lang } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { IDENTITY, MOTTO, BIO, DESIRES } from '@/content/about';

const SLAB_TEXTS = {
  pillLabel: {
    zh: '座右铭',
    en: 'MOTTO',
  },
  /* R38 focus 提示文案 */
  focusOn: {
    zh: '已聚焦 · 再次点击退出',
    en: 'Focused · tap again to exit',
  },
} as const;

export default function HomeSlab() {
  const mode = useOS((s) => s.mode);
  const lang = useOS((s) => s.lang) as Lang;
  const homeFocus = useOS((s) => s.homeFocus);
  const toggleHomeFocus = useOS((s) => s.toggleHomeFocus);
  const setHomeFocus = useOS((s) => s.setHomeFocus);
  const compact = useViewport().compactLandscape;
  const [hovered, setHovered] = useState(false);

  // 离开 HOME 时复位 hover + focus（避免切回时还显示气泡/凑近位）
  useEffect(() => {
    if (mode !== 'HOME') {
      setHovered(false);
      if (homeFocus) setHomeFocus(false);
    }
  }, [mode, homeFocus, setHomeFocus]);

  if (mode !== 'HOME') return null;

  const pillLabel = SLAB_TEXTS.pillLabel[lang];
  const bio = BIO[lang];
  const main = MOTTO.main[lang];
  const sub = MOTTO.sub[lang];
  const focusHint = SLAB_TEXTS.focusOn[lang];

  // R39：expanded 驱动胶囊↔面板；scale 三态（rest 1 / hover 1.03 / focus 1.12）
  const expanded = hovered || homeFocus;
  const scale = homeFocus ? 1.12 : hovered ? 1.03 : 1;

  // 气泡半径与面板/胶囊尺寸（桌面 vs compactLandscape）
  // R39：英文 motto 70 字符要换 2-3 行，panelH 需加大防 overflow-hidden 裁切
  const R = compact ? 82 : 124;
  const panelW = compact ? 250 : 330;
  const panelH = compact ? 150 : 190;
  const pillW = compact ? 108 : 132;
  const pillH = compact ? 28 : 34;

  const width = expanded ? panelW : pillW;
  const height = expanded ? panelH : pillH;
  const radius = expanded ? 8 : 999;

  const shapeTransition =
    'width 380ms linear, height 380ms linear, border-radius 380ms linear, ' +
    'transform 380ms linear, background-color 300ms linear, border-color 300ms linear';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
      style={{
        bottom: compact
          ? 'calc(20vh + env(safe-area-inset-bottom))'
          : 'calc(28vh + env(safe-area-inset-bottom))',
      }}
    >
      {/* ====== slab 容器（hover hotzone + click 切换 focus） ====== */}
      <div
        className="relative cursor-pointer select-none pointer-events-auto"
        style={{ width: panelW, height: panelH }}
        onClick={() => toggleHomeFocus()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onTouchStart={() => setHovered(true)}
        onTouchEnd={() => setHovered(false)}
        role="button"
        tabIndex={0}
        aria-pressed={homeFocus}
        aria-label={
          homeFocus
            ? lang === 'zh'
              ? '已聚焦展台，再次点击退出'
              : 'Plinth focused, tap to exit'
            : lang === 'zh'
              ? '点击聚焦展台看详情'
              : 'Tap to focus the plinth'
        }
      >
        {/* ====== 6 欲气泡 — 围圆 60° 等分布局（expanded 时浮出） ====== */}
        {DESIRES.map((d, i) => {
          const angle = (Math.PI * 2 * i) / DESIRES.length - Math.PI / 2;
          const x = Math.cos(angle) * R;
          const y = Math.sin(angle) * R;
          const bScale = expanded ? 1 : 0.35;
          const opacity = expanded ? 1 : 0;
          const delay = expanded ? i * 35 : (DESIRES.length - 1 - i) * 25;
          return (
            <span
              key={d.key}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border border-ink/20 bg-white/85 px-3 py-1 text-[10px] tracking-[0.18em] text-ink/85 shadow-[0_4px_16px_rgba(17,17,17,0.06)] backdrop-blur-md sm:text-[11px] sm:tracking-[0.22em]"
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${bScale})`,
                opacity,
                transition:
                  `transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, ` +
                  `opacity 360ms linear ${delay}ms`,
              }}
            >
              {d[lang]}
            </span>
          );
        })}

        {/* ====== slab 本体（R39：胶囊 ↔ 面板形态过渡 + 点击放大） ====== */}
        <div
          aria-label="Identity placard"
          className={`
            pointer-events-none absolute left-1/2 top-1/2
            flex flex-col items-center justify-center overflow-hidden text-center backdrop-blur-xl
            shadow-[0_8px_24px_rgba(17,17,17,0.07),inset_0_1px_0_rgba(255,255,255,0.75)]
            ${homeFocus
              ? 'border border-[#3d9bff]/55 bg-white/60 ring-1 ring-[#3d9bff]/45'
              : 'border border-white/55 bg-white/45 ring-1 ring-ink/[0.05]'}
          `}
          style={{
            width,
            height,
            borderRadius: radius,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transition: shapeTransition,
          }}
        >
          {/* ====== 小胶囊标签（rest 显示，展开时淡出） ====== */}
          <div
            className={`absolute inset-0 flex items-center justify-center gap-2 ${
              expanded ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ transition: 'opacity 180ms linear' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#3d9bff]/80" />
            <span className="font-mono text-[9px] tracking-[0.28em] text-ink/75 sm:text-[10px]">
              {pillLabel}
            </span>
          </div>

          {/* ====== 展开内容（expanded 显示，rest 淡出） ====== */}
          <div
            className={`flex flex-col items-center gap-1 px-4 py-2.5 ${
              expanded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transition: 'opacity 220ms linear' }}
          >
            {/* role 行（小、灰、tracking） */}
            <div className="font-mono text-[8px] tracking-[0.28em] text-ink/55 sm:text-[9px]">
              {IDENTITY.role}
            </div>
            {/* bio 行 */}
            <div className="text-[10px] tracking-[0.16em] text-ink/85 sm:text-[11px] sm:tracking-[0.2em]">
              {bio}
            </div>
            {/* motto 主行 */}
            <div className="mt-0.5 text-[8px] leading-relaxed tracking-[0.14em] text-ink/65 sm:text-[9px] sm:tracking-[0.18em]">
              {main}
            </div>
            {/* motto 副行 */}
            <div className="text-[7px] leading-relaxed tracking-[0.14em] text-ink/45 sm:text-[8px] sm:tracking-[0.16em]">
              {sub}
            </div>
            {/* R38 focus 状态提示行（仅 homeFocus=true 时出现） */}
            {homeFocus && (
              <div
                className="mt-0.5 font-mono text-[7px] tracking-[0.22em] text-[#3d9bff]/85 sm:text-[8px]"
                aria-hidden
              >
                · {focusHint} ·
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
