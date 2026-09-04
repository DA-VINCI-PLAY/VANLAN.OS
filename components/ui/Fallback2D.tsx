'use client';

/**
 * 2D VANLAN.OS Fallback —— WebGL 不可用 / 用户关闭 3D / 3D 运行期崩溃时接管。
 *
 * 原则：3D 是增强，不是访问前提。此层不依赖任何 WebGL 能力：
 * - mode 感知的 soft sky gradient（CSS，切换平滑过渡）
 * - 中央极简白色兽头（SVG，非图片资源）——保留 Furry Head 空间概念
 * - 头部上方浮动的 mode 关键词 chips（装饰性 aria-hidden；信息本体在 Nav / 面板）
 * - 5 模式收敛（第八轮）：GALLERY / CONTACT / ALBUM / ABOUT，HOME 为大厅
 *   （ModePanels / BottomNavigation / AudioPlayer / QrModal 都是独立 DOM 层，3D 失败不牵连）
 * - 挂载即宣告 loaded，Loading 屏绝不无限等待
 */

import { useEffect } from 'react';
import { MODE_CONFIG } from '@/lib/modeConfig';
import { ALBUMS } from '@/content/albums';
import { useOS, type Mode } from '@/lib/store';

/** 与 3D 天空同族的柔和顶部色（每模式，5 键） */
const SKY: Record<Mode, string> = {
  HOME: '#d6e4f2',
  GALLERY: '#ded9f1',
  CONTACT: '#f3e6d2',
  ALBUM: '#f4dbe6',
  ABOUT: '#dde6db',
};

/** ALBUM 关键词 = 前三张专辑标题（由数据派生，避免写死重复） */
const ALBUM_CHIPS = ALBUMS.slice(0, 3).map((a) => a.vanlan);

/** 装饰性关键词（与 3D 气泡同义；只作氛围，不作交互） */
const CHIPS: Partial<Record<Mode, string[]>> = {
  GALLERY: ['MV', 'VLOG', 'INTERVIEW'],
  CONTACT: ['EMAIL', 'WECHAT', 'BILIBILI', 'QQ'],
  ALBUM: ALBUM_CHIPS,
  ABOUT: ['2026', '2025', '2024', '2023'],
};

function SkyHead() {
  const mode = useOS((s) => s.mode);
  const rm = useOS((s) => s.reducedMotion);
  const cfg = MODE_CONFIG[mode];
  const top = SKY[mode];
  const halo = cfg.haloColor;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* 天空渐变（背景色可 transition，mode 切换平滑；全 linear 规范） */}
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-linear"
        style={{
          background: `linear-gradient(180deg, ${top} 0%, #ffffff 62%)`,
        }}
      />
      {/* 头后柔光 */}
      <div
        className="absolute left-1/2 top-[46%] h-[62vmin] w-[62vmin] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-700 ease-linear"
        style={{
          background: `radial-gradient(circle, ${halo}66 0%, ${halo}1a 46%, transparent 70%)`,
        }}
      />

      {/* 兽头呼吸 */}
      <div
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2"
        style={{
          animation: rm ? 'none' : 'fallback-breathe 5.2s linear infinite',
          width: 'min(38vmin, 300px)',
        }}
      >
        <svg viewBox="0 0 340 320" className="w-full drop-shadow-[0_18px_38px_rgba(17,17,17,0.07)]">
          {/* 耳朵（三角绒耳，左右对称外倾） */}
          <ellipse cx="112" cy="92" rx="40" ry="56" transform="rotate(-26 112 92)" fill="#f4f3f0" />
          <ellipse cx="228" cy="92" rx="40" ry="56" transform="rotate(26 228 92)" fill="#f4f3f0" />
          <ellipse cx="112" cy="106" rx="20" ry="34" transform="rotate(-26 112 106)" fill="#e9e7e3" />
          <ellipse cx="228" cy="106" rx="20" ry="34" transform="rotate(26 228 106)" fill="#e9e7e3" />
          {/* 主头 */}
          <circle cx="170" cy="196" r="104" fill="#f4f3f0" />
          {/* 颊毛 */}
          <circle cx="92" cy="226" r="34" fill="#faf9f7" />
          <circle cx="248" cy="226" r="34" fill="#faf9f7" />
          {/* 口鼻 */}
          <ellipse cx="170" cy="240" rx="44" ry="32" fill="#f6f5f2" />
          {/* 鼻头 */}
          <path d="M170 212 L178 228 Q170 236 162 228 Z" fill="#2a2a28" />
          {/* 嘴 */}
          <path d="M170 238 Q186 252 200 244" stroke="#c9c6c1" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* 眼 */}
          <ellipse cx="134" cy="182" rx="7.5" ry="10.5" fill="#2a2a28" />
          <ellipse cx="206" cy="182" rx="7.5" ry="10.5" fill="#2a2a28" />
          <circle cx="137" cy="179" r="2.4" fill="#ffffff" />
          <circle cx="209" cy="179" r="2.4" fill="#ffffff" />
        </svg>
      </div>

      {/* mode 关键词 chips（头顶弧线带；不动画于 RM） */}
      {mode !== 'HOME' && (CHIPS[mode]?.length ?? 0) > 0 && (
        <div className="absolute left-1/2 top-[20%] flex -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6">
          {CHIPS[mode]!.map((c, i) => (
            <span
              key={c}
              className="whitespace-nowrap rounded-full border border-ink/12 bg-white/70 px-3.5 py-1.5 text-[10px] tracking-[0.2em] text-ink/70 shadow-[0_6px_18px_rgba(17,17,17,0.05)] backdrop-blur-sm"
              style={
                rm
                  ? {}
                  : {
                      animation: `fallback-float 7s linear ${i * 0.9}s infinite`,
                    }
              }
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* 极淡 floor 提示线（空间感） */}
      <div className="absolute left-1/2 top-[86%] h-px w-[54vmin] -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/12 to-transparent" />
    </div>
  );
}

export default function Fallback2D() {
  const mode = useOS((s) => s.mode);
  const setLoaded = useOS((s) => s.setLoaded);
  const rm = useOS((s) => s.reducedMotion);
  void rm; // CSS 层动画由全局 RM 规则压制；此处订阅避免未来需求缺状态

  // 挂载即就绪：Loading 屏必然撤除（不无限等待）
  useEffect(() => {
    setLoaded(true);
    return () => {};
  }, [setLoaded]);

  return (
    <>
      <SkyHead />
      {/* 可读性兜底信息：当前 mode / 去向（页面不依赖 3D 也可理解） */}
      <div className="pointer-events-none fixed bottom-[136px] left-1/2 z-10 -translate-x-1/2 select-none text-center">
        <div className="text-[9px] tracking-[0.35em] text-ink/45">
          MODE / {mode}
        </div>
        <div className="mt-1 text-[8px] tracking-[0.3em] text-ink/35">
          LIGHTWEIGHT INTERFACE — 3D UNAVAILABLE
        </div>
      </div>
      {/* 性能/降级状态不依赖 3D 也能被识别：模式关键词语义已在导航与面板中 */}
      <span className="sr-only">
        Currently in {mode} mode. Use the navigation below to switch modes.
      </span>
    </>
  );
}
