'use client';

/**
 * KemonoHeadCanvas —— 透明背景兽头层（R52）
 *
 * 只保留 GLB 兽头主体，房间 / 展台 / 窗景全部移除；Canvas alpha 透出底层 2D 分镜。
 *
 * 驱动方式：
 *   useFrame 里直接读 scrub.progress（模块单例），用 THREE.MathUtils.damp 平滑
 *   逼近关键帧采样值 —— 拖动时间轴时不会触发任何 React 重渲染。
 *
 * 降载：
 *   dpr 封顶 1.5 / 无后处理 / 无实时阴影 / frameloop="demand" + 自适应 RenderPump
 *   （交互 30fps → 缓动 15fps → 静置 6fps）。
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sampleHead, scrub, subscribeFrame } from '@/lib/opTimeline';

const MODEL_URL = '/models/vanlan.glb';
const DRACO_DECODER_PATH = '/draco/';
/** GLB forward = +X，旋转 -π/2 让兽头面向 +Z（相机方向） */
const BASE_YAW = -Math.PI / 2;
const TARGET_H = 1.75;

useGLTF.preload(MODEL_URL, DRACO_DECODER_PATH);

/**
 * 断点档案（R69）—— 与 CSS 断点同源：<768 手机 / 768~1023 平板 / ≥1024 桌面。
 *
 * 结构前提：CSS 已把 3D 画布限制在「右侧主体区」（手机是顶部 35vh 舞台），
 * 兽头在容器内居中即可，不再需要世界坐标偏移去躲大字 —— 那个偏移量在
 * 窗口缩放时会被放大，正是排版崩坏的来源。
 */
function stageProfile(width: number) {
  if (width < 768) {
    // 手机：35vh 舞台，稍拉远一点避免兽头贴边
    return { camZ: 0.32, fov: 2, eyeY: 0.06, lookY: 0.02 };
  }
  if (width < 1024) {
    return { camZ: 0.22, fov: 1, eyeY: 0.08, lookY: 0.04 };
  }
  return { camZ: 0, fov: 0, eyeY: 0.05, lookY: 0.02 };
}

/**
 * 容器宽高比 → 相机拉远系数。
 * 画布被裁到右侧后容器可能变窄，垂直 FOV 固定会让兽头横向溢出；
 * 窄容器按比例拉远相机，保证任何窗口尺寸下模型都完整可见（contain）。
 */
function fitFactor(width: number, height: number) {
  const aspect = width / Math.max(1, height);
  return Math.max(1, 1.02 / Math.max(0.42, aspect));
}

/* ---------------- 兽头本体 ---------------- */
function KemonoHead() {
  const { scene } = useGLTF(MODEL_URL, DRACO_DECODER_PATH);
  const root = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const { size } = useThree();

  /** 石膏材质：略带回弹的哑光，靠三点光造型（不用后处理） */
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f4f1ea',
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0.12,
      }),
    [],
  );

  const { model, scale, centerY } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.material = material;
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const s = new THREE.Vector3();
    box.getSize(s);
    const center = box.getCenter(new THREE.Vector3());
    const k = TARGET_H / Math.max(s.y, 0.001);
    return { model: cloned, scale: k, centerY: -center.y * k };
  }, [scene, material]);

  useFrame((state, delta) => {
    const s = sampleHead(scrub.progress);
    const t = state.clock.elapsedTime;

    const g = root.current;
    if (g) {
      // 阻尼跟随：拖动快时也不会瞬移，保持「镜头在跟」的物理感
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, BASE_YAW + s.yaw, 6, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, s.pitch, 6, delta);
      g.position.x = THREE.MathUtils.damp(g.position.x, s.x * 0.8, 6, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, s.y + 0.02, 6, delta);
    }
    const b = bob.current;
    if (b) {
      // 待机呼吸：双谐波正弦，慢波为主 + 极轻的次级波，避免机械感
      // 纯数学驱动，不依赖任何 DOM 属性，跑在 requestAnimationFrame 内
      const breath = Math.sin(t * 0.9) * 0.018 + Math.sin(t * 1.7 + 1.2) * 0.004;
      b.position.y = breath;
      b.rotation.z = Math.sin(t * 0.55) * 0.008;
      // 轻微的呼吸缩放，让「活着」但不抢视线
      const swell = 1 + Math.sin(t * 0.9 + 0.6) * 0.0035;
      b.scale.setScalar(swell);
    }
  });

  return (
    <group ref={root} rotation={[0, BASE_YAW, 0]}>
      <group ref={bob}>
        <group scale={scale} position={[0, centerY, 0]}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}

