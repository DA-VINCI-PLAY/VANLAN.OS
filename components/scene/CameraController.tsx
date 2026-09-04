'use client';

/**
 * Camera Controller —— R12 静止优先 + R29 移动端独立构图 / 机械臂运镜
 *
 * 用户反馈（R12）：静止时保持不动、切换模式时快速运镜、初挂载直接 set、
 * prefers-reduced-motion 永远直接 set。
 *
 * R29（移动端重设计 §9）：
 *  - 单个 CameraController 是相机唯一权威（禁止其他组件抢相机）；
 *  - 移动端机位完全独立：竖屏走 MODE_CONFIG[mode].cameraMobilePortrait
 *    （FOV 55°），横屏走 cameraMobileLandscape（FOV 62°）；桌面端仍走
 *    viewportCam.resolveDesk / resolveHomeDesk（FOV 42°）——桌面行为零回归。
 *  - 「机械臂」：模式切换不是一根直线斜插，而是把 position / look 的
 *    各轴向错开 0.1~0.2s 依次到位（x → y → z），形成「机械臂分节摆动
 *    后稳定」的克制手感；每段 ease:'none'（linear）。移动端略明显
 *    （总时长 ~1.15s）、桌面保持快（~0.95s），绝无 overshoot。
 *  - 转屏（竖屏 ↔ 横屏）时 FOV 与机位一起收敛：FOV 立即 updateProjectionMatrix
 *    （Canvas 构造参数不可运行期改，只能手动更新），位置/视线走同一条
 *    linear tween。
 *
 * 约束（继承 R11/R12）：position 与 look 全程持续 lerp、绝无瞬间 set
 * （reduced-motion / 首帧除外）；useFrame 每帧 camera.lookAt(lookTarget)，
 * 复用同一 Vector3 不逐帧分配。
 */

import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MODE_CONFIG } from '@/lib/modeConfig';
import { useOS } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { resolveDesk, resolveHomeDesk } from '@/lib/viewportCam';

/** 模式切换运镜总时长（秒）—— 全 linear；R29 移动端分节略长以显「机械臂」 */
const MOVE_DUR_DESK = 0.95;
const MOVE_DUR_MOBILE = 1.15;

/** R31 HOME 轨道环绕角速度（rad/s）：桌面 60s/圈 ≈ 0.105，移动 90s/圈 ≈ 0.07 */
const ORBIT_SPEED_DESK = (Math.PI * 2) / 60;
const ORBIT_SPEED_MOBILE = (Math.PI * 2) / 90;

/* ---------- R38 HOME focus 凑近位 ---------- */
/** HOME focus 凑近机位：相机 dolly in 到 z≈2.6、视线下降到 plinth 区
 *  (y≈0.4)，FOV 收紧 ~10° 让 plinth 上 slab 卡片占据画面主体。 */
