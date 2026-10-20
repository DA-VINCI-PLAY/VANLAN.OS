'use client';

/**
 * worksDrawer —— 移动端作品抽屉的开关（跨组件共享的极简 store）
 *
 * 胶囊入口长在名片卡片里，抽屉本身 portal 到 body —— 两者不在同一棵子树，
 * 用一个一字节的状态把它们串起来，避免把整块 DOM 往上提。
 */

import { create } from 'zustand';

interface WorksDrawerState {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const useWorksDrawer = create<WorksDrawerState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));
