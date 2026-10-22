/**
 * SERVICES —— 接单商品的「出厂默认值」
 *
 * R74：AI 辅助增效版价目表（¥50 – ¥500+）
 * 运行时事实源是 localStorage('vanlan_products')：
 * 首次访问用本文件播种；管理员在控制台增删改后，以本地存储为准。
 * 改默认服务 → 改这里 + commerce.ts 的 PRODUCTS_VER +1（旧浏览器数据会被新目录覆盖）。
 */

export type ServiceCategory =
  | 'AUDIO'
  | 'VIDEO'
  | 'MODELING'
  | 'WEB'
  | 'CUSTOM';

export interface ServiceProduct {
  id: string;
  /** 服务名称 */
  name: string;
  category: ServiceCategory;
  /** 起步价（CNY，整元） */
  price: number;
  /** 交付周期（自然语言，如 "1–2 天"） */
  turnaround: string;
  /** 详细描述 */
  description: string;
  /** 包含项（交付清单） */
  deliverables: string[];
  /** 封面图 URL（可选；空 = 程序化渐变封面） */
  cover?: string;
  /** 上架状态 */
  active: boolean;
  /** 创建时间（ISO） */
  createdAt: string;
}

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  AUDIO: '音频后期 / 伴奏',
  VIDEO: '视频代剪辑',
  MODELING: '3D 皮套模型',
  WEB: '网站搭建开发',
  CUSTOM: '商业定制',
};

export const CATEGORY_EN: Record<ServiceCategory, string> = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  MODELING: '3D / RIG',
  WEB: 'WEB DEV',
  CUSTOM: 'CUSTOM',
};

/** 工坊顶部四张品类卡（联动滑块 + 筛选细分服务） */
export const CATEGORY_CARDS: {
  cat: ServiceCategory;
  emoji: string;
  name: string;
  range: [number, number];
  /** 价格上限是否为「起」价（显示 +） */
  plus?: boolean;
  hint: string;
}[] = [
  {
    cat: 'AUDIO',
    emoji: '🎵',
    name: '音频混音 / 伴奏',
    range: [50, 300],
    hint: '贴唱混音 ¥50-100 · 伴奏租赁/买断/定制',
  },
  {
    cat: 'VIDEO',
    emoji: '🎬',
    name: '视频 / 翻唱PV剪辑',
    range: [50, 150],
    hint: '短视频切片 ¥50 · 完整翻唱PV ¥70-150',
  },
  {
    cat: 'MODELING',
    emoji: '🦊',
    name: '3D 皮套模型资产',
    range: [100, 300],
    plus: true,
    hint: '静态模型 ¥100 · 骨骼绑定 ¥200 · 复杂兽设 ¥300起',
  },
  {
    cat: 'WEB',
    emoji: '💻',
    name: '网站搭建与开发',
    range: [200, 500],
    plus: true,
    hint: '单页落地 ¥200起 · 3D交互网页 ¥350-500起',
  },
];

const now = '2026-10-22T00:00:00.000Z';

