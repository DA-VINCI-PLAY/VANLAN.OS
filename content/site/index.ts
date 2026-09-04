/**
 * SITE —— 站点级配置（站名 / 品牌全名 / 默认语言）。
 *
 * 改站点名 / 品牌标识 / 默认语言，都只改这个文件，无需改动组件。
 * 详细步骤见 content/README.md。
 *
 * 注意：站点名 SITE.name 同时被 content/about 的 IDENTITY.name 引用，
 * 保持单一事实源 —— 改名只需在这里改一处。
 */

export const SITE = {
  /** 主展示名（首页大标题 / 关于页名片） */
  name: 'VANLAN',
  /** 品牌全名（首页 brand 小字 / 右上角系统 HUD） */
  brand: 'VANLAN.OS',
  /** 默认语言（首次进入站点时的语言） */
  defaultLang: 'en',
} as const;

export type SiteLang = typeof SITE.defaultLang;
