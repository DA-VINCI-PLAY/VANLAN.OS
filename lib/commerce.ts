/**
 * commerce —— 接单商品 / 订单的本地持久化层（R51）
 *
 * 两个隔离的存储键：
 *   vanlan_products —— 商品（服务）列表，管理员控制台可增删改上下架
 *   vanlan_orders   —— 访客提交的委托单，管理员改状态 / 导出 / 清空
 *
 * 设计约束：
 *  - SSR 安全：模块加载时不触碰 localStorage，hydrate() 在 client effect 中调用；
 *  - 写入即持久化（每次 mutation 后同步写回，刷新不丢）；
 *  - 读到脏数据（非数组 / JSON 损坏）自动回落默认值，不让页面白屏；
 *  - 订单 ID 形如 VL-261019-7K2M，肉眼可读、可口头报单。
 */

import { create } from 'zustand';
import {
  DEFAULT_SERVICES,
  type ServiceCategory,
  type ServiceProduct,
} from '@/content/services';

export const PRODUCTS_KEY = 'vanlan_products';
export const ORDERS_KEY = 'vanlan_orders';

export type OrderStatus = 'pending' | 'in_progress' | 'delivered';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待沟通',
  in_progress: '制作中',
  delivered: '已交付',
};

export const ORDER_STATUS_EN: Record<OrderStatus, string> = {
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
  delivered: 'DELIVERED',
};

export const ORDER_FLOW: OrderStatus[] = [
  'pending',
  'in_progress',
  'delivered',
];

export interface Order {
  id: string;
  serviceId: string;
  serviceName: string;
  /** 客户称呼 */
  clientName: string;
  /** 联系方式类型 */
  contactType: 'WeChat' | 'Email' | 'QQ';
  contact: string;
  /** 预算范围（展示串，如 "¥1,000 – ¥2,000"） */
  budget: string;
  /** 需求描述 */
  brief: string;
  /** 是否需要试听小样 */
  demo: boolean;
  status: OrderStatus;
  createdAt: string;
}

export interface NewOrderInput {
  serviceId: string;
  serviceName: string;
  clientName: string;
  contactType: Order['contactType'];
  contact: string;
  budget: string;
  brief: string;
  demo: boolean;
}

export type ProductDraft = Omit<ServiceProduct, 'id' | 'createdAt'> & {
  id?: string;
};

/* ---------------- 工具 ---------------- */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满 / 隐私模式：静默降级，不阻断交互 */
  }
}

