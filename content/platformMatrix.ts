/**
 * PLATFORM_MATRIX_CONFIG —— ACT 04 MEDIA_MATRIX 集中式平台配置（R78）
 *
 * 7 大平台的「真实链接 / 账号标识 / 内容定位 / 代表作示例 / 专属主题色板」
 * 全部集中在这里维护，MediaStage 只做渲染，严禁在组件里写死平台数据。
 *
 *  - region : 'cn' 国内生态（默认板块）| 'global' 海外生态
 *  - demos  : 2 个内置代表作示例槽（badge 类型角标 / title / meta 格式标签）
 *  - theme  : 展示卡 CSS 变量色板（bg / btnBg 支持完整 CSS background 值，含渐变）
 *             浅底卡强制深色文字、深底卡强制纯白文字 + 高对比浅灰副文字（WCAG AA）
 */

export type MatrixRegion = 'cn' | 'global';

export interface PlatformDemo {
  badge: string;
  title: string;
  meta: string;
}

export interface PlatformTheme {
  /** 主色（图标 tint / 高亮边框 / pills 选中态） */
  primary: string;
  /** 展示卡背景（支持渐变） */
  bg: string;
  /** 主文字（浅底深字 / 深底白字，保 AA 对比度） */
  text: string;
  /** 次要文字 */
  sub: string;
  /** 卡片边框 */
  border: string;
  /** 主按钮背景（支持渐变；抖音用 CSS data-platform 特殊规则做流光边） */
  btnBg: string;
  /** 主按钮文字 */
  btnText: string;
  /** 图标砖块背景 */
  iconBg: string;
  /** 图标砖块边框 */
  iconBorder: string;
  /** 图标颜色 */
  iconColor: string;
  /** 图标光晕（box-shadow 用 rgba） */
  glow: string;
  /** 示例小卡背景 */
  demoBg: string;
  /** 示例小卡边框 */
  demoBorder: string;
  /** 底部 Dock 选中态实心填充（支持渐变） */
  dockBg: string;
  /** Dock 选中态图标色 */
  dockIcon: string;
  /** Dock 选中态外圈发光 */
  dockGlow: string;
}

export interface PlatformMatrixEntry {
  id: string; // 与 SOCIALS / BrandIcon 的 id 对齐
  region: MatrixRegion;
  name: string;
  zhName?: string;
  handle: string;
  copyId: string;
  link: string;
  bio: string;
  demos: [PlatformDemo, PlatformDemo];
  theme: PlatformTheme;
}

const ON_AIR = 'ON AIR // 活跃更新';

