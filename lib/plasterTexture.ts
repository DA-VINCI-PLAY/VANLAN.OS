import * as THREE from 'three';

/**
 * 石膏微表面纹理 —— Phase 01 Visual Polish（§四~§五、§八）
 *
 * 原则：不叠到 BaseColor / 不用木纹、大理石、裂纹贴图。
 * 这里用程序化 Value Noise（CanvasTexture）生成两类"极微弱"表面信息：
 *   1. roughnessMap：灰度噪声落在 0.82 ~ 0.94（石膏不是镜面，也不该是统一哑光）
 *   2. normalMap    ：与 roughness 同源的极轻高低起伏 → 柔和漫反射变化
 * 与 skyGradient / halo 同一管线：模块级缓存单例、零网络下载、可被 LOW 档整体关闭。
 *
 * 数值设计：
 *   - roughness = 0.88 + (h-0.5)*0.12 → [0.82, 0.94]
 *   - normal 幅值很小（r/g 偏移 ≈ ±8~12/255），normalScale 再压 0.55 → "远看几乎无"
 *   - 两个频段叠加：cell 24 的宏观起伏 + cell 6 的微观颗粒
 *   - 噪声按晶格取模 → 纹理四边无缝（可安全 Repeat 而看不到接缝）
 *
 * LOW 档：直接不挂 map（纯色石膏），见 Character.applyPlasterQuality。
 */

/* ---------------- 程序化无缝 Value Noise ---------------- */

/** 周期性 value noise：以 cell 为晶格、整幅 (size,size) 为周期，值域 [0,1] */
function noiseField(size: number, cell: number): Float32Array {
  const cols = Math.ceil(size / cell);
  const g = new Float32Array(cols * cols);
  for (let i = 0; i < g.length; i++) g[i] = Math.random();

  const out = new Float32Array(size * size);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / cell);
    const fy = smooth((y - gy * cell) / cell);
    const y0 = ((gy % cols) + cols) % cols;
    const y1 = (y0 + 1) % cols;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cell);
      const fx = smooth((x - gx * cell) / cell);
      const x0 = ((gx % cols) + cols) % cols;
      const x1 = (x0 + 1) % cols;
      const a = g[y0 * cols + x0];
      const b = g[y0 * cols + x1];
      const c = g[y1 * cols + x0];
      const d = g[y1 * cols + x1];
      const top = a + (b - a) * fx;
      const bot = c + (d - c) * fx;
      out[y * size + x] = top + (bot - top) * fy;
    }
  }
  return out;
}

/** 两频段叠加的高度场 [0,1] */
function makeHeight(size: number): Float32Array {
  const macro = noiseField(size, 24);
  const micro = noiseField(size, 6);
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) {
    const h = 0.55 + (macro[i] - 0.5) * 0.62 + (micro[i] - 0.5) * 0.38;
    out[i] = h < 0 ? 0 : h > 1 ? 1 : h;
  }
  return out;
}

/* ---------------- 纹理构建（缓存单例） ---------------- */

const SIZE = 256;

let _roughness: THREE.CanvasTexture | null = null;
let _normal: THREE.CanvasTexture | null = null;
let _contact: THREE.CanvasTexture | null = null;

function initCanvas() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

/** 石膏 roughnessMap：灰度 0.82~0.94 */
export function getPlasterRoughnessMap(): THREE.CanvasTexture | null {
  if (_roughness) return _roughness;
  if (typeof document === 'undefined') return null;
  const h = makeHeight(SIZE);
  const c = initCanvas();
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const rough = Math.round((0.88 + (h[i] - 0.5) * 0.12) * 255);
    const v = Math.min(255, Math.max(0, rough));
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  _roughness = tex;
  return tex;
}

/** 石膏 normalMap：同源高度场 → 切空间法线，幅值极小 */
export function getPlasterNormalMap(): THREE.CanvasTexture | null {
  if (_normal) return _normal;
  if (typeof document === 'undefined') return null;
  const h = makeHeight(SIZE);
  const c = initCanvas();
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  // 法线强度：宏观起伏主导，微观只负责打破平整感
  const STRENGTH = 0.16;
  for (let y = 0; y < SIZE; y++) {
    const y0 = (y - 1 + SIZE) % SIZE;
    const y1 = (y + 1) % SIZE;
    for (let x = 0; x < SIZE; x++) {
      const x0 = (x - 1 + SIZE) % SIZE;
      const x1 = (x + 1) % SIZE;
      const dhx = h[y * SIZE + x1] - h[y * SIZE + x0];
      const dhy = h[y1 * SIZE + x] - h[y0 * SIZE + x];
      let nx = -dhx * STRENGTH;
      let ny = -dhy * STRENGTH;
      // 夹紧，避免高光撕裂
      nx = nx > 0.3 ? 0.3 : nx < -0.3 ? -0.3 : nx;
      ny = ny > 0.3 ? 0.3 : ny < -0.3 ? -0.3 : ny;
      const o = (y * SIZE + x) * 4;
      img.data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      img.data[o + 2] = 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  _normal = tex;
  return tex;
}

/** 接触阴影柔影盘（黑色径向渐变，随 quality 控 opacity） */
export function getContactShadowTexture(): THREE.CanvasTexture | null {
  if (_contact) return _contact;
  if (typeof document === 'undefined') return null;
  const c = initCanvas();
  const ctx = c.getContext('2d')!;
  const cx = SIZE / 2;
  const g = ctx.createRadialGradient(cx, cx, 2, cx, cx, cx - 2);
  g.addColorStop(0, 'rgba(0,0,0,0.62)');
  g.addColorStop(0.32, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.2)');
  g.addColorStop(0.82, 'rgba(0,0,0,0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  _contact = tex;
  return tex;
}
