/**
 * 4 个 Mode 入口数据 —— 替代旧的 BottomNavigation
 *
 * 每条入口带 1 张小缩略图（hover 弹 12px / 静态显示 6-8px 预览），
 * 点击 → 切换到对应 Mode 面板。
 *
 * 设计原则：
 *  - 静态预览图（CSS / 已下载的封面）—— 不依赖网络，避免空白
 *  - ALBUM 用真实封面；CONTACT 用 4 个社交 icon 网格；
 *    GALLERY 用视频缩略图占位（待 Bilibili 真实封面接入）；
 *    ABOUT 用 CSS 渲染的身份卡
 *  - 名称多语言：en/zh 共享同一数据，按 lang 字段切换
 */

import type { Mode } from './store';

export type EntryThumb =
  | { kind: 'album'; albumIndex: number }
  | { kind: 'social-grid'; platformIds: string[] }
  | { kind: 'identity'; role: string }
  | { kind: 'gallery-video'; videoId: string };

export interface ModeEntry {
  mode: Exclude<Mode, 'HOME'>;
  /** 罗马字/主名（与 store.MODES 对齐） */
  name: string;
  /** 中文名 */
  nameZh: string;
  /** 副标题（一句话） */
  subtitle: { en: string; zh: string };
  /** 缩略图（静态，渲染期即知） */
  thumb: EntryThumb;
  /** 入口色（点开后面板主色） */
  accent: string;
}

export const MODE_ENTRIES: ModeEntry[] = [
  {
    mode: 'GALLERY',
    name: 'Gallery',
    nameZh: '视觉',
    subtitle: {
      en: 'Vlog · Short · Interview',
      zh: 'Vlog · 短片 · 访谈',
    },
    thumb: { kind: 'gallery-video', videoId: 'vlog-gaga-party-2026' },
    accent: '#7d4dff',
  },
  {
    mode: 'CONTACT',
    name: 'Contact',
    nameZh: '联络',
    subtitle: {
      en: 'WeChat · IG · X · Bilibili',
      zh: '微信 · 微博 · IG · B站',
    },
    thumb: {
      kind: 'social-grid',
      platformIds: ['wechat', 'instagram', 'x', 'bilibili'],
    },
    accent: '#ff8a3d',
  },
  {
    mode: 'ALBUM',
    name: 'Album',
    nameZh: '唱片',
    subtitle: {
      en: 'DIAGNOSIS DIARY · 8 tracks',
      zh: '诊疗日志 · 8 首',
    },
    thumb: { kind: 'album', albumIndex: 0 },
    accent: '#84343e',
  },
  {
    mode: 'ABOUT',
    name: 'About',
    nameZh: '关于',
    subtitle: {
      en: 'Composer · Musician · Creator',
      zh: '作曲 · 音乐人 · 创作者',
    },
    thumb: { kind: 'identity', role: 'COMPOSER' },
    accent: '#9c1d2e',
  },
];
