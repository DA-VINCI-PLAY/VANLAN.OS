'use client';

/**
 * RenderRoot —— 3D / 2D 渲染分流（Progressive Enhancement 的入口）。
 *
 * 判定链：
 *   WebGL 不可用            → 2D Fallback（且不请求 three 相关 chunk）
 *   用户关闭 3D（无需刷新）  → 2D Fallback（Lightweight Mode）
 *   3D 运行期崩溃(ErrorBoundary)→ 2D Fallback（页面不白屏、UI 不崩）
 *   其余                    → 3D Canvas（按检测 Quality 参数化）
 *
 * 挂载时同步执行硬件能力探测（安全回退），并监听系统 Reduced Motion。
 * 用户手动切换 Reduced Motion 后，系统偏好不再覆盖（rmUserTouched）。
 */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useOS } from '@/lib/store';
import {
  detectQuality,
  prefersReducedMotion,
  webglSupported,
} from '@/lib/perf';
import Fallback2D from './ui/Fallback2D';

/* SceneCanvas 及其 three 依赖仅在需要 3D 时才请求 chunk（懒加载） */
const SceneCanvasLazy = dynamic(
  () => import('./scene/SceneCanvas'),
  { ssr: false, loading: () => null },
);

/* 用户是否手动改过 RM —— 防止后续系统偏好变化覆盖用户的选择 */
let rmUserTouched = false;
export function markRmUserTouched() {
  rmUserTouched = true;
}

export default function RenderRoot() {
  const webglOK = useOS((s) => s.webglOK);
  const threeD = useOS((s) => s.threeD);
  const sceneFailed = useOS((s) => s.sceneFailed);

  // 首帧前同步判定（client-only 组件，安全使用 navigator）
  const [boot] = useState(() => ({
    webglOK: webglSupported(),
    quality: detectQuality(),
  }));

  useEffect(() => {
    // 初始探测结果写入 store（FPS 自适应基于 store.quality）
    useOS.setState({
      webglOK: boot.webglOK,
      quality: boot.quality,
    });
    if (!rmUserTouched) {
      useOS.setState({ reducedMotion: prefersReducedMotion() });
    }
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      if (!rmUserTouched) useOS.setState({ reducedMotion: e.matches });
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [boot]);

  const show3D = webglOK && threeD && !sceneFailed;

  return show3D ? <SceneCanvasLazy /> : <Fallback2D />;
}
