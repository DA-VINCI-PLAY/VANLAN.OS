'use client';

/**
 * HandwrittenSign —— HOME 兽头背后的粗糙手写 VANLAN（R32 起；R35 拆段；R36 重排）
 *
 * 用户指令：「首页可以在兽头背后加上粗糙的手写字 VANLAN」+「记得要适配窗口」
 *                +「VAN-LAN 中间要隔开不然看不见」（R36 修复）。
 *
 * 实现：
 *  - 纹理：自托管手写字体（public/fonts/vanlan-hand.woff2，Caveat 700 latin，
 *    51KB，FontFace API 加载后 Canvas 绘制）—— 多 pass 抖动重描 +
 *    destination-out 颗粒腐蚀 → 粗糙手写/石墨铭文质感（非印刷体）。
 *  - 位置：始终位于兽头「正后方」——按相机相对头心的方位角 az，
 *    招牌放在 az + 180° 方向、半径 3.2m 处。HOME 轨道环绕时招牌随相机
 *    一起绕到头后 → 构图恒定（招牌永远不会跑到相机与兽头之间）。
 *  - 朝向：每帧 billboard（quaternion 复制相机）→ 任意视角正对可读。
 *  - 适配窗口：每帧按「招牌距离处相机可见宽度」缩放
 *    （visW = 2·dist·tan(fov/2)·aspect），招牌宽 = 82% 可见宽，钳制
 *    [0.42, 1.3] → 桌面 / 手机竖屏 / 矮横屏均不超屏（零每帧分配）。
 *  - reduced-motion：纹理/位置照常（billboard 是视角跟随，非自主运动）。
 *  - **R36 中央破折号**：画三道错位横线（主 320px / 副上线 240px / 副下线 240px），
 *    组成 "VA ══ LAN" 中段。即使字符字身被兽头轮廓部分遮挡，三道线即使只剩
 *    端头露在兽头边缘外，眼睛也能视觉补全出"中间隔开"的结构。
 *  - **R36 字身退到 14%/86%**：之前 20%/80% 时 VA 的 N、LAN 的 L 紧贴字符边缘
 *    （兽头在屏幕中心覆盖 ~30% 视宽）→ 中心字母被吃。现在 14%/86% 每个字母盒
 *    宽 0.28 → 字组边界 14+14=28% 左侧、86-14=72% 右侧，正好穿过兽头两侧。
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const TEXT = 'VAN';        // 左半
const TEXT_R = 'LAN';      // 右半
const BASE_W = 6.4;        // 纹理平面基准世界宽度（米）
const RADIUS = 3.2;        // 招牌到头心的水平半径
const Y = 2.1;             // 招牌中心高度
const INK = '#2c2b26';     // 石墨色

// R36：VA / LAN 在纹理 X 方向的位置（44% 间距，符合"中间要隔开"）。
//   之前 0.20/0.80 时字组边界 36%/64% 紧贴兽头两侧 → N、L 被吃掉一半。
//   现在 0.14/0.86 字盒宽 0.28 → 字组边界 28%/72%，与兽头屏幕覆盖区
//   （约 32–68%）有 4% 安全距，三字母清晰可读。
const CX_LEFT  = 0.14;
const CX_RIGHT = 0.86;

/* ---------- 粗糙手写纹理（Canvas） ---------- */
function drawSignCanvas(): HTMLCanvasElement {
  const W = 1600;
  const H = 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const fam = `'VANLAN Hand', 'Segoe Script', 'Bradley Hand', cursive`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fitFontSize = (s: string, maxWidth: number) => {
    let size = 360;
    ctx.font = `700 ${size}px ${fam}`;
    const w = ctx.measureText(s).width;
    if (w <= maxWidth) return size;
    return Math.floor((size * maxWidth) / w);
  };

  const drawAt = (
    text: string,
    cx: number,
    cy: number,
    alphaMain: number,
  ) => {
    // R36：从 W*0.32 收紧到 W*0.28，字组右/左边沿不再紧贴兽头边缘
    const size = fitFontSize(text, W * 0.28);
    ctx.font = `700 ${size}px ${fam}`;
    ctx.fillStyle = INK;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    // 多 pass：1 主笔 + 2 淡错位副笔 → "VA ══ LAN" 粗糙手写
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(cx + rand(-5, 5), cy + rand(-6, 6));
      ctx.rotate(rand(-0.02, 0.02));
      ctx.globalAlpha = i === 0 ? alphaMain : 0.28;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  // 拆成两段绘制：左「VA」14% / 右「LAN」86%，中缝占 72% 宽（=440px），
  //   字符在屏幕中心 ~30% 视宽的兽头两侧各留 ~7% 安全距。R36 中线补强。
  drawAt(TEXT, W * CX_LEFT, H / 2, 0.78);
  drawAt(TEXT_R, W * CX_RIGHT, H / 2, 0.78);

  // 中央"破折号三件套" —— 主横线 320px 宽 + 上下两条副线 240px，
  //   组成 "═" 长破折号。即便中间被兽头遮住，端头探出兽头轮廓外，
  //   视线仍能从中线两端的墨痕补全出"中段被隔开"的结构。
  //   之前版本中央只有 116px 单线（被吃干净）。
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  // 主横线（最长 320px）
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = i === 0 ? 0.85 : 0.32;
    ctx.beginPath();
    ctx.moveTo(-160 + i * 6, -3 + i * 4);
    ctx.lineTo(160 - i * 6, 6 - i * 3);
    ctx.stroke();
  }
  // 副上线（240px，Y 偏 -56）—— 错位营造手写"非印刷"感
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-120, -56);
  ctx.lineTo(120, -52);
  ctx.stroke();
  // 副下线（240px，Y 偏 +56）
  ctx.beginPath();
  ctx.moveTo(-120, 60);
  ctx.lineTo(120, 56);
  ctx.stroke();
  // 中央一个小手写点（点墨，未写完字的感觉）
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // 颗粒腐蚀
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const s = Math.random() < 0.85 ? 1 + Math.random() * 2 : 2 + Math.random() * 3.5;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  return c;
}

