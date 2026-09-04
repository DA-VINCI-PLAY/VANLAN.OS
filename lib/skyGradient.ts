import * as THREE from 'three';
import type { Mode } from './store';
import { ALBUMS } from '@/content/albums';

/**
 * 窗外天空渐变纹理 —— 用于玻璃后方的天空平面 (BasicMaterial + toneMapped:false)
 *
 * 设计目标：让玻璃后面真的有彩色空间（按 mode 染色）。
 *   - R21：HOME 改为无色（白 → 浅灰渐变），配合窗外黑色 ember 粒子；首屏不再"电蓝"
 *   - R21：ABOUT 由电绿改为深酒红 → 淡玫瑰（红色调，统一 VANLAN 红谱）
 *   - ALBUM 模式：顶部 = 当前专辑 accent 微提亮版（高饱和）；中段 = accent 与白混 0.3；底段 = accent 与白混 0.62
 *   - GALLERY / CONTACT：保留 R20 高饱和电紫 / 暖橙
 *   - 顶部纯色延伸至 ~46% 高度（addColorStop 0 + 0.46 同色），中段才掺白渐变到底
 *   - 纹理本身完全不透明（移除早期 alpha 渐变），由"天空 plane 透到玻璃背后"结构承担深度
 *   - 缓存按 mode + 专辑索引 + 三色，切换时复用
 */

const WHITE = new THREE.Color('#ffffff');

/* 每模式窗外的"色彩语义"
 * R21：HOME → 灰阶无色（white → light gray → gray）；ABOUT → 红色调（深酒红 → 玫瑰 → 雾粉）。
 * GALLERY / CONTACT 保留 R20 高饱和电紫 / 暖橙。
 */
const SKY_PALETTE: Record<Exclude<Mode, 'ALBUM'>, { top: string; mid: string; bot: string }> = {
  HOME:    { top: '#ffffff', mid: '#f3f3f3', bot: '#d6d6d6' }, // 无色 → 浅灰 → 灰（窗外无色）
  GALLERY: { top: '#7d4dff', mid: '#a98dff', bot: '#ede8ff' }, // 电紫 → 淡紫 → 薄雾
  CONTACT: { top: '#ff8a3d', mid: '#ffb37a', bot: '#fff0e0' }, // 暖橙 → 蜜桃 → 暖白
  ABOUT:   { top: '#9c1d2e', mid: '#c64555', bot: '#f2d7da' }, // 深酒红 → 玫瑰 → 雾粉（红色调）
};

const cache = new Map<string, THREE.CanvasTexture>();

const _tmpC = new THREE.Color();
function mixHex(a: string, b: string, t: number): string {
  _tmpC.set(a).lerp(new THREE.Color(b), t);
  return '#' + _tmpC.getHexString();
}

export function getSkyTexture(mode: Mode, albumIndex = 0): THREE.CanvasTexture {
  let top: string;
  let mid: string;
  let bot: string;
  if (mode === 'ALBUM') {
    const accent = ALBUMS[albumIndex]?.accentColor ?? '#7eb5ff';
    // R20：深色 accent（如酒红 #84343e）若直接当天空顶部会显得压抑，
    // 先 mix 白 0.12 提亮再喂进渐变，既保留高饱和又防过暗。
    top = mixHex(accent, '#ffffff', 0.12);
    mid = mixHex(accent, '#ffffff', 0.30);
    bot = mixHex(accent, '#ffffff', 0.62);
  } else {
    const p = SKY_PALETTE[mode];
    top = p.top;
    mid = p.mid;
    bot = p.bot;
  }

  const key = `${mode}-${albumIndex}-${top}-${mid}-${bot}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const w = 16;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  // R20：顶部纯色延伸至 46% 高度，再快速过渡到 mid → bot → 白。
  // 这样天空大面积保留高饱和色，不再被白色"过早"稀释。
  g.addColorStop(0, top);
  g.addColorStop(0.46, top);
  g.addColorStop(0.7, mid);
  g.addColorStop(0.88, bot);
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
