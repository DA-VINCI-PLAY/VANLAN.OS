/**
 * ABOUT —— 公众身份条 + 座右铭 + 6 欲内容数据（唯一的"关于我"事实源）。
 *
 * 改名字 / 身份标签 / 座右铭 / 六欲气泡文案，都只改这个文件，无需改动组件。
 * 详细步骤见 content/README.md。
 *
 * 说明：
 *  - 面向公众社交名片，只放名字 / 身份标签 / 角色行；
 *  - 具体数字（专辑数 / 曲目数 / 流媒体平台数）由组件从 ALBUMS 动态推导；
 *  - 座右铭（motto）与 6 欲气泡由 HOME 展台告示牌（HomeSlab）读取。
 */

import { SITE } from '@/content/site';

export interface AboutIdentity {
  /** 主展示名（单一名片，与全站品牌一致，取 SITE.name） */
  name: string;
  /** 角色副标题行 */
  role: string;
  /** 身份 / 地域标签 chips（纯装饰文本） */
  tags: string[];
}

export const IDENTITY: AboutIdentity = {
  name: SITE.name,
  role: 'COMPOSER · MUSICIAN · CREATOR',
  tags: ['DEVELOPER', 'INDIE MUSIC', 'GUANGDONG', 'CN'],
};

/** 座右铭（主句 / 副句），中英两版 */
export const MOTTO = {
  main: {
    zh: '食欲 · 性欲 · 打扮欲 · 分享欲 · 表达欲 · 探索欲',
    en: 'APPETITE · DESIRE · PRESENTATION · SHARING · EXPRESSION · EXPLORATION',
  },
  sub: {
    zh: '缺一不可，共同构成这颗鲜活的生命',
    en: 'Inseparable — together they make this life vivid.',
  },
} as const;

/** 身份短句（展台告示牌 role 行下方），中英两版 */
export const BIO = {
  zh: '作曲 · 音乐人 · 创作者 · 广东',
  en: 'Composer · Musician · Creator · Guangdong CN',
} as const;

/** 6 欲气泡（HOME 展台 hover/focus 时围圆浮出） */
export const DESIRES: { key: string; zh: string; en: string }[] = [
  { key: 'd1', zh: '食欲', en: 'APPETITE' },
  { key: 'd2', zh: '性欲', en: 'DESIRE' },
  { key: 'd3', zh: '打扮欲', en: 'PRESENTATION' },
  { key: 'd4', zh: '分享欲', en: 'SHARING' },
  { key: 'd5', zh: '表达欲', en: 'EXPRESSION' },
  { key: 'd6', zh: '探索欲', en: 'EXPLORATION' },
];