export default function HandwrittenSign() {
  const group = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  // FontFace 加载完成后再绘制纹理（失败降级系统 cursive，也能看）
  useEffect(() => {
    let alive = true;
    const build = () => {
      if (!alive) return;
      const c = drawSignCanvas();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      setTexture(tex);
    };
    const ff = new FontFace(
      'VANLAN Hand',
      "url('/fonts/vanlan-hand.woff2')",
      { weight: '700', style: 'normal' },
    );
    ff.load()
      .then((f) => {
        document.fonts.add(f);
        build();
      })
      .catch(build);
    return () => {
      alive = false;
    };
  }, []);

  // 复用向量，零每帧分配
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const headCenter = useMemo(() => new THREE.Vector3(0, 2.0, 0), []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const cam = state.camera as THREE.PerspectiveCamera;

    // 1) 招牌永远在兽头正后方（相机方位角 + 180°）
    tmp.copy(cam.position).sub(headCenter);
    const az = Math.atan2(tmp.x, tmp.z); // 0 = 相机在 +Z
    g.position.set(-Math.sin(az) * RADIUS, Y, -Math.cos(az) * RADIUS);

    // 2) billboard：正对相机
    g.quaternion.copy(cam.quaternion);

    // 3) 适配窗口：招牌宽 = 招牌距离处可见宽的 82%，钳制防过小/过大
    const dist = tmp.copy(g.position).sub(cam.position).length();
    const visW = 2 * dist * Math.tan(((cam.fov / 2) * Math.PI) / 180) * cam.aspect;
    if (visW > 0.01) {
      const s = THREE.MathUtils.clamp((0.82 * visW) / BASE_W, 0.42, 1.3);
      g.scale.setScalar(s);
    }
  });

  return (
    <group ref={group} position={[0, Y, -RADIUS]}>
      {texture && (
        <mesh>
          <planeGeometry args={[BASE_W, BASE_W * 0.4]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
