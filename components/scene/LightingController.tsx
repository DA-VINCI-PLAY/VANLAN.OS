'use client';

/**
 * Lighting Controller —— R11 第十一轮 稳定博物馆展厅灯光
 *
 * R11 关键改动（用户指令 §一）：
 *  - 彻底解决"画面时亮时暗 / 曝光跳变"—— 之前每帧 lerp 多个灯强度
 *    + 颜色 + haloColor，AdaptiveQuality 切换 quality 会让多个参数
 *    突变，产生亮度跳变；现在改为：常量强度（quality 一次性决定），
 *    仅在 mode 变化时一次性 gsap tween 颜色 / fog 强度（短 0.6s 线性）。
 *  - 博物馆灯光：左/右窗方向光 = 主光，副方向光 = 弱补光，天眼 spot =
 *    极弱轮廓光；地面角度 directional + ambient + hemi 维持稳定整体。
 *  - 移除所有逐帧 new 临时对象（之前 useFrame 复用 tmpDirColor 等）。
 *  - 阴影明显增加：桌面 HIGH/MEDIUM 双 directional 投阴影，LOW 全关；
 *    shadow map 1024（HIGH）/ 512（MED/移动），PCFSoft，bias 合理，
 *    阴影不黑硬但能读出墙/陈列台/兽头的真实空间层次。
 */

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { MODE_CONFIG } from '@/lib/modeConfig';
import { QUALITY_CFG } from '@/lib/perf';
import { useOS } from '@/lib/store';
import { ALBUMS } from '@/content/albums';

const WHITE = new THREE.Color('#ffffff');

export default function LightingController({
  isMobile,
}: {
  isMobile: boolean;
}) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const leftRef = useRef<THREE.DirectionalLight>(null);
  const rightRef = useRef<THREE.DirectionalLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const quality = useOS((s) => s.quality);
  const mode = useOS((s) => s.mode);
  const activeAlbum = useOS((s) => s.activeAlbum);

  const leftTarget = useMemo(() => new THREE.Object3D(), []);
  const rightTarget = useMemo(() => new THREE.Object3D(), []);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  const qc = QUALITY_CFG[quality];
  const shadowMap = isMobile ? Math.min(qc.shadowMapSize, 512) : qc.shadowMapSize;

  /* === scene.environment：程序化 PMREM（HIGH/MEDIUM）===
   * 强度温和：让标准材质获得柔光环境反射，但不把场景染过白 */
  useEffect(() => {
    if (quality === 'low') {
      scene.environment = null;
      return;
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    if ('environmentIntensity' in scene) {
      (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.45;
    }
    return () => {
      scene.environment = null;
      env.texture.dispose();
      pmrem.dispose();
    };
  }, [quality, scene, gl]);

  /* === 阴影参数：quality 变化时调整 castShadow + mapSize ===
   * 这里没有修改 intensity——intensity 在 R11 改为按 quality 常量。 */
  useEffect(() => {
    const lights = [leftRef.current, rightRef.current].filter(Boolean) as THREE.DirectionalLight[];
    lights.forEach((l, i) => {
      l.castShadow = i === 0 ? qc.castShadowLights >= 1 : qc.castShadowLights >= 2;
      const s = isMobile ? Math.min(qc.shadowMapSize, 512) : qc.shadowMapSize;
      l.shadow.mapSize.set(s, s);
      l.shadow.map?.dispose();
      l.shadow.map = null;
    });
  }, [quality, isMobile, qc]);

  /* === mode 切换：短促 0.6s 线性 tween 颜色 / fog 密度（仅这些）===
   * 强度 (intensity) 不参与 tween——保持常量稳定（用户指令 §一）。
   * ALBUM 模式注入 0.18 专辑 accent → 石膏 / 玻璃的微妙色偏，不让
   * 整厅变彩色。 */
  useEffect(() => {
    const tweens: gsap.core.Tween[] = [];
    const cfg = MODE_CONFIG[mode];
    const album = ALBUMS[activeAlbum];
    const dirColor = WHITE.clone();
    if (mode === 'ALBUM') dirColor.lerp(new THREE.Color(album.accentColor), 0.18);
    if (leftRef.current) {
      tweens.push(
        gsap.to(leftRef.current.color, {
          r: dirColor.r,
          g: dirColor.g,
          b: dirColor.b,
          duration: 0.6,
          ease: 'none',
        }),
      );
    }
    if (rightRef.current) {
      tweens.push(
        gsap.to(rightRef.current.color, {
          r: dirColor.r,
          g: dirColor.g,
          b: dirColor.b,
          duration: 0.6,
          ease: 'none',
        }),
      );
    }
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog && 'density' in fog) {
      tweens.push(
        gsap.to(fog, { density: cfg.fogDensity, duration: 0.6, ease: 'none' }),
      );
    }
    return () => {
      tweens.forEach((t) => t.kill());
    };
    // 依赖 mode / activeAlbum：每次切换模式都重新做一次短促线性 tween，
    // 与函数顶部注释（"mode 切换时 tween"）一致，而非只在挂载时执行一次。
  }, [scene, mode, activeAlbum]);

  const leftCast = qc.castShadowLights >= 1;
  const rightCast = qc.castShadowLights >= 2;

  /* === 常量强度：quality 决定数值（运行期不 lerp，避免 AdaptiveQuality 跳变）=== */
  const ambientI = quality === 'low' ? 0.42 : 0.36;
  const hemiI = quality === 'low' ? 0.3 : 0.32;
  const leftI = quality === 'low' ? 0.95 : 1.2;
  const rightI = quality === 'low' ? 0.85 : 1.05;
  const spotI = quality === 'low' ? 0.55 : 0.6;

  const shadowProps = {
    'shadow-mapSize-width': shadowMap,
    'shadow-mapSize-height': shadowMap,
    'shadow-camera-left': -9.5,
    'shadow-camera-right': 9.5,
    'shadow-camera-top': 9.5,
    'shadow-camera-bottom': -9.5,
    'shadow-camera-near': 1,
    'shadow-camera-far': 45,
    'shadow-bias': -0.0004,
    'shadow-normalBias': 0.03,
  } as const;

  return (
    <>
      <primitive object={leftTarget} position={[0.6, 1.4, 0]} />
      <primitive object={rightTarget} position={[-0.6, 1.4, 0]} />
      <primitive object={spotTarget} position={[0, 2.0, 0]} />

      <ambientLight ref={ambientRef} intensity={ambientI} color="#ffffff" />
      <hemisphereLight
        ref={hemiRef}
        intensity={hemiI}
        color="#ffffff"
        groundColor="#e8e5dc"
      />

      {/* 左后大窗主光 */}
      <directionalLight
        ref={leftRef}
        position={[-12.6, 6.0, -11.4]}
        intensity={leftI}
        color="#ffffff"
        castShadow={leftCast}
        target={leftTarget}
        {...shadowProps}
      />

      {/* 右后大窗副光（弱补光） */}
      <directionalLight
        ref={rightRef}
        position={[12.6, 6.0, -11.4]}
        intensity={rightI}
        color="#ffffff"
        castShadow={rightCast && !isMobile}
        target={rightTarget}
        {...shadowProps}
      />

      {/* 天眼 SpotLight（极弱轮廓光） */}
      <spotLight
        ref={spotRef}
        position={[0, 11.5, 0.4]}
        angle={0.5}
        penumbra={1}
        intensity={spotI}
        color="#fff6ea"
        decay={0}
        target={spotTarget}
      />
    </>
  );
}