/** 「AI 辅助增效版」11+1 项细分服务价目表 */
export const DEFAULT_SERVICES: ServiceProduct[] = [
  /* ---- 网站搭建与落地开发 ---- */
  {
    id: 'svc-web-01',
    name: '基础网页落地',
    category: 'WEB',
    price: 200,
    turnaround: '1–2 天',
    description:
      '单页 Landing Page / 作品集 / 名片页，响应式适配，包上线部署（Next.js / Tailwind）。',
    deliverables: [
      '单页响应式落地页（Next.js + Tailwind）',
      '包上线部署（域名 / 服务器费用自理）',
      '移动端适配 + 基础 SEO',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-web-02',
    name: '复杂 / 3D 交互网页',
    category: 'WEB',
    price: 350,
    turnaround: '2–4 天',
    description:
      '多组件页面、集成 3D 模型展示 / 旋转交互、动态特效、跨端排障，¥350–¥500 起。',
    deliverables: [
      '多组件 / 多区块页面',
      '3D 模型集成与旋转交互',
      '动态特效 + 跨端排障',
    ],
    active: true,
    createdAt: now,
  },

  /* ---- 3D 皮套模型资产 ---- */
  {
    id: 'svc-3d-01',
    name: '基础静态模型',
    category: 'MODELING',
    price: 100,
    turnaround: '24 小时',
    description:
      'AI 辅助生成初始形体、网格重构清理、标准 T/A-Pose（OBJ/FBX）。',
    deliverables: [
      'OBJ / FBX 模型文件',
      '标准 T/A-Pose',
      'AI 原型 + 人工网格清理',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-3d-02',
    name: '标准骨骼绑定',
    category: 'MODELING',
    price: 200,
    turnaround: '1–2 天',
    description:
      '含基础人工拓扑修整、全身骨骼装配与权重绘制（可摆姿势 / 基础动作）。',
    deliverables: [
      '全身骨骼装配',
      '权重绘制 + 基础动作测试',
      'FBX 源文件交付',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-3d-03',
    name: '高精 / 复杂造型',
    category: 'MODELING',
    price: 300,
    turnaround: '2–3 天',
    description:
      '复杂配饰 / 兽设多部件分层拓扑、多轮形体修正与动作形变测试，¥300 起。',
    deliverables: [
      '多部件分层拓扑',
      '多轮形体修正',
      '动作形变测试',
    ],
    active: true,
    createdAt: now,
  },

  /* ---- 音频后期与伴奏制作 ---- */
  {
    id: 'svc-mix-01',
    name: '基础贴唱 / 简单混音',
    category: 'AUDIO',
    price: 50,
    turnaround: '24 小时内',
    description:
      'AI 智能降噪分轨 + 人工人声均衡、压缩、混响融合（不含逐字手修）。',
    deliverables: [
      'AI 智能降噪 + 分轨',
      '人声 EQ / 压缩 / 混响融合',
      '成品 WAV（不含逐字手修）',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-mix-02',
    name: '精修贴唱 / 完整混音',
    category: 'AUDIO',
    price: 100,
    turnaround: '1–2 天',
    description:
      '含人工手动修音校准、消齿音、动态平衡雕琢、商业母带压限。',
    deliverables: [
      '人工手动修音校准',
      '消齿音 + 动态平衡',
      '商业母带压限 WAV',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-bgm-01',
    name: '现成伴奏【非独占租赁】',
    category: 'AUDIO',
    price: 60,
    turnaround: '即时交付',
    description:
      '交付高保真 WAV，用于翻唱 / 视频BGM（非买断，保留署名），¥60–¥100 / 首。',
    deliverables: [
      '高保真 WAV',
      '翻唱 / 视频 BGM 使用权',
      '非独占 · 保留署名',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-bgm-02',
    name: '现成伴奏【独占买断】',
    category: 'AUDIO',
    price: 150,
    turnaround: '即时交付',
    description:
      '交付分轨 WAV 与完整使用权，下架不再二转销售，¥150–¥250 / 首。',
    deliverables: [
      '分轨 WAV + 完整使用权',
      '下架不再二转销售',
      '独家买断凭证',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-compose-01',
    name: '特定风格伴奏定制',
    category: 'AUDIO',
    price: 100,
    turnaround: '2–4 天',
    description:
      '指定风格 / 参考曲，AI 辅助灵感 + 人工编配混音（保底 ¥100 起，¥100–¥300）。',
    deliverables: [
      '指定风格 / 参考曲对齐',
      'AI 辅助灵感 + 人工编配',
      '成品 WAV + 混音',
    ],
    active: true,
    createdAt: now,
  },

  /* ---- 视频代剪辑 ---- */
  {
    id: 'svc-video-01',
    name: '短视频 / 切片高光 (≤1min)',
    category: 'VIDEO',
    price: 50,
    turnaround: '24 小时内',
    description:
      'AI 字幕初对 + 人工卡点节奏剪辑、花字音效、视觉包装。',
    deliverables: [
      'AI 字幕初对 + 人工校准',
      '卡点节奏剪辑',
      '花字 / 音效 / 视觉包装',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-video-02',
    name: '完整翻唱 PV / 氛围长视频',
    category: 'VIDEO',
    price: 70,
    turnaround: '1–2 天',
    description:
      '完整曲目动态字幕、静态原画视差动效、粒子氛围与情绪转场，¥70–¥150 / 条。',
    deliverables: [
      '完整曲目动态字幕',
      '静态原画视差动效',
      '粒子氛围 + 情绪转场',
    ],
    active: true,
    createdAt: now,
  },
];

/** 下单必读：《工作室合作须知与 AI 作业免责条款》全文 */
export const TERMS_SECTIONS: { title: string; body: string }[] = [
  {
    title: '01 · AI 辅助作业说明与技术边界',
    body: '本工作室采用「AI 尖端工具提效 + 人工专业工程精修」模式。3D 建模以整体美观与正常形变为准，不做影视级逐点精雕；混音不包修严重爆麦、失真干音；代码开发不含第三方 API、域名与服务器自购费用。',
  },
  {
    title: '02 · 定金与交付流程',
    body: '统一 50% 预付款定金排期，定金不退。流程：确认需求 → 支付定金 → 交付带水印试看 / 试听 / 测试域名验收 → 结清 50% 尾款 → 秒发无水印成片 / 源码 / 分轨 / 工程文件。',
  },
  {
    title: '03 · 改稿限制与防扯皮',
    body: '需求范围内包 2 次免费小幅微调；超限微调 ¥20 / 次；中途推翻方案重做按新单计费。请在需求描述中尽量写清参考与预期，避免口头模糊需求。',
  },
  {
    title: '04 · 客户素材要求',
    body: '混音需提供对齐好的纯干声 WAV；网页开发需开工前备齐图文素材；样稿发出后请于 48 小时内汇总修改意见，超过 5 天未反馈默认验收完成。',
  },
];
