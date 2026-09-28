/**
 * R50 —— 运镜 / UI 节奏协同常量（单一时间源）
 *
 * CameraController（3D 运镜）与 PanelSwap（DOM 面板）共用同一份时长，
 * 避免「UI 先弹出来、相机还在慢悠悠转」的脱节感：
 *  - 模式切换运镜：桌面 0.95s / 移动 1.15s（全 linear，机械臂分节）
 *  - 面板在运镜走完 PANEL_SYNC_RATIO（60%）前保持微透明驻留，
 *    接近就位时以 PANEL_ENTER_MS + cubic-bezier(0.16,1,0.3,1) 平滑升起
 */

/** 模式切换运镜总时长（毫秒）—— 与 CameraController 的机械臂分节一致 */
export const CAMERA_MOVE_MS_DESK = 950;
export const CAMERA_MOVE_MS_MOBILE = 1150;

/** 面板等待运镜走完该比例后再升起（用户指令：前 60% 微透明） */
export const PANEL_SYNC_RATIO = 0.6;

/** 面板升起动画时长（毫秒） */
export const PANEL_ENTER_MS = 300;

/** 面板升起延迟 = 运镜时长 × 60% */
export function panelSyncDelayMs(isMobile: boolean): number {
  return Math.round(
    (isMobile ? CAMERA_MOVE_MS_MOBILE : CAMERA_MOVE_MS_DESK) * PANEL_SYNC_RATIO,
  );
}
