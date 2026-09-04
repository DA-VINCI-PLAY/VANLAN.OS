import type { CamPose } from './modeConfig';
import { MODE_CONFIG } from './modeConfig';

/**
 * 视口自适应相机解析（R10）+ R12 精简
 *
 * 职责单一：根据当前窗口尺寸解析各模式的「目标机位」CamPose，
 * 供 SceneCanvas（初始相机位）与 CameraController（模式切换运镜目标）
 * 消费。R12 起不再提供任何循环运镜序列 —— 相机静止是默认态，
 * 只在模式切换时由 CameraController 做一次快速 linear tween。
 *
 * 原则：不用 CSS 缩放、不用单一固定档案 —— 相机距离 / 高度 / look 由
 * viewport 实时解析：
 *  - HOME 是重点：按「兽头占屏高 ≈55-62%」的构图目标反推相机距离；
 *    小高度笔记本（1366×768 / 1280×800）额外推近 → 主体更大、顶部不空；
 *    大屏（1920×1080）微退 → 保留建筑语境。
 *  - 其余模式：在既有横向构图（侧向视角 + 面板留白）基础上整体推近，
 *    主体放大 ~1.8x，角度/朝向不变。
 *  - 16:9 / 16:10 / 窄屏由 aspect 校正：越宽越保持横向建筑语境，
 *    越窄越向前聚焦，避免「宽屏空、窄屏挤」。
 *  - mobile 不经过此函数（另有独立档案：MODE_CONFIG[mode].cameraMobilePortrait
 *    与 cameraMobileLandscape，R29 起由 CameraController 按竖/横屏选取）。
 */

/** 桌面解析的参考窗口（SSR 安全） */
export interface ViewportInfo {
  w: number;
  h: number;
  aspect: number;
}

export function viewport(): ViewportInfo {
  if (typeof window === 'undefined') return { w: 1440, h: 900, aspect: 1.6 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  return { w, h, aspect: w / h };
}

/** 高度分档系数：小高度屏幕推近保证主体尺寸，大屏微退保留空间 */
function heightZoom(h: number): number {
  if (h < 780) return 0.94; // 1366×768 / 1280×800 → 兽头最大
  if (h < 980) return 1.0; // 1440×900 / 1680×1050 → 参考构图
  return 1.04; // 1920×1080+ → 略退，建筑语境完整
}

/**
 * HOME 桌面相机：head 中心 [0,2,0]，look 略低于头心 → 兽头主体占屏高约
 * 55%（≈当前 2 倍面积），头顶留 ~22% 给穹顶结构，底部留 pedestal。
 * 相机略低于 look（-0.3m）→ 轻微仰视角，雕塑感更"陈列厅"。
 */
export function resolveHomeDesk(): CamPose {
  const { h } = viewport();
  const zoom = heightZoom(h);
  const d = 5.0 * zoom; // look 点到相机的距离
  const dy = 0.3; // 相机低于 look 的垂直差
  const dz = Math.sqrt(Math.max(d * d - dy * dy, 0.01));
  return { pos: [0, 1.72 - dy, dz], look: [0, 1.72, 0] };
}

/**
 * 非 HOME 模式桌面：以既有档案为「朝向种子」，把相机沿「相机→look」方向
 * 整体推近到 k 倍距离 —— 保留侧向构图 / 面板留白角度，只放大主体。
 * aspect 校正：越宽退得越少（保留建筑），越窄推得越多（聚焦主体）。
 */
export function resolveDesk(mode: keyof typeof MODE_CONFIG): CamPose {
  const { h, aspect } = viewport();
  const base = MODE_CONFIG[mode].camera;
  const l = base.look;
  const p = base.pos;

  let k = heightZoom(h);
  if (aspect > 1.72) k *= 1.02;
  else if (aspect < 1.5) k *= 0.97;

  return {
    pos: [
      l[0] + (p[0] - l[0]) * k,
      l[1] + (p[1] - l[1]) * k,
      l[2] + (p[2] - l[2]) * k,
    ],
    look: [...l],
  };
}
