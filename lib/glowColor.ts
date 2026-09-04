import * as THREE from 'three';

/**
 * 共享颜色 / 材质单例 —— 避免每帧为每个材质创建新的 THREE.Color。
 * R11：移除 haloGlow（已删除 Halo 平面/点光 → 不再需要共享 halo 色）。
 */

/** 石膏基色（暖白偏亮）—— 兽头 base color 共享实例
 *  R11：roughness 0.88、metalness 0（纯石膏），envMapIntensity 0.4
 *  → 三层亮度（墙 < 地 < 主体）最亮层。 */
export const plasterBase = new THREE.Color('#f6f3ec');