'use client';

/**
 * PanelSwap —— 模式层切换容器（R48 常驻 DOM + R50 运镜节奏协同）
 *
 * 用户指令（R48）：「杜绝切换时的组件全量销毁与重新挂载：标签内容常驻 DOM，
 * 使用 visibility/opacity/pointer-events 切换」「出场动画 translate3d(0,16px,0)
 * -> translate3d(0,0,0) 搭配 opacity 渐显」。
 *
 * R50 新增 sync 运镜协同（模式面板专用，HOME 名片不启用）：
 *  - 相机运镜（lib/timing.ts：桌面 0.95s / 移动 1.15s）前 60% 期间，
 *    面板以「微透明驻留」态等候（opacity 0.12、下沉 16px）；
 *  - 运镜接近就位（60% 处）再以 0.3s cubic-bezier(0.16,1,0.3,1) 平滑升起，
 *    消除「UI 已经弹出来、背景相机还在转」的脱节感；
 *  - 退场节奏不变（350ms 缩小退出，与下一块面板的驻留期交叉）。
 *
 * R47 及之前：show=false 360ms 后 children 全量卸载，切回重挂
 * （backdrop-blur 面板整树重建 = 切换卡顿主源）。
 * R48 起：mounted 一旦 true 永不回退 —— 所有模式面板首次挂载后常驻，
 * 切换只跑 opacity + transform(translate3d) 合成器动画，零重排零重挂。
 *
 * 动画期禁实时模糊：show 翻转后（含 sync 驻留期）容器挂 data-blur-off="1"，
 * globals.css 据此强制子级 backdrop-filter:none。
 *
 * 定位契约（继承 R32）：容器 fixed inset-0 + 自身 transform 动画，
 * 内部 position:fixed 子元素以容器为 containing block，坐标与视口一致。
 * 容器 pointer-events 恒为 none（穿透契约，子内容自带可点区域）；
 * 非激活层 aria-hidden + visibility:hidden + 延迟切换防幽灵交互。
 *
 * reduced-motion：globals.css 全局把 transition/animation 压到 0.01ms，天然降级。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useViewport } from '@/lib/useViewport';
import { panelSyncDelayMs, PANEL_ENTER_MS } from '@/lib/timing';

const EXIT_MS = 350;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
/** sync 驻留态的微透明度（相机运镜期间面板隐约可见） */
const HOLD_OPACITY = 0.12;

type Phase = 'hidden' | 'hold' | 'in';

export default function PanelSwap({
  show,
  z = 30,
  sync = false,
  children,
}: {
  show: boolean;
  z?: number;
  /** true = 与 GSAP 运镜协同：先驻留微透明，运镜 60% 处再升起（R50） */
  sync?: boolean;
  children: ReactNode;
}) {
  const vp = useViewport();
  const delay = sync ? panelSyncDelayMs(vp.isMobile) : 0;

  const [mounted, setMounted] = useState(show);
  const [animating, setAnimating] = useState(false);
  const [phase, setPhase] = useState<Phase>(show ? 'in' : 'hidden');
  // 首次激活后 children 常驻；show=false 不再卸载（R48 核心改动）
  const lastChildren = useRef<ReactNode>(children);
  if (show) lastChildren.current = children;

  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  // R50 相位机：show 上升沿 → hold（微透明驻留 delay ms）→ in（0.3s 升起）；
  // show 下降沿 → hidden（立即退场动画）。初次挂载即 show 时直接 in（无闪变）。
  const prevShow = useRef(show);
  useEffect(() => {
    if (!mounted) return;
    const was = prevShow.current;
    prevShow.current = show;
    if (show && !was) {
      setPhase('hold');
      const t = window.setTimeout(() => setPhase('in'), delay);
      return () => window.clearTimeout(t);
    }
    setPhase(show ? 'in' : 'hidden');
  }, [show, mounted, delay]);

  // 切换动画期标记（含 sync 驻留期）：禁子级 backdrop-filter（落定后恢复）
  useEffect(() => {
    if (!mounted) return;
    const total = show ? delay + PANEL_ENTER_MS + 20 : EXIT_MS + 20;
    setAnimating(true);
    const t = window.setTimeout(() => setAnimating(false), total);
    return () => window.clearTimeout(t);
  }, [show, mounted, delay]);

  if (!mounted) return null;

  const entered = phase === 'in';
  return (
    <div
      aria-hidden={!show}
      data-blur-off={animating ? '1' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: z,
        pointerEvents: 'none',
        opacity: entered ? 1 : show ? HOLD_OPACITY : 0,
        visibility: show ? 'visible' : 'hidden',
        transform: entered
          ? 'translate3d(0, 0, 0)'
          : 'translate3d(0, 16px, 0)',
        willChange: 'opacity, transform',
        transition: entered
          ? `opacity ${PANEL_ENTER_MS}ms ${EASE}, transform ${PANEL_ENTER_MS}ms ${EASE}, visibility 0s linear 0s`
          : show
            ? // hold 驻留态：瞬时落到微透明，等候运镜
              'none'
            : `opacity ${EXIT_MS}ms ${EASE}, transform ${EXIT_MS}ms ${EASE}, visibility 0s linear ${EXIT_MS}ms`,
      }}
    >
      {lastChildren.current}
    </div>
  );
}
