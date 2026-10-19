/**
 * SERVICES —— 接单商品的「出厂默认值」
 *
 * 运行时事实源是 localStorage('vanlan_products')：
 * 首次访问用本文件播种；管理员在控制台增删改后，以本地存储为准。
 * 改默认服务 → 改这里；线上已播种过的浏览器不会被覆盖（避免抹掉后台编辑）。
 */

export type ServiceCategory =
  | 'COMPOSER'
  | 'MIXING'
  | 'MODELING'
  | 'CUSTOM';

export interface ServiceProduct {
  id: string;
  /** 服务名称 */
  name: string;
  category: ServiceCategory;
  /** 起步价（CNY，整元） */
  price: number;
  /** 交付周期（自然语言，如 "7–10 days"） */
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
  COMPOSER: '编曲制作',
  MIXING: '混音 / 母带',
  MODELING: '3D 建模 / Rigging',
  CUSTOM: '商业定制',
};

export const CATEGORY_EN: Record<ServiceCategory, string> = {
  COMPOSER: 'COMPOSER',
  MIXING: 'MIXING',
  MODELING: '3D / RIG',
  CUSTOM: 'CUSTOM',
};

const now = '2026-09-01T00:00:00.000Z';

export const DEFAULT_SERVICES: ServiceProduct[] = [
  {
    id: 'svc-compose-01',
    name: '原创编曲 / 定制 BGM',
    category: 'COMPOSER',
    price: 1800,
    turnaround: '7–10 天',
    description:
      '从零为你的作品、短片或展陈写一段完整的器乐编曲。风格覆盖电子、管弦、Lo-fi、戏剧化氛围。含两次修改。',
    deliverables: [
      '成品 WAV（48kHz / 24bit）',
      '纯伴奏版 + 含主旋律版',
      '两次结构 / 配器修改',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-mix-01',
    name: '混音 & 母带处理',
    category: 'MIXING',
    price: 800,
    turnaround: '3–5 天',
    description:
      '把你的分轨做成能直接上架流媒体的成品。人声修音、空间塑造、总线母带一体化交付。',
    deliverables: [
      '混音成品 WAV',
      '母带版（-14 LUFS 流媒体标准）',
      '一次返修',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-3d-01',
    name: '3D 角色建模 + Rigging',
    category: 'MODELING',
    price: 3200,
    turnaround: '14–21 天',
    description:
      '按设定图制作可用于实时渲染的角色模型，含拓扑整理、UV、基础材质与骨骼绑定。适配 VRChat / Unity / Blender 工作流。',
    deliverables: [
      'FBX / GLB 源文件',
      '贴图（PBR 基础套）',
      '基础骨骼 + 表情 BlendShape',
    ],
    active: true,
    createdAt: now,
  },
  {
    id: 'svc-custom-01',
    name: '商业项目定制',
    category: 'CUSTOM',
    price: 0,
    turnaround: '面议',
    description:
      '品牌短片配乐、展览声音设计、互动装置、跨界合作 —— 描述你的需求，我会在 48 小时内给出方案与报价。',
    deliverables: ['需求评估与报价单', '分阶段交付计划'],
    active: true,
    createdAt: now,
  },
];
