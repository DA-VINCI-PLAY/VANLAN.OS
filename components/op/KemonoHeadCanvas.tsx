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
const TARGET_H = 1.9;

useGLTF.preload(MODEL_URL, DRACO_DECODER_PATH);

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
    const aspect = size.width / Math.max(size.height, 1);
    /** 竖屏：把兽头收窄偏移并抬高，给底部面板腾位置 */
    const narrow = aspect < 0.92;
    const k = narrow ? 0.4 : 1;

    const g = root.current;
    if (g) {
      // 阻尼跟随：拖动快时也不会瞬移，保持「镜头在跟」的物理感
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, BASE_YAW + s.yaw, 6, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, s.pitch, 6, delta);
      g.position.x = THREE.MathUtils.damp(g.position.x, s.x * k, 6, delta);
      g.position.y = THREE.MathUtils.damp(
        g.position.y,
        s.y + (narrow ? 0.34 : 0),
        6,
        delta,
      );
    }
    const b = bob.current;
    if (b) {
      // 待机呼吸（幅度极小，静置时才明显）
      b.position.y = Math.sin(t * 0.9) * 0.018;
      b.rotation.z = Math.sin(t * 0.55) * 0.008;
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
    const aspect = size.width / Math.max(size.height, 1);
    const narrow = aspect < 0.92;
    const wantZ = s.camZ + (narrow ? 1.15 : 0);
    const wantFov = s.fov + (narrow ? 8 : 0);

    camera.position.z = THREE.MathUtils.damp(camera.position.z, wantZ, 4.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, narrow ? 0.16 : 0.05, 4, delta);
    camera.lookAt(0, narrow ? 0.12 : 0.02, 0);

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

/* ---------------- 渲染节拍器：交互提速、静置降频 ---------------- */
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
    return () => {
      window.cancelAnimationFrame(raf);
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
