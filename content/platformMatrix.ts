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
  /** pills 选中态背景（可选；默认用 iconBg。深色平台在此给深底） */
  pillBg?: string;
  /** pills 选中态文字色（浅色面板上必须可达 3:1，不可直接用深底平台的主色/白） */
  pillColor: string;
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
      // #00A1D6 浅底对比度不足 AA → 文字保持深色，蓝只用于边框/图形
      primary: '#00a1d6',
      bg: 'linear-gradient(145deg, rgba(0, 161, 214, 0.14) 0%, rgba(245, 250, 253, 0.95) 100%)',
      text: '#0b1a24',
      sub: '#47637a',
      border: '#00a1d6',
      btnBg: '#00a1d6',
      btnText: '#ffffff',
      iconBg: 'rgba(0, 161, 214, 0.12)',
      iconBorder: 'rgba(0, 161, 214, 0.35)',
      iconColor: '#0087ad',
      glow: 'rgba(0, 161, 214, 0.35)',
      demoBg: 'rgba(255, 255, 255, 0.72)',
      demoBorder: 'rgba(0, 161, 214, 0.28)',
      pillColor: '#0087ad',
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
      // 纯黑底白字；青 #25F4EE / 红 #FE2C55 只做点缀（角标/流光边），严禁大面积红
      primary: '#25f4ee',
      bg: '#000000',
      text: '#ffffff',
      sub: '#cccccc',
      border: 'rgba(37, 244, 238, 0.45)',
      btnBg: 'transparent', // 流光渐变边框走 [data-platform='douyin'] 专属规则
      btnText: '#25f4ee',
      iconBg: 'rgba(255, 255, 255, 0.06)',
      iconBorder: 'rgba(255, 255, 255, 0.18)',
      iconColor: '#ffffff',
      glow: 'rgba(37, 244, 238, 0.4)',
      demoBg: 'rgba(255, 255, 255, 0.05)',
      demoBorder: 'rgba(255, 255, 255, 0.14)',
      pillBg: '#0a0a0a',
      pillColor: '#25f4ee',
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
      primary: '#ff2442',
      bg: 'linear-gradient(145deg, rgba(255, 36, 66, 0.1) 0%, rgba(255, 250, 250, 0.96) 100%)',
      text: '#1f1214',
      sub: '#7a5560',
      border: 'rgba(255, 36, 66, 0.45)',
      btnBg: '#ff2442',
      btnText: '#ffffff',
      iconBg: 'rgba(255, 36, 66, 0.1)',
      iconBorder: 'rgba(255, 36, 66, 0.3)',
      iconColor: '#e01e39',
      glow: 'rgba(255, 36, 66, 0.3)',
      demoBg: 'rgba(255, 255, 255, 0.7)',
      demoBorder: 'rgba(255, 36, 66, 0.22)',
      pillColor: '#e01e39',
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
      primary: '#ff0033',
      bg: '#121212',
      text: '#ffffff',
      sub: '#aaaaaa',
      border: 'rgba(255, 0, 51, 0.5)',
      btnBg: '#ff0033',
      btnText: '#ffffff',
      iconBg: 'rgba(255, 0, 51, 0.14)',
      iconBorder: 'rgba(255, 0, 51, 0.4)',
      iconColor: '#ff3355',
      glow: 'rgba(255, 0, 51, 0.35)',
      demoBg: 'rgba(255, 255, 255, 0.05)',
      demoBorder: 'rgba(255, 255, 255, 0.12)',
      pillColor: '#d10f33',
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
      primary: '#1d9bf0',
      bg: '#080a0c',
      text: '#f7f9f9',
      sub: '#8b98a5',
      border: 'rgba(255, 255, 255, 0.22)',
      btnBg: '#ffffff',
      btnText: '#000000',
      iconBg: 'rgba(29, 155, 240, 0.12)',
      iconBorder: 'rgba(29, 155, 240, 0.4)',
      iconColor: '#4da7f0',
      glow: 'rgba(29, 155, 240, 0.35)',
      demoBg: 'rgba(255, 255, 255, 0.05)',
      demoBorder: 'rgba(255, 255, 255, 0.12)',
      pillColor: '#1668b3',
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
      primary: '#e1306c',
      bg: '#161218',
      text: '#ffffff',
      sub: '#d1c4d8',
      border: 'rgba(225, 48, 108, 0.45)',
      btnBg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      btnText: '#ffffff',
      iconBg: 'rgba(225, 48, 108, 0.12)',
      iconBorder: 'rgba(225, 48, 108, 0.4)',
      iconColor: '#f06292',
      glow: 'rgba(225, 48, 108, 0.4)',
      demoBg: 'rgba(255, 255, 255, 0.05)',
      demoBorder: 'rgba(255, 255, 255, 0.12)',
      pillColor: '#c13584',
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
      primary: '#ffffff',
      bg: '#101010',
      text: '#f3f5f7',
      sub: '#999999',
      border: 'rgba(255, 255, 255, 0.18)',
      btnBg: '#ffffff',
      btnText: '#000000',
      iconBg: 'rgba(255, 255, 255, 0.08)',
      iconBorder: 'rgba(255, 255, 255, 0.25)',
      iconColor: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.25)',
      demoBg: 'rgba(255, 255, 255, 0.05)',
      demoBorder: 'rgba(255, 255, 255, 0.12)',
      pillBg: '#101010',
      pillColor: '#f3f5f7',
    },
  },
];

/** 板块定义（顺序即 Tab 顺序；cn 默认激活） */
export const MATRIX_REGIONS: {
  id: MatrixRegion;
  label: string;
  defaultPlatform: string;
}[] = [
  { id: 'cn', label: 'CN // 国内内容生态', defaultPlatform: 'bilibili' },
  { id: 'global', label: 'GLOBAL // 海外内容生态', defaultPlatform: 'youtube' },
];
