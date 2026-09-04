'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { MODE_CONFIG } from '@/lib/modeConfig';
import { QUALITY_CFG, detectQuality, rankOf, qualityFromRank } from '@/lib/perf';
import { useOS, type Quality } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { resolveHomeDesk } from '@/lib/viewportCam';
import Room from './Room';
import LightingController from './LightingController';
import Character from './Character';
import CameraController from './CameraController';
import BubbleSystem from './BubbleSystem';
import AlbumCarousel from './AlbumCarousel';
import DustField from './DustField';
import EmberField from './EmberField';
import Plinth from './Plinth';
import HandwrittenSign from './HandwrittenSign';

/**
 * 3D 场景级错误边界：任何运行期崩溃（材质/几何/资源）都不得让整个
 * React Tree 白屏 —— 捕获后置 sceneFailed → RenderRoot 切 2D Fallback。
 * （GLB 单一资源失败由 Character 内部边界降级为程序化兽头，见该文件。）
 */
class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    useOS.getState().setSceneFailed(true);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * 极轻量 FPS 自适应监测（每 1.5s 采样一次，绝不在每帧 setState）：
 * - 连续 3 次 < 35 FPS → 降一档（HIGH→MEDIUM→LOW）
 * - 连续 5 次 > 50 FPS → 回升一档，但不高于初始检测档（避免 HIGH/LOW 抖动）
 * 短暂卡顿不触发；hysteresis 防频繁升降。
 */
function AdaptiveQuality({ initial }: { initial: Quality }) {
  const frames = useRef(0);
  const last = useRef(0);
  const lowStreak = useRef(0);
  const upStreak = useRef(0);
  const baseRank = useRef(rankOf(initial));

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (last.current === 0) {
      last.current = now;
      return;
    }
    const dt = now - last.current;
    if (dt < 1500) return;
    const fps = (frames.current * 1000) / dt;
    frames.current = 0;
    last.current = now;

    const cur = useOS.getState().quality;
    const r = rankOf(cur);
    if (fps < 35) {
      lowStreak.current += 1;
      upStreak.current = 0;
      if (lowStreak.current >= 3 && r > 0) {
        useOS.getState().setQuality(qualityFromRank(r - 1));
        lowStreak.current = 0;
      }
    } else if (fps > 50) {
      upStreak.current += 1;
      lowStreak.current = 0;
      if (upStreak.current >= 5 && r < baseRank.current) {
        useOS.getState().setQuality(qualityFromRank(r + 1));
        upStreak.current = 0;
      }
    } else {
      lowStreak.current = 0;
      upStreak.current = 0;
    }
  });

  return null;
}

export default function SceneCanvas() {
  const vp = useViewport();
  const isMobile = vp.isMobile;
  const isPortrait = vp.isPortrait;
  const mode = useOS((s) => s.mode);
  // R31 home 重构：HOME = 单主体极简白空间（雕塑 + 陈列台 + 微尘 + 地面），
  // Room / 窗 / 灯光控制 / 气泡 / 轮播 / EMBER 一律不挂载
  const isHome = mode === 'HOME';
  const setLoaded = useOS((s) => s.setLoaded);
  // 首次挂载同步探测质量档（Canvas 构造参数只能定一次，探测先行）
  const [quality] = useState<Quality>(() => detectQuality());
  const cfg = QUALITY_CFG[quality];
  const homeCfg = MODE_CONFIG.HOME;
  // R29：HOME 初始相机 = 桌面 viewport 实时解析 / 移动端竖屏·横屏独立档案。
  // 初值仅供 Canvas 构造（一次）；转屏后的 FOV 由 CameraController 校正。
  const home = useMemo(() => {
    if (isMobile) {
      const pose = isPortrait
        ? homeCfg.cameraMobilePortrait
        : homeCfg.cameraMobileLandscape;
      return pose.pos;
    }
    return resolveHomeDesk().pos;
  }, [isMobile, isPortrait, homeCfg]);
  const homeFov = isMobile
    ? isPortrait
      ? homeCfg.fovMobilePortrait
      : homeCfg.fovMobileLandscape
    : homeCfg.fovDesktop;

  return (
    // 3D 场景整体为装饰/视觉层（aria-hidden）：
    // 导航、内容、状态等语义信息全部在 DOM UI 层（Experience），读屏不会混淆
    <div aria-hidden className="absolute inset-0">
      <SceneErrorBoundary>
        <Canvas
          shadows={cfg.shadows}
          dpr={[1, isMobile ? cfg.dprCapMobile : cfg.dprCap]}
          camera={{
            fov: homeFov,
            near: 0.1,
            far: 60,
            position: home,
          }}
          gl={{
            antialias: cfg.antialias,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            // 第六轮：ACES tone mapping；Phase 01：曝光 1.05 → 1.0（防石膏过曝 §二十八），
            // 显式 PCFSoft → 兽头/墙/地阴影为柔和渐变而非硬边
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            window.setTimeout(() => setLoaded(true), 600);
          }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <color attach="background" args={['#ecebe5']} />
          <fogExp2 attach="fog" args={['#ecebe5', 0.01]} />

          <AdaptiveQuality initial={quality} />

          <Suspense fallback={null}>
            {!isHome && <LightingController isMobile={isMobile} />}
            {!isHome && <Room isMobile={isMobile} />}
            {isHome && (
              <>
                {/* 极简白空间补光：Character 自带 SculptLighting 三件套，
                    这里只补环境光让暗部不死黑 */}
                <ambientLight intensity={0.55} />
                {/* R32：兽头背后的粗糙手写 VANLAN（billboard + 视口自适应，
                    相机轨道环绕时永远保持"在兽头正后方"的构图） */}
                <HandwrittenSign />
                {/* 无地面 mesh：背景即无限白（tone mapping 会让任何地面材质
                    与背景产生色差），接地感由 Plinth 自带接触阴影平面负责 */}
              </>
            )}
            <Character />
            <Plinth />
            {!isHome && <AlbumCarousel />}
            <DustField isMobile={isMobile} />
            {!isHome && <EmberField isMobile={isMobile} />}
          </Suspense>

          <CameraController />
          {!isHome && <BubbleSystem isMobile={isMobile} />}
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
