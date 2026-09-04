import type { Mode } from './store';

export interface CamPose {
  pos: [number, number, number];
  look: [number, number, number];
}

export interface ModeConfig {
  /** 环境光强度 */
  ambientIntensity: number;
  /** 主方向光强度 */
  directionalIntensity: number;
  /** 主光颜色（保持接近白色，只做轻微色偏） */
  lightColor: string;
  /** 窗光强度（穿过大型落地玻璃的方向光） */
  windowLightIntensity: number;
  /** 阴影强度（shadow 材质透明度用不到时作为强度系数） */
  shadowStrength: number;
  /** 雾密度（FogExp2） */
  fogDensity: number;
  /** 漂浮头部后侧 Halo 色调（墙壁始终白色，只有 Halo / 头部点光轻微染色） */
  haloColor: string;
  /** 桌面端相机位（正面平视，构图 = 兽头中央 + 左右大窗完整） */
  camera: CamPose;
  /** 移动端竖屏相机位 —— R29：每 mode 独立构图（侧向/俯仰各异），
   *   让用户感受到「不同 mode 是不同视角」。窗户因房间几何约束完整在屏外，
   *   但 sky plane（窗外天空 plane 大小 1.95×玻璃）的边缘色能在画面两侧
   *   透出作为背景色彩，建筑墙体 + 陈列台 + 兽头为第一主体。 */
  cameraMobilePortrait: CamPose;
  /** 移动端横屏相机位 —— 横向宽，FOV 62° 让两扇大窗完整可见，
   *   横向建筑语境完整保留。 */
  cameraMobileLandscape: CamPose;
  /** 桌面 FOV（vFov） */
  fovDesktop: number;
  /** 移动端竖屏 FOV（vFov） */
  fovMobilePortrait: number;
  /** 移动端横屏 FOV（vFov） */
  fovMobileLandscape: number;
  /** HUD 节点代号 */
  node: string;
}