/* ---------------- 相机：推拉 / FOV 由时间轴驱动 ---------------- */
function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  useFrame((_, delta) => {
    const s = sampleHead(scrub.progress);
    const prof = stageProfile(size.width);
    // 容器越窄，相机越远 —— 防止兽头在窄窗口里被横向裁掉、进而压住文字
    const wantZ = (s.camZ + prof.camZ) * fitFactor(size.width, size.height);
    const wantFov = s.fov + prof.fov;

    camera.position.z = THREE.MathUtils.damp(camera.position.z, wantZ, 4.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, prof.eyeY, 4, delta);
    camera.lookAt(0, prof.lookY, 0);

    const nextFov = THREE.MathUtils.damp(camera.fov, wantFov, 4.2, delta);
    if (Math.abs(nextFov - camera.fov) > 0.01) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/* ---------------- 灯光：主光 + 暖环境 + 活力橙轮廓（石膏白靠明暗塑形） ---------------- */
function ThreePointLights() {
  const rim = useRef<THREE.PointLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);

  useFrame((_, delta) => {
    const s = sampleHead(scrub.progress);
    if (rim.current) {
      rim.current.intensity = THREE.MathUtils.damp(rim.current.intensity, s.rim * 3.6, 5, delta);
    }
    if (key.current) {
      key.current.intensity = THREE.MathUtils.damp(key.current.intensity, 1.45 * s.key, 5, delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#f6efe2" />
      <directionalLight ref={key} position={[3.2, 3.0, 3.6]} color="#fff8ee" intensity={1.9} />
      <directionalLight position={[-3.6, 0.6, 2.2]} color="#e3e7ee" intensity={0.32} />
      <pointLight ref={rim} position={[-0.6, 1.5, -2.4]} color="#f35a17" intensity={2.2} distance={9} decay={2} />
    </>
  );
}

/* ---------------- 渲染节拍器：交互提速、静置降频、后台停摆 ---------------- */
function RenderPump() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let lastTouch = performance.now();
    const off = subscribeFrame(() => {
      lastTouch = performance.now();
      invalidate();
    });

    const loop = (t: number) => {
      // 标签页不可见时彻底停摆，不白烧 GPU
      if (document.hidden) {
        raf = window.requestAnimationFrame(loop);
        return;
      }
      const idle = t - lastTouch;
      // 交互中 30fps，缓动尾巴 15fps，静置呼吸 6fps
      const fps = idle < 500 ? 30 : idle < 4000 ? 15 : 6;
      if (t - last >= 1000 / fps) {
        last = t;
        invalidate();
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    // 回到前台立刻补一帧，避免画布停在旧姿态
    const onVisible = () => {
      if (!document.hidden) {
        lastTouch = performance.now();
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
      off();
    };
  }, [invalidate]);

  return null;
}

export default function KemonoHeadCanvas() {
  return (
    <div className="op-canvas" aria-hidden>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        shadows={false}
        onCreated={(state) => {
          // ACES 会压灰近白材质，抬高曝光还原石膏白
          state.gl.toneMappingExposure = 1.16;
        }}
        gl={{
          alpha: true,
          antialias: true,
          premultipliedAlpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0.05, 3.4], fov: 38, near: 0.5, far: 30 }}
        style={{ background: 'transparent' }}
      >
        <CameraRig />
        <ThreePointLights />
        <RenderPump />
        <KemonoHead />
      </Canvas>
    </div>
  );
}