/** 订单号：VL-YYMMDD-XXXX（base36 大写 4 位） */
export function makeOrderId(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VL-${yy}${mm}${dd}-${rand}`;
}

export function makeProductId(): string {
  return `svc-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

/* ---------------- Store ---------------- */

interface CommerceState {
  hydrated: boolean;
  products: ServiceProduct[];
  orders: Order[];

  hydrate: () => void;

  addProduct: (draft: ProductDraft) => ServiceProduct;
  updateProduct: (id: string, draft: Partial<ProductDraft>) => void;
  toggleProduct: (id: string) => void;
  removeProduct: (id: string) => void;

  addOrder: (input: NewOrderInput) => Order;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  advanceOrder: (id: string) => void;
  removeOrder: (id: string) => void;
  clearOrders: () => void;
}

export const useCommerce = create<CommerceState>((set, get) => ({
  hydrated: false,
  products: DEFAULT_SERVICES,
  orders: [],

  hydrate: () => {
    if (get().hydrated) return;
    const storedProducts = readJSON<ServiceProduct[] | null>(PRODUCTS_KEY, null);
    const products =
      storedProducts && storedProducts.length > 0
        ? storedProducts
        : DEFAULT_SERVICES;
    const orders = readJSON<Order[]>(ORDERS_KEY, []);
    // 首次访问播种：让后台有东西可管理
    if (!storedProducts) writeJSON(PRODUCTS_KEY, products);
    set({ products, orders, hydrated: true });
  },

  addProduct: (draft) => {
    const product: ServiceProduct = {
      ...draft,
      id: draft.id ?? makeProductId(),
      createdAt: new Date().toISOString(),
    };
    const products = [product, ...get().products];
    writeJSON(PRODUCTS_KEY, products);
    set({ products });
    return product;
  },

  updateProduct: (id, draft) => {
    const products = get().products.map((p) =>
      p.id === id ? { ...p, ...draft, id: p.id } : p,
    );
    writeJSON(PRODUCTS_KEY, products);
    set({ products });
  },

  toggleProduct: (id) => {
    const products = get().products.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p,
    );
    writeJSON(PRODUCTS_KEY, products);
    set({ products });
  },

  removeProduct: (id) => {
    const products = get().products.filter((p) => p.id !== id);
    writeJSON(PRODUCTS_KEY, products);
    set({ products });
  },

  addOrder: (input) => {
    const order: Order = {
      ...input,
      id: makeOrderId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const orders = [order, ...get().orders];
    writeJSON(ORDERS_KEY, orders);
    set({ orders });
    return order;
  },

  setOrderStatus: (id, status) => {
    const orders = get().orders.map((o) =>
      o.id === id ? { ...o, status } : o,
    );
    writeJSON(ORDERS_KEY, orders);
    set({ orders });
  },

  advanceOrder: (id) => {
    const cur = get().orders.find((o) => o.id === id);
    if (!cur) return;
    const i = ORDER_FLOW.indexOf(cur.status);
    const next = ORDER_FLOW[Math.min(i + 1, ORDER_FLOW.length - 1)];
    get().setOrderStatus(id, next);
  },

  removeOrder: (id) => {
    const orders = get().orders.filter((o) => o.id !== id);
    writeJSON(ORDERS_KEY, orders);
    set({ orders });
  },

  clearOrders: () => {
    writeJSON(ORDERS_KEY, []);
    set({ orders: [] });
  },
}));

/** 只读选择器：上架中的服务（访客视角） */
export function selectActiveProducts(state: CommerceState): ServiceProduct[] {
  return state.products.filter((p) => p.active);
}

/* ---------------- 验证 / 导出 ---------------- */

/**
 * 管理员口令校验。
 * 用户口令以全角「！」给出：901888！
 *  - NFKC 归一化：全角 ！(U+FF01) → '!'，全角数字 ９０１… → 半角数字
 *  - 去掉所有空白（含首尾空格、零宽字符）
 * → 901888! / 901888！ / " 901888! " 均通过。
 */
export const ADMIN_PASSCODE = '901888!';

export function verifyAdminPasscode(raw: string): boolean {
  if (!raw) return false;
  const normalized = raw
    .normalize('NFKC')
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '');
  return normalized === ADMIN_PASSCODE;
}

export function ordersToJSON(orders: Order[]): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), count: orders.length, orders },
    null,
    2,
  );
}

export function ordersToCSV(orders: Order[]): string {
  const head = [
    'order_id',
    'created_at',
    'service',
    'client',
    'contact_type',
    'contact',
    'budget',
    'demo',
    'status',
    'brief',
  ];
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [
      o.id,
      o.createdAt,
      o.serviceName,
      o.clientName,
      o.contactType,
      o.contact,
      o.budget,
      o.demo ? 'yes' : 'no',
      ORDER_STATUS_EN[o.status],
      o.brief,
    ]
      .map((v) => esc(String(v)))
      .join(','),
  );
  // BOM：Excel 打开中文不乱码
  return '\uFEFF' + [head.join(','), ...rows].join('\r\n');
}

export function downloadText(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8',
) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** 快捷入口：预算档位（表单下拉） */
export const BUDGET_OPTIONS = [
  '¥500 以下',
  '¥500 – ¥1,000',
  '¥1,000 – ¥2,000',
  '¥2,000 – ¥5,000',
  '¥5,000 以上',
  '面议',
];

export const CONTACT_TYPES: Order['contactType'][] = ['WeChat', 'Email', 'QQ'];

/** 分类色（Tesla 单色系 + 一点红，不做彩虹） */
export const CATEGORY_OF = (c: ServiceCategory) => c;
