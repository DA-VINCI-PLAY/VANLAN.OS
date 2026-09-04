'use client';

/**
 * PanelSwap —— 模式层切换动画容器（R32：缩小退出 + 丝滑进入）
 *
 * 用户指令：「切换标签页时缩小退出」「主页和各个标签页之间的动画要完善丝滑」。
 *
 * 用法：每个模式一个 PanelSwap 实例（key=mode），show = 当前是否激活。
 *  - show false→true：mount + .panel-layer-enter（上浮 + 轻微放大进入）
 *  - show true→false：保留最后渲染的 children 快照，播放
 *    .panel-layer-exit（缩小 + 下沉 + 淡出）360ms 后卸载
 *  → 两个模式交叉切换时，旧面板缩小退场、新面板上浮进场，同时进行。
 *
 * 定位契约：包装层自身是 fixed inset-0 + transform 动画。内部子元素
 * （.os-mode-panel 移动端为 position:fixed）在带 transform 的祖先内
 * 以该祖先为 containing block —— 包装层恰好铺满视口，坐标与视口一致，
 * 因此面板定位零漂移。pointer-events 全穿透，子内容自带可点区域；
 * 退出层 aria-hidden + pointer-events:none 防幽灵交互。
 *
 * reduced-motion：globals.css 全局把 animation-duration 压到 0.01ms，天然降级。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

const EXIT_MS = 360;

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
  const [phase, setPhase] = useState<'in' | 'out'>(show ? 'in' : 'out');
  // 退出期间渲染最后展示过的 children 快照（children 卸载后仍可播完动画）
  const lastChildren = useRef<ReactNode>(children);
  if (show) lastChildren.current = children;

  useEffect(() => {
    if (show) {
      setMounted(true);
      setPhase('in');
    } else {
      setPhase((cur) => (cur === 'in' ? 'out' : cur));
    }
  }, [show]);

  // 退场动画播完再真正卸载
  useEffect(() => {
    if (!show && phase === 'out' && mounted) {
      const t = window.setTimeout(() => setMounted(false), EXIT_MS);
      return () => window.clearTimeout(t);
    }
  }, [show, phase, mounted]);

  if (!mounted) return null;
  return (
    <div
      aria-hidden={phase === 'out'}
      className={phase === 'out' ? 'panel-layer-exit' : 'panel-layer-enter'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: z,
        pointerEvents: 'none',
      }}
    >
      {lastChildren.current}
    </div>
  );
}
