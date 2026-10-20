/**
 * featured —— 首屏轮播作品（R61）
 *
 * 数据存 localStorage('vanlan_featured_works')，管理员后台可增删改。
 * cover 为空时由组件按序号生成程序化渐变封面，避免首屏出现空框。
 */

import { create } from 'zustand';

export const FEATURED_KEY = 'vanlan_featured_works';

export interface Work {
  id: string;
  /** 作品标题 */
  title: string;
  /** 平台 / 类型角标，如 BILIBILI / 3D RIGGING */
  tag: string;
  /** 封面图 URL（空 = 程序化渐变封面） */
  cover: string;
  /** 点击跳转的视频外链（空 = 打开内置预览） */
  href: string;
  /** 时长角标，如 03:24 */
  duration: string;
}

export const DEFAULT_WORKS: Work[] = [
  {
    id: 'w-synth-pop',
    title: '《合成器流行编曲工程》',
    tag: 'BILIBILI',
    cover: '',
    href: 'https://space.bilibili.com/622920233',
    duration: '03:24',
  },
  {
    id: 'w-kemono-rig',
    title: '《Kemono 3D 角色绑定展示》',
    tag: '3D RIGGING',
    cover: '',
    href: '',
    duration: '01:58',
  },
  {
    id: 'w-mix-master',
    title: '《混音母带前后对比》',
    tag: 'ORIGINAL MIX',
    cover: '/covers/diagnosis-diary.png',
    href: '',
    duration: '02:40',
  },
  {
    id: 'w-edm-short',
    title: '《高燃电子片段》',
    tag: 'DOUYIN',
    cover: '',
    href: 'https://www.douyin.com/user/MS4wLjABAAAAVV2pcc0Q08E7dZiNrrWVpglhJTrQwFUcelpeJS20x9FpNGPckARxWZHSyBZ5p48l',
    duration: '00:47',
  },
  {
    id: 'w-visual-sheet',
    title: '《视觉设定速写》',
    tag: 'RED 小红书',
    cover: '',
    href: 'https://www.xiaohongshu.com/user/profile/5e63321a0000000001007938',
    duration: '01:12',
  },
];

export type WorkDraft = Omit<Work, 'id'> & { id?: string };

function read(): Work[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FEATURED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Work[]) : null;
  } catch {
    return null;
  }
}

function write(list: Work[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FEATURED_KEY, JSON.stringify(list));
  } catch {
    /* 静默降级 */
  }
}

const makeId = () =>
  `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

interface FeaturedState {
  hydrated: boolean;
  works: Work[];
  hydrate: () => void;
  addWork: (draft: WorkDraft) => void;
  updateWork: (id: string, draft: Partial<WorkDraft>) => void;
  removeWork: (id: string) => void;
  resetWorks: () => void;
}

export const useFeatured = create<FeaturedState>((set, get) => ({
  hydrated: false,
  works: DEFAULT_WORKS,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = read();
    if (stored && stored.length > 0) {
      set({ works: stored, hydrated: true });
    } else {
      write(DEFAULT_WORKS);
      set({ works: DEFAULT_WORKS, hydrated: true });
    }
  },

  addWork: (draft) => {
    const work: Work = { ...draft, id: draft.id ?? makeId() };
    const works = [...get().works, work];
    write(works);
    set({ works });
  },

  updateWork: (id, draft) => {
    const works = get().works.map((w) => (w.id === id ? { ...w, ...draft, id: w.id } : w));
    write(works);
    set({ works });
  },

  removeWork: (id) => {
    const works = get().works.filter((w) => w.id !== id);
    write(works);
    set({ works });
  },

  resetWorks: () => {
    write(DEFAULT_WORKS);
    set({ works: DEFAULT_WORKS });
  },
}));