export const PLATFORM_MATRIX_CONFIG: PlatformMatrixEntry[] = [
  /* ================= CN // 国内内容生态 ================= */
  {
    id: 'bilibili',
    region: 'cn',
    name: 'Bilibili',
    zhName: '哔哩哔哩',
    handle: 'VANLAN · UID 622920233',
    copyId: 'UID 622920233',
    link: 'https://space.bilibili.com/622920233',
    bio: '长视频主场 · 编曲混音工程解析 / 3D 角色绑定演示 / 完整版 MV',
    demos: [
      {
        badge: '编曲工程',
        title: '合成器流行 (Synth-Pop) 全轨编配与混音拆解',
        meta: '03:24 · 1080P 60帧',
      },
      {
        badge: '3D 制作',
        title: 'Kemono 日系兽头建模、拓扑与面部骨骼绑定展示',
        meta: '01:58 · 工程实录',
      },
    ],
    theme: {
      // R81 Clean Ambient：清透冰川蓝微光底，主色只上徽章与主按钮
      primary: '#00a1d6',
      bg: 'rgba(228, 246, 253, 0.82)',
      text: '#0f1e26',
      sub: '#54707f',
      border: 'rgba(0, 161, 214, 0.18)',
      btnBg: '#00a1d6',
      btnText: '#ffffff',
      iconBg: 'rgba(0, 161, 214, 0.1)',
      iconBorder: 'rgba(0, 161, 214, 0.25)',
      iconColor: '#0087ad',
      glow: 'rgba(0, 161, 214, 0.3)',
      demoBg: 'rgba(255, 255, 255, 0.55)',
      demoBorder: 'rgba(0, 161, 214, 0.2)',
      dockBg: '#00a1d6',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(0, 161, 214, 0.35)',
    },
  },
  {
    id: 'douyin',
    region: 'cn',
    name: 'Douyin',
    zhName: '抖音',
    handle: '@VANLAN',
    copyId: '@VANLAN',
    link: 'https://www.douyin.com/user/MS4wLjABAAAAVV2pcc0Q08E7dZiNrrWVpglhJTrQwFUcelpeJS20x9FpNGPckARxWZHSyBZ5p48l',
    bio: '短视频高燃切片 · 副歌 Drop 混音前后对比 / 3D 实时互动整活 / 幕后日常',
    demos: [
      {
        badge: '混音对比',
        title: '干声 vs 商业级母带成品：一秒入魂 Drop 冲击力',
        meta: '00:45 · 竖屏高燃',
      },
      {
        badge: '虚拟演出',
        title: '3D 兽头实时动捕与灯光律动切片',
        meta: '00:32 · 60FPS',
      },
    ],
    theme: {
      // R81.1 Clean Ambient 浅色系：清透青雾微光底，品牌青只做点缀，主按钮用深青保证 AA
      primary: '#0f766e',
      bg: 'rgba(224, 250, 249, 0.82)',
      text: '#0f1c1e',
      sub: '#4f6a6c',
      border: 'rgba(15, 118, 110, 0.16)',
      btnBg: '#0f766e',
      btnText: '#ffffff',
      iconBg: 'rgba(37, 244, 238, 0.1)',
      iconBorder: 'rgba(15, 118, 110, 0.22)',
      iconColor: '#0f766e',
      glow: 'rgba(37, 244, 238, 0.3)',
      demoBg: 'rgba(255, 255, 255, 0.55)',
      demoBorder: 'rgba(15, 118, 110, 0.16)',
      dockBg: '#0f766e',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(37, 244, 238, 0.3)',
    },
  },
  {
    id: 'xiaohongshu',
    region: 'cn',
    name: 'RED',
    zhName: '小红书',
    handle: 'VANLAN',
    copyId: 'VANLAN',
    link: 'https://www.xiaohongshu.com/user/profile/5e63321a0000000001007938',
    bio: '图文与视觉设定集 · 3D 渲染多视图 / 独立网页设计笔记 / 制作人桌面装备',
    demos: [
      {
        badge: '设定图集',
        title: 'VANLAN.OS 个人交互终端与 3D 兽设视觉设计全记录',
        meta: '多图笔记',
      },
      {
        badge: '音频干货',
        title: '独立音乐人常用宿主插件链与人声处理心得',
        meta: '图文专栏',
      },
    ],
    theme: {
      // R81 Clean Ambient：暖瓷绯白底，炭黑文字
      primary: '#ff2442',
      bg: 'rgba(255, 238, 241, 0.82)',
      text: '#1a1a1a',
      sub: '#8a6a70',
      border: 'rgba(255, 36, 66, 0.16)',
      btnBg: '#ff2442',
      btnText: '#ffffff',
      iconBg: 'rgba(255, 36, 66, 0.08)',
      iconBorder: 'rgba(255, 36, 66, 0.2)',
      iconColor: '#e81e3c',
      glow: 'rgba(255, 36, 66, 0.25)',
      demoBg: 'rgba(255, 255, 255, 0.6)',
      demoBorder: 'rgba(255, 36, 66, 0.16)',
      dockBg: '#ff2442',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(255, 36, 66, 0.32)',
    },
  },

  /* ================= GLOBAL // 海外内容生态 ================= */
  {
    id: 'youtube',
    region: 'global',
    name: 'YouTube',
    handle: '@VANLANPLAY',
    copyId: '@VANLANPLAY',
    link: 'https://www.youtube.com/@VANLANPLAY',
    bio: 'Global Official Channel · Full Music Videos, 4K Showreels & Devlogs',
    demos: [
      {
        badge: '4K SHOWREEL',
        title: 'VANLAN — Original Composition & 3D Interactive Visuals',
        meta: '03:40',
      },
      {
        badge: 'DEVLOG',
        title: 'Building an Anime-OP Inspired 3D Portfolio with R3F',
        meta: '02:15',
      },
    ],
    theme: {
      // R81.1 Clean Ambient 浅色系：暖瓷绯红微光底，经典绯红压深一档保对比
      primary: '#e00028',
      bg: 'rgba(255, 236, 239, 0.82)',
      text: '#201216',
      sub: '#8a5f68',
      border: 'rgba(255, 0, 51, 0.14)',
      btnBg: '#e00028',
      btnText: '#ffffff',
      iconBg: 'rgba(255, 0, 51, 0.08)',
      iconBorder: 'rgba(255, 0, 51, 0.2)',
      iconColor: '#e00028',
      glow: 'rgba(255, 0, 51, 0.22)',
      demoBg: 'rgba(255, 255, 255, 0.55)',
      demoBorder: 'rgba(255, 0, 51, 0.14)',
      dockBg: '#e00028',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(255, 0, 51, 0.26)',
    },
  },
  {
    id: 'x',
    region: 'global',
    name: 'X',
    zhName: 'Twitter',
    handle: '@VANLAN_01277',
    copyId: '@VANLAN_01277',
    link: 'https://x.com/VANLAN_01277',
    bio: 'WIP Snapshots · Blender Wireframes, Audio Snippets & Instant Updates',
    demos: [
      {
        badge: 'WIP THREAD',
        title: 'New Kemono head topology + shader test in Blender / Three.js ⚡',
        meta: 'THREAD',
      },
      {
        badge: 'AUDIO CLIP',
        title: 'Late night synth arrangement session — 30s preview 🎧',
        meta: 'AUDIO',
      },
    ],
    theme: {
      // R81 Clean Ambient：极客冷银灰底，纯黑高对比徽章与主按钮
      primary: '#0f1419',
      bg: 'rgba(240, 243, 246, 0.82)',
      text: '#0f1419',
      sub: '#66757f',
      border: 'rgba(15, 20, 25, 0.14)',
      btnBg: '#0f1419',
      btnText: '#ffffff',
      iconBg: '#0f1419',
      iconBorder: 'rgba(15, 20, 25, 0.2)',
      iconColor: '#ffffff',
      glow: 'rgba(15, 20, 25, 0.24)',
      demoBg: 'rgba(255, 255, 255, 0.55)',
      demoBorder: 'rgba(15, 20, 25, 0.12)',
      dockBg: '#0f1419',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(15, 20, 25, 0.28)',
    },
  },
  {
    id: 'instagram',
    region: 'global',
    name: 'Instagram',
    handle: '@vanlanplay',
    copyId: '@vanlanplay',
    link: 'https://www.instagram.com/vanlanplay/',
    bio: 'Visual Gallery & Reels · 3D Turntables, Studio Vibes & Aesthetic Cuts',
    demos: [
      {
        badge: 'REELS',
        title: '3D Character Lighting & Turntable Render Showcase',
        meta: '9:16 Reel',
      },
      {
        badge: 'GALLERY',
        title: 'Studio Gear, DAW Sessions & Visual Concept Art',
        meta: 'Carousel',
      },
    ],
    theme: {
      // R81 Clean Ambient：柔雾紫金微光底 + 流光徽章与主按钮，深色高对比文字
      primary: '#bc1888',
      bg: 'linear-gradient(135deg, rgba(253, 244, 235, 0.85) 0%, rgba(250, 234, 246, 0.85) 100%)',
      text: '#1c1624',
      sub: '#7d6b86',
      border: 'rgba(188, 24, 136, 0.16)',
      btnBg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      btnText: '#ffffff',
      iconBg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      iconBorder: 'rgba(188, 24, 136, 0.2)',
      iconColor: '#ffffff',
      glow: 'rgba(188, 24, 136, 0.26)',
      demoBg: 'rgba(255, 255, 255, 0.55)',
      demoBorder: 'rgba(188, 24, 136, 0.18)',
      dockBg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(188, 24, 136, 0.32)',
    },
  },
  {
    id: 'threads',
    region: 'global',
    name: 'Threads',
    handle: '@vanlanplay',
    copyId: '@vanlanplay',
    link: 'https://www.threads.com/@vanlanplay',
    bio: 'Creator Notes · Music Production Thoughts, Behind-the-Scenes & Q&A',
    demos: [
      {
        badge: 'NOTE',
        title: 'Sound design micro-tips & vocal mixing chain breakdowns',
        meta: 'TEXT',
      },
      {
        badge: 'DAILY',
        title: 'Creative workflow updates & interactive web experiments',
        meta: 'UPDATE',
      },
    ],
    theme: {
      // R81 Clean Ambient：纯粹极简黑白调
      primary: '#101010',
      bg: 'rgba(242, 242, 242, 0.82)',
      text: '#111111',
      sub: '#6d6d6d',
      border: 'rgba(0, 0, 0, 0.12)',
      btnBg: '#101010',
      btnText: '#ffffff',
      iconBg: '#101010',
      iconBorder: 'rgba(0, 0, 0, 0.16)',
      iconColor: '#ffffff',
      glow: 'rgba(0, 0, 0, 0.18)',
      demoBg: 'rgba(255, 255, 255, 0.55)',
      demoBorder: 'rgba(0, 0, 0, 0.1)',
      dockBg: '#101010',
      dockIcon: '#ffffff',
      dockGlow: 'rgba(0, 0, 0, 0.22)',
    },
  },
];

/** 板块定义（顺序即 Tab 顺序；cn 默认激活） */
export const MATRIX_REGIONS: {
  id: MatrixRegion;
  label: string;
  defaultPlatform: string;
}[] = [
  { id: 'cn', label: 'CN / 国内生态', defaultPlatform: 'bilibili' },
  { id: 'global', label: 'GLOBAL / 海外生态', defaultPlatform: 'youtube' },
];
