'use client';

/**
 * PanelSwap —— 模式层切换容器（R48：常驻 DOM + GPU 通道过渡）
 *
 * 用户指令：「杜绝切换时的组件全量销毁与重新挂载：标签内容常驻 DOM，
 * 使用 visibility/opacity/pointer-events 切换」「出场动画 translate3d(0,16px,0)
 * -> translate3d(0,0,0) 搭配 opacity 渐显，0.35s cubic-bezier(0.16,1,0.3,1)」。
 *
 * R47 及之前：show=false 360ms 后 children 全量卸载，切回重挂
 * （backdrop-blur 面板整树重建 = 切换卡顿主源）。
 * R48 起：mounted 一旦 true 永不回退 —— 所有模式面板首次挂载后常驻，
 * 切换只跑 opacity + transform(translate3d) 合成器动画，零重排零重挂。
 *
 * 动画期禁实时模糊：show 翻转后 ~360ms 内容器挂 data-blur-off="1"，
 * globals.css 据此强制子级 backdrop-filter:none —— 毛玻璃实时重绘是
 * WebGL 上层合成的大头，动画期间关闭、落定后恢复（用户指令二选一之 A）。
 *
 * 定位契约（继承 R32）：容器 fixed inset-0 + 自身 transform 动画，
 * 内部 position:fixed 子元素以容器为 containing block，坐标与视口一致。
 * 容器 pointer-events 恒为 none（穿透契约，子内容自带可点区域）；
 * 非激活层 aria-hidden + visibility:hidden + 延迟切换防幽灵交互。
 *
 * reduced-motion：globals.css 全局把 transition/animation 压到 0.01ms，天然降级。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

const ANIM_MS = 350;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export default function PanelSwap({
  show,
  z = 30,
  children,
}: {
  show: boolean;
  z?: number;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(show);
  const [animating, setAnimating] = useState(false);
  // 首次激活后 children 常驻；show=false 不再卸载（R48 核心改动）
  const lastChildren = useRef<ReactNode>(children);
  if (show) lastChildren.current = children;

  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  // 切换动画期标记：禁子级 backdrop-filter（落定后恢复毛玻璃）
  useEffect(() => {
    if (!mounted) return;
    setAnimating(true);
    const t = window.setTimeout(() => setAnimating(false), ANIM_MS + 20);
    return () => window.clearTimeout(t);
  }, [show, mounted]);

  if (!mounted) return null;
  return (
    <div
      aria-hidden={!show}
      data-blur-off={animating ? '1' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: z,
        pointerEvents: 'none',
        opacity: show ? 1 : 0,
        visibility: show ? 'visible' : 'hidden',
        transform: show ? 'translate3d(0, 0, 0)' : 'translate3d(0, 16px, 0)',
        willChange: 'opacity, transform',
        transition: show
          ? `opacity ${ANIM_MS}ms ${EASE}, transform ${ANIM_MS}ms ${EASE}, visibility 0s linear 0s`
          : `opacity ${ANIM_MS}ms ${EASE}, transform ${ANIM_MS}ms ${EASE}, visibility 0s linear ${ANIM_MS}ms`,
      }}
    >
      {children}
    </div>
  );
}
