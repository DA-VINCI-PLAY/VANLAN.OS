'use client';
import { useEffect, useState } from 'react';

/**
 * useViewport —— 统一视口画像（替代 useIsMobile + 暴露 portrait/landscape/dpr）
 *
 * 与 useIsMobile 的关系：useIsMobile 仅返回 boolean；本 hook 返回完整视口画像，
 * CameraController / SceneCanvas / FOV 分支 / 底部导航等都可以订阅它。
 *
 * 维度：
 *  - width/height：innerWidth/innerHeight（CSS px）
 *  - dpr：devicePixelRatio
 *  - isMobile：宽 < 768 || pointer:coarse || 矮横屏（与 useIsMobile 同判定）
 *  - isCoarsePointer：matchMedia('(pointer: coarse)')
 *  - isPortrait：height >= width（兼容 orientation API 在 PC 上偶尔不存在的情况）
 *  - compactLandscape：横屏且 height <= 560（气泡隐藏、BubbleSystem 复用）
 *
 * 监听：
 *  - resize 事件（窗口缩放 / 旋转 / devtools 开关）
 *  - (orientation: portrait) mediaQuery（旋转事件，覆盖不到 resize 的边角）
 */
export interface ViewportProfile {
  width: number;
  height: number;
  dpr: number;
  isMobile: boolean;
  isCoarsePointer: boolean;
  isPortrait: boolean;
  compactLandscape: boolean;
}

const DEFAULT: ViewportProfile = {
  width: 1440,
  height: 900,
  dpr: 1,
  isMobile: false,
  isCoarsePointer: false,
  isPortrait: true,
  compactLandscape: false,
};

export function useViewport(): ViewportProfile {
  const [vp, setVp] = useState<ViewportProfile>(DEFAULT);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const isMobile =
        w < 768 || coarse || (h < 500 && w < 1024);
      const isPortrait = h >= w;
      const compactLandscape = !isPortrait && h <= 560;
      setVp({
        width: w,
        height: h,
        dpr: window.devicePixelRatio || 1,
        isMobile,
        isCoarsePointer: coarse,
        isPortrait,
        compactLandscape,
      });
    };
    compute();
    window.addEventListener('resize', compute);
    const mqP = window.matchMedia('(orientation: portrait)');
    const mqL = window.matchMedia('(orientation: landscape)');
    const onMq = () => compute();
    mqP.addEventListener?.('change', onMq);
    mqL.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener('resize', compute);
      mqP.removeEventListener?.('change', onMq);
      mqL.removeEventListener?.('change', onMq);
    };
  }, []);

  return vp;
}