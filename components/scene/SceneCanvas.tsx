'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { MODE_CONFIG } from '@/lib/modeConfig';
import { QUALITY_CFG, detectQuality } from '@/lib/perf';
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
 * FpsProbe —— R51 遥测：真实渲染帧率（1s 窗口）
 * demand 模式下 useFrame 只在真正出帧时执行 → 读到的是渲染帧率而非屏幕刷新率。
 */
function FpsProbe() {
  const frames = useRef(0);
  const last = useRef(0);
  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (!last.current) {
      last.current = now;
      return;
    }
    const dt = now - last.current;
    if (dt < 1000) return;
    const fps = Math.round((frames.current * 1000) / dt);
    frames.current = 0;
    last.current = now;
    const cur = useOS.getState().fps;
    // 只在变化 ≥2 时写 store，避免无意义 re-render
    if (Math.abs(cur - fps) >= 2) useOS.getState().setFps(fps);
  });
  return null;
}

/**
 * RenderPump —— R51 demand 渲染的节拍器
 *
 * 用户指令：静态时 frameloop="demand"，只在交互 / 待机微动时出帧。
 * 实现：保持一条极轻的 rAF 只做「时间判断 + invalidate」，真正渲染
 * 频率按场景状态分档：
 *  - HOME 有轨道环绕 → 桌面 30fps / 移动 24fps（旋转不卡顿）
 *  - 其余模式（静态展厅）→ 桌面 15fps / 移动 10fps（待机呼吸即可）
 *  - 相机运镜 / 拖拽 / 滚轮由 CameraController 与 PointerPump 额外
 *    invalidate，瞬间回到 60fps，不牺牲交互手感。
 */
function RenderPump({ isMobile }: { isMobile: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const mode = useOS((s) => s.mode);

  const fps = isMobile
    ? mode === 'HOME'
      ? 24
      : 10
    : mode === 'HOME'
      ? 30
      : 15;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last >= 1000 / fps) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate, fps]);

  return null;
}

/**
 * PointerPump —— 交互期间强制满帧（demand 模式下手势不粘手）
 * 监听 canvas 容器的 pointer / wheel 事件，每次触发 invalidate。
 */
function PointerPump() {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const on = () => invalidate();
    el.addEventListener('pointermove', on, { passive: true });
    el.addEventListener('pointerdown', on, { passive: true });
    el.addEventListener('wheel', on, { passive: true });
    el.addEventListener('touchmove', on, { passive: true });
    return () => {
      el.removeEventListener('pointermove', on);
      el.removeEventListener('pointerdown', on);
      el.removeEventListener('wheel', on);
      el.removeEventListener('touchmove', on);
    };
  }, [gl, invalidate]);
  return null;
}

/**
 * R48：visibilitychange 沿吞掉 Clock 累积 delta。
 * 浏览器对后台标签页天然停掉 rAF（非本站逻辑），回前台首帧
 * delta≈后台时长，所有 `delta*speed` 系统（orbit/微尘/余烬）
 * 会一次性瞬移 = 画面抖动。回前台时手动 getDelta() 清零即可。
 * （伪休眠 renderPaused 已按 R48 用户指令彻底移除，不再暂停时钟。）
 */
function ClockReset() {
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) clock.getDelta();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [clock]);
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
    // R46 名片化：HOME 时 pointer-events:none —— 兽头纯背景，点击全部穿透给
    // 名片卡/导航，严防透明 canvas 挡住 UI；touch-action:none 防浏览器手势劫持。
    <div
      aria-hidden
      className="os-3d absolute inset-0"
      style={{
        pointerEvents: isHome ? 'none' : 'auto',
        // R51：竖屏上下滚动不被 3D 场景完全拦截（用户手势优先）
        touchAction: 'pan-y',
      }}
    >
      <SceneErrorBoundary>
        <Canvas
          // R51：静态展厅按需渲染（待机 10–30fps，交互 / 运镜回满帧）
          frameloop="demand"
          // R51：实时阴影全关（性能优先；接地由接触阴影平面负责）
          shadows={false}
          // DPR 硬封顶 1.5：禁止 Retina 3x 全像素消耗
          dpr={[1, Math.min(vp.dpr || 1, 1.5)]}
          camera={{
            fov: homeFov,
            // R49：near 0.1→0.5 —— 近裁切面过小会耗尽深度精度（z-fighting 主因之一）
            near: 0.5,
            far: 60,
            position: home,
          }}
          gl={{
            // R49：对数深度缓冲根治底座共面闪烁（Z-Fighting）；
            // MSAA 恒开（用户指令），锯齿由后端质量档位控制的是阴影/粒子而非 AA
            antialias: true,
            logarithmicDepthBuffer: true,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            // 第六轮：ACES tone mapping；Phase 01：曝光 1.05 → 1.0（防石膏过曝 §二十八），
            // 显式 PCFSoft → 兽头/墙/地阴影为柔和渐变而非硬边
            // R51：R3F 的 <Canvas style> 只作用于外层 wrapper，真正的 <canvas>
            // 元素还得显式设置 —— 否则竖屏上下滑动会被 3D 场景完全拦截
            gl.domElement.style.touchAction = 'pan-y';
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            // setLoaded 不在这里触发 —— 改由 Character 的 GLBCharacter 挂载时触发，
            // 保证 LoadingScreen 盖到「真实兽头模型就绪」为止（R44 用户指令）
          }}
          style={{ position: 'absolute', inset: 0, touchAction: 'pan-y' }}
        >
          <color attach="background" args={['#0a0b0d']} />
          <fogExp2 attach="fog" args={['#0a0b0d', 0.012]} />

          <RenderPump isMobile={isMobile} />
          <PointerPump />
          <FpsProbe />
          <ClockReset />

          <Suspense fallback={null}>
            {!isHome && <LightingController isMobile={isMobile} />}
            {!isHome && <Room isMobile={isMobile} />}
            {isHome && (
              <>
                {/* 夜间展厅补光：极低环境光，让雕塑暗部不死黑 */}
                <ambientLight intensity={0.32} />
                {/* 特斯拉红侧逆光：只给雕塑边缘一丝冷红，呼应 UI 强调色 */}
                <pointLight
                  position={[-2.6, 2.4, -2.2]}
                  intensity={2.2}
                  color="#e82127"
                  distance={9}
                  decay={2}
                />
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