export const MODE_CONFIG: Record<Mode, ModeConfig> = {
  /* R10（第十轮）：桌面档案作为「朝向种子」，CameraController 桌面路径经
   * viewportCam.resolveDesk / resolveHomeDesk 按窗口实时推近/构图（兽头更大、
   * 顶部不空、16:9/16:10 自适应）。下方 camera 为 1440×900 参考值（兜底）。
   * 高度约束：圣堂墙内半径 7、相机 z 最远 6.45，保证永不穿墙。
   *
   * R29（移动端重设计）：移动端机位 = 独立画像，绝不继承桌面比例。
   *   portrait FOV 55 / landscape FOV 62（用户指定）；
   *   竖屏面向窗户方向：相机低于 look（轻微抬视），画面纵向层次 =
   *   顶部建筑线/穹顶/窗外天光 → 中部白色石膏兽头 → 底部陈列台/地面；
   *   侧向模式（GALLERY/CONTACT/ABOUT/ALBUM）加 yaw/侧移制造「每 mode
   *   不同机位」，让近侧大窗玻璃+天光的色带进画（竖屏 hFOV≈27°，窗户
   *   完整入画只出现在横屏/宽平板，竖屏以「色带层次」而非整窗入画）。
   *   横屏：两扇大窗 + 完整横向建筑语境，兽头居中有建筑留白。 */
  HOME: {
    ambientIntensity: 0.32,
    directionalIntensity: 1.25,
    lightColor: '#ffffff',
    windowLightIntensity: 1.0,
    shadowStrength: 1.0,
    fogDensity: 0.011,
    haloColor: '#fff6ea',
    camera: { pos: [0, 1.42, 4.99], look: [0, 1.72, 0] },
    /* R32 竖屏修正（用户反馈：兽头必须保持在画面中上部，顶部不许空）：
       原 R29「强抬视」机位把兽头压到画面 ~68% 处（下半被入口卡遮挡，
       顶部只剩空白穹顶）。改为微俯视（look 低于 pos）：兽头中心回到
       ~39% 高度（中上部），头顶 ~26% 恰在 nameplate 文字块下方，
       画面顶部 = nameplate + 兽头顶部，不再有大片空白。 */
    cameraMobilePortrait: { pos: [0, 1.42, 6.45], look: [0, 1.3, -0.35] },
    /* 横屏：两窗完整、兽头居中略靠下，建筑语境留白 */
    cameraMobileLandscape: { pos: [0, 1.85, 5.6], look: [0, 2.05, 0.05] },
    fovDesktop: 42,
    fovMobilePortrait: 55,
    fovMobileLandscape: 62,
    node: 'CORE_000',
  },
  /* GALLERY —— 视觉作品展（原 MEDIA：MV / Vlog / 摄影） */
  GALLERY: {
    ambientIntensity: 0.3,
    directionalIntensity: 1.3,
    lightColor: '#efe9fc',
    windowLightIntensity: 1.0,
    shadowStrength: 1.0,
    fogDensity: 0.013,
    haloColor: '#f0eaff',
    camera: { pos: [2.4, 1.68, 5.0], look: [0.7, 1.72, -0.15] },
    /* 竖屏：相机偏右、视线向左上抬 → 兽头偏右、左缘透出左窗玻璃+天光 */
    cameraMobilePortrait: { pos: [1.15, 1.42, 5.6], look: [-0.45, 2.7, -0.7] },
    /* 横屏：保留右前侧构图的建筑语境，两窗完整 */
    cameraMobileLandscape: { pos: [1.45, 1.92, 5.3], look: [0.35, 1.98, -0.15] },
    fovDesktop: 42,
    fovMobilePortrait: 55,
    fovMobileLandscape: 62,
    node: 'GAL_001',
  },
  /* CONTACT —— 联系方式 + 社交渠道（原 CONTACT ∪ SOCIAL：email/微信/QQ/B站…） */
  CONTACT: {
    ambientIntensity: 0.32,
    directionalIntensity: 1.2,
    lightColor: '#fff1e2',
    windowLightIntensity: 1.05,
    shadowStrength: 1.0,
    fogDensity: 0.015,
    haloColor: '#ffefe0',
    camera: { pos: [-2.4, 1.68, 5.0], look: [-0.7, 1.72, -0.15] },
    /* 竖屏：与 GALLERY 镜像（相机偏左 → 兽头偏左、右缘窗带） */
    cameraMobilePortrait: { pos: [-1.15, 1.42, 5.6], look: [0.45, 2.7, -0.7] },
    cameraMobileLandscape: { pos: [-1.45, 1.92, 5.3], look: [-0.35, 1.98, -0.15] },
    fovDesktop: 42,
    fovMobilePortrait: 55,
    fovMobileLandscape: 62,
    node: 'CTC_002',
  },
  /* ALBUM —— 专辑档案 + 音频控制台（原 ALBUM ∪ MUSIC） */
  ALBUM: {
    ambientIntensity: 0.32,
    directionalIntensity: 1.3,
    lightColor: '#ffffff',
    windowLightIntensity: 1.1,
    shadowStrength: 1.0,
    fogDensity: 0.015,
    haloColor: '#ffe9f0',
    camera: { pos: [0, 1.72, 4.6], look: [0, 1.52, 0.8] },
    /* 竖屏：拉近平视（面板为主场，兽头做背景），略抬视保留顶部层次 */
    cameraMobilePortrait: { pos: [0, 1.62, 5.2], look: [0, 2.5, 0.1] },
    cameraMobileLandscape: { pos: [0, 1.92, 4.9], look: [0, 1.95, 0.3] },
    fovDesktop: 42,
    fovMobilePortrait: 55,
    fovMobileLandscape: 62,
    node: 'ALB_003',
  },
  /* ABOUT —— 个人介绍 + 履历时间线（原 ARCHIVE：经历/公益/社团/专利） */
  ABOUT: {
    ambientIntensity: 0.3,
    directionalIntensity: 1.05,
    lightColor: '#edf1ec',
    windowLightIntensity: 0.9,
    shadowStrength: 1.1,
    fogDensity: 0.02,
    haloColor: '#e9f1ea',
    camera: { pos: [0, 2.82, 6.28], look: [0, 1.36, -0.85] },
    /* 竖屏：与 HOME 区分——pos 略高、look 抬得更高、更正面（偏中无 yaw），
       形成「档案室近观」机位；上 45% 建筑天光，下 35% 兽头 + 地面。 */
    cameraMobilePortrait: { pos: [0, 2.05, 5.95], look: [0, 2.75, -0.35] },
    cameraMobileLandscape: { pos: [0, 2.2, 5.9], look: [0, 1.8, 0] },
    fovDesktop: 42,
    fovMobilePortrait: 55,
    fovMobileLandscape: 62,
    node: 'ABT_004',
  },
};