const FOCUS_POSE_DESK = { pos: [0, 0.85, 2.7] as [number, number, number], look: [0, 0.45, 0] as [number, number, number] };
const FOCUS_POSE_MOBILE_PORTRAIT = { pos: [0, 0.65, 4.4] as [number, number, number], look: [0, 0.3, -0.35] as [number, number, number] };
const FOCUS_POSE_MOBILE_LANDSCAPE = { pos: [0, 0.85, 2.7] as [number, number, number], look: [0, 0.45, 0.05] as [number, number, number] };
const FOCUS_FOV_DESK = 32;
const FOCUS_FOV_MOBILE_PORTRAIT = 46;
const FOCUS_FOV_MOBILE_LANDSCAPE = 52;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default function CameraController() {
  const camera = useThree(
    (s) => s.camera as THREE.PerspectiveCamera,
  );
  const mode = useOS((s) => s.mode);
  const reducedMotion = useOS((s) => s.reducedMotion);
  const homeFocus = useOS((s) => s.homeFocus);
  const setHomeFocus = useOS((s) => s.setHomeFocus);
  const vp = useViewport();
  const mobile = vp.isMobile;
  const portrait = vp.isPortrait;

  // 复用 vec3，每帧 lookAt 用同一对象
  const lookTarget = useRef(new THREE.Vector3(0, 1.72, 0));
  const tween = useRef<gsap.core.Timeline | null>(null);
  const firstRun = useRef(true);
  const lastFov = useRef<number | null>(null);

  // R31 HOME 轨道环绕状态（复用向量，零每帧分配）
  const orbitAngle = useRef(0);
  const orbitActive = useRef(false);
  const orbitBasePos = useRef(new THREE.Vector3());
  const orbitTmp = useRef(new THREE.Vector3());

  // R38：离开 HOME 自动复位 focus（防止切回 HOME 时还停在凑近位）
  useEffect(() => {
    if (mode !== 'HOME' && homeFocus) setHomeFocus(false);
  }, [mode, homeFocus, setHomeFocus]);

  // 目标解析键：桌面随窗口 px 变化；移动端只随「竖屏 / 横屏」变化。
  const resolveKey = mobile
    ? portrait
      ? 'mobile-portrait'
      : 'mobile-landscape'
    : `desk-${vp.width}x${vp.height}`;

  useEffect(() => {
    const cfg = MODE_CONFIG[mode];

    // R38：HOME + focus=true → 走凑近位（相机 dolly in + 视线下移到 plinth 区）
    const isHomeFocus = mode === 'HOME' && homeFocus;
    // 目标机位与 FOV（R29：mobile 走独立 portrait/landscape 档案）
    const camPose = isHomeFocus
      ? !mobile
        ? FOCUS_POSE_DESK
        : portrait
          ? FOCUS_POSE_MOBILE_PORTRAIT
          : FOCUS_POSE_MOBILE_LANDSCAPE
      : !mobile
        ? mode === 'HOME'
          ? resolveHomeDesk()
          : resolveDesk(mode)
        : portrait
          ? cfg.cameraMobilePortrait
          : cfg.cameraMobileLandscape;
    const fovTarget = isHomeFocus
      ? !mobile
        ? FOCUS_FOV_DESK
        : portrait
          ? FOCUS_FOV_MOBILE_PORTRAIT
          : FOCUS_FOV_MOBILE_LANDSCAPE
      : !mobile
        ? cfg.fovDesktop
        : portrait
          ? cfg.fovMobilePortrait
          : cfg.fovMobileLandscape;

    const dstPos = new THREE.Vector3(camPose.pos[0], camPose.pos[1], camPose.pos[2]);
    const dstLook = new THREE.Vector3(
      camPose.look[0],
      camPose.look[1],
      camPose.look[2],
    );

    // 清理旧 tween
    if (tween.current) {
      tween.current.kill();
      tween.current = null;
    }

    // FOV 立即应用（转屏才会变；Canvas 初始 fov 只可手动更新）
    if (lastFov.current !== fovTarget) {
      lastFov.current = fovTarget;
      camera.fov = fovTarget;
      camera.updateProjectionMatrix();
    }

    // 初次挂载 / reduced-motion → 直接 set，无运镜
    if (firstRun.current || reducedMotion) {
      firstRun.current = false;
      camera.position.copy(dstPos);
      lookTarget.current.copy(dstLook);
      camera.lookAt(lookTarget.current);
      // R31：HOME 首帧即开始轨道环绕（reduced-motion 永不环绕）
      // R38：HOME focus 模式停 orbit（凑近时不转）
      if (mode === 'HOME' && !reducedMotion && !isHomeFocus) {
        orbitBasePos.current.copy(dstPos);
        orbitAngle.current = 0;
        orbitActive.current = true;
      } else {
        orbitActive.current = false;
      }
      return;
    }

    // R29 机械臂分节：pos.x/y/z 与 look.x/y/z 依次错开 0.1~0.22s 起步，
    // 各段终点对齐（每段时长 = 总时长 - 起步偏移），整条 linear。
    const dur = mobile ? MOVE_DUR_MOBILE : MOVE_DUR_DESK;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => {
        camera.lookAt(lookTarget.current);
      },
    });

    const seg: Array<[THREE.Vector3, 'x' | 'y' | 'z', number, number]> = [
      // [target, prop, delay, to]
      [camera.position, 'x', 0.0, dstPos.x],
      [camera.position, 'y', 0.12, dstPos.y],
      [camera.position, 'z', 0.22, dstPos.z],
      [lookTarget.current, 'x', 0.1, dstLook.x],
      [lookTarget.current, 'y', 0.2, dstLook.y],
      [lookTarget.current, 'z', 0.3, dstLook.z],
    ];

    // R31：非 HOME 一律停环；HOME 运镜结束后从目标机位开始环绕
    if (mode !== 'HOME') {
      orbitActive.current = false;
    }

    for (const [obj, prop, delay, to] of seg) {
      if (Math.abs(obj[prop] - to) < 0.0001) continue;
      const vars = { [prop]: to, duration: Math.max(dur - delay, 0.4) } as gsap.TweenVars;
      tl.to(obj, vars, delay);
    }

    if (mode === 'HOME' && !isHomeFocus) {
      tl.eventCallback('onComplete', () => {
        orbitBasePos.current.copy(dstPos);
        orbitAngle.current = 0;
        orbitActive.current = true;
      });
    } else {
      // R38：focus 模式 / 非 HOME → 停 orbit（避免凑近时相机还在围绕原点转）
      orbitActive.current = false;
    }

    tween.current = tl;

    return () => {
      if (tween.current) {
        tween.current.kill();
        tween.current = null;
      }
    };
    // 依赖：桌面 resize / 移动端转屏时按最新视口重新收敛机位（R38: homeFocus
    // 切换也触发相机 dolly，故加入依赖数组）
  }, [mode, camera, mobile, portrait, reducedMotion, resolveKey, homeFocus]);

  // 每帧 lookAt 兜底：tween 结束后相机 position 静止，视线持续锚定目标。
  // R31：HOME 且运镜结束 → 围绕 lookTarget 慢速轨道环绕（复用向量，零分配）
  // R38：focus 模式时停 orbit（避免凑近看展台时相机围绕原点转）
  useFrame((_, delta) => {
    if (orbitActive.current && mode === 'HOME' && !homeFocus) {
      const dTheta = delta * (mobile ? ORBIT_SPEED_MOBILE : ORBIT_SPEED_DESK);
      orbitAngle.current += dTheta;
      orbitTmp.current
        .copy(orbitBasePos.current)
        .sub(lookTarget.current)
        .applyAxisAngle(Y_AXIS, dTheta);
      camera.position.copy(lookTarget.current).add(orbitTmp.current);
    }
    camera.lookAt(lookTarget.current);
  });

  return null;
}
