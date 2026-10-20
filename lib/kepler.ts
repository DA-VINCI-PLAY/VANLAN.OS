/**
 * kepler —— 「克卜勒」星图音乐故事集（R67）
 *
 * 三份数据各自独立：
 *   vanlan_kepler_stars  星体节点（歌曲 / 专辑 / 随笔碎片），后台可 CRUD
 *   vanlan_submissions   访客投稿，管理员可在后台「点亮」成真星星
 *   UI 相位              idle → ink-in → space → finale → ink-out → idle
 *
 * 3D 球面坐标 (theta, phi, radius) 在新增时自动分配（黄金角球面分布），
 * 保证后加进来的星星也能平均散开、不会挤在同一块天区。
 */

import { create } from 'zustand';
import { FORM_TOKEN, readNotifySettings } from './notify';

export const KEPLER_KEY = 'vanlan_kepler_stars';
export const SUBMISSION_KEY = 'vanlan_submissions';

/** 恒星-专辑 / 行星-单曲 / 流星-随笔碎片 */
export type StarKind = 'star' | 'planet' | 'meteor';

export const KIND_LABEL: Record<StarKind, string> = {
  star: '恒星 · 专辑',
  planet: '行星 · 单曲',
  meteor: '流星 · 碎片',
};

export const KIND_COLOR: Record<StarKind, string> = {
  star: '#DCEAFF',
  planet: '#9CC8FF',
  meteor: '#7FA8E8',
};

export const KIND_SIZE: Record<StarKind, number> = {
  star: 1,
  planet: 0.68,
  meteor: 0.46,
};

export interface KeplerStar {
  id: string;
  /** 歌曲 / 星星名 */
  name: string;
  /** 所属专辑 = 星座分组 */
  album: string;
  /** 悬浮在星旁的那句歌词 */
  lyric: string;
  /** 背后的故事 */
  story: string;
  /** 封面图 URL（空 = 程序化星轨封面） */
  cover: string;
  /** 音频 URL（空 = Web Audio 氛围八音盒兜底） */
  audio: string;
  kind: StarKind;
  /** 星体颜色，空 = 按 kind 取默认 */
  color: string;
  year: string;
  /** 身份标签：作词 / 作曲 / 编曲 / 混音 */
  roles: string;
  /** 球面坐标：经度（弧度） */
  theta: number;
  /** 球面坐标：纬度（弧度，-π/2 ~ π/2） */
  phi: number;
  /** 离球心距离（世界单位，1.2 ~ 2.6） */
  radius: number;
}

export type StarDraft = Omit<KeplerStar, 'id' | 'theta' | 'phi' | 'radius'> & {
  id?: string;
  theta?: number;
  phi?: number;
  radius?: number;
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** 黄金角球面分布：第 n 颗星落在哪片天区 */
export function autoOrbit(index: number): { theta: number; phi: number; radius: number } {
  const phi = Math.asin(Math.max(-1, Math.min(1, -1 + (2 * (index + 0.5)) / 12)));
  return {
    theta: (index * GOLDEN) % (Math.PI * 2),
    phi,
    radius: 1.75 + ((index * 37) % 7) * 0.06,
  };
}

/** 默认星群：诊疗日志 8 首 + 专辑恒星 + 克卜勒致敬恒星 */
export const DEFAULT_STARS: KeplerStar[] = [
  {
    id: 'kp-album',
    name: 'DIAGNOSIS DIARY',
    album: '诊疗日志',
    lyric: '写给反复来就诊的人。',
    story:
      '整张专辑是一间没有门牌号的诊室。八首歌是八次挂号，修普诺斯、自怜狂、弗里达小姐轮流坐诊。\n\n我把它们收进同一片天区，是想让这张唱片在星图上有一个可以回望的原点——后来所有的星，都是从这颗星长出来的。',
    cover: '/covers/diagnosis-diary.png',
    audio: '',
    kind: 'star',
    color: '#DCEAFF',
    year: '2026',
    roles: '作词 / 作曲 / 编曲 / 混音',
    theta: 0.42,
    phi: 0.18,
    radius: 1.32,
  },
  {
    id: 'kp-artforest',
    name: 'ARTFOREST',
    album: '诊疗日志',
    lyric: '我在森林里，练习不被听见地生长。',
    story:
      '开场曲。想做一段「还没有说出任何话」的声音，像走进树林前的那口气。\n\n鼓组一直压得很低，合成器的泛音在高处散开，像树冠漏下来的光。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/01-artforest.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '编曲 / 混音',
    theta: 0.95,
    phi: 0.46,
    radius: 1.92,
  },
  {
    id: 'kp-hypnos',
    name: '修普诺斯',
    album: '诊疗日志',
    lyric: '把灯关掉，让睡眠替我签名。',
    story:
      '修普诺斯是睡神。这首写给那些「清醒得太久」的夜晚。\n\n主歌只有人声和一台电钢，副歌才让低频涌进来——像终于允许自己沉下去。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/02-hypnos.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '作词 / 作曲 / 编曲',
    theta: 1.66,
    phi: -0.12,
    radius: 2.14,
  },
  {
    id: 'kp-selfpity',
    name: '自怜狂',
    album: '诊疗日志',
    lyric: '我爱我自己，爱到没有空隙。',
    story:
      '这首是整张里最不体面的一首，也是我最喜欢的一首。\n\n贝斯一直在重复同一个动机，像一句自我辩解说到第九遍，连自己都不信了。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/03-selfpity.mp3',
    kind: 'planet',
    color: '#6FA8FF',
    year: '2026',
    roles: '作词 / 作曲 / 编曲 / 混音',
    theta: 2.34,
    phi: 0.34,
    radius: 2.02,
  },
  {
    id: 'kp-frida',
    name: '弗里达小姐',
    album: '诊疗日志',
    lyric: '骨头里开花，才算真的活过。',
    story:
      '写这首的时候一直在看弗里达的画：身体被打开，里面是花。\n\n弦乐用了很多滑音，像疼的时候倒吸的那口气。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/04-frida.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '作曲 / 编曲',
    theta: 3.02,
    phi: -0.4,
    radius: 1.86,
  },
  {
    id: 'kp-flashback',
    name: '闪回',
    album: '诊疗日志',
    lyric: '一秒的旧画面，比一年还长。',
    story:
      '整首只有两分五十一秒，但结构被剪碎了：副歌提前出现，主歌在最后才补上。\n\n想模拟闪回本身的时序——它从来不讲顺序。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/05-flashback.mp3',
    kind: 'planet',
    color: '#6FA8FF',
    year: '2026',
    roles: '词曲 / 编曲',
    theta: 3.74,
    phi: 0.22,
    radius: 2.18,
  },
  {
    id: 'kp-alcohol',
    name: 'ALCOHOL',
    album: '诊疗日志',
    lyric: '清醒是种误会，醉了才敢诚实。',
    story:
      '节奏是摇晃的，故意让拍子站不太稳。\n\n录人声那晚只留了一盏台灯，气声全部保留，包括唱错的地方。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/06-alcohol.mp3',
    kind: 'planet',
    color: '#6FA8FF',
    year: '2026',
    roles: '词曲 / 编曲 / 混音',
    theta: 4.46,
    phi: -0.26,
    radius: 1.98,
  },
  {
    id: 'kp-sisyphus',
    name: '西西弗斯',
    album: '诊疗日志',
    lyric: '石头滚下来，我就再走一趟。',
    story:
      '最重的一首。副歌的鼓一层一层加上去，到最后也没有迎来释放的和弦。\n\n因为石头不会到顶，这本来就是重点。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/07-sisyphus.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '作曲 / 编曲',
    theta: 5.14,
    phi: 0.5,
    radius: 2.2,
  },
  {
    id: 'kp-paranoia',
    name: '臆想症',
    album: '诊疗日志',
    lyric: '门外的脚步声，我听了整夜。',
    story:
      '收尾曲，也是唯一一首在凌晨四点完成的。\n\n结尾没有收干净，留了半分钟的房间底噪——那张唱片到这里就该熄灯了。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/08-paranoia.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '词曲 / 编曲 / 混音',
    theta: 5.82,
    phi: -0.5,
    radius: 1.78,
  },
  {
    id: 'kp-kepler',
    name: '克卜勒',
    album: '克卜勒 · 致敬',
    lyric: '藏在众多孤星之中，还是找得到你。',
    story:
      '第一次听到这首歌是在一个很吵的晚上，那句词突然把所有噪音都按了静音。\n\n我把它放在星图最深的那片天区。不是因为我写过它，而是因为它先找到了我。',
    cover: '',
    audio: '',
    kind: 'star',
    color: '#FFFFFF',
    year: '致敬',
    roles: '翻唱 / 编曲',
    theta: 2.7,
    phi: 0.86,
    radius: 1.55,
  },
];

/* ---------------- 存储 ---------------- */
function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满 / 隐私模式：静默降级 */
  }
}

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;

interface StarState {
  hydrated: boolean;
  stars: KeplerStar[];
  hydrate: () => void;
  addStar: (draft: StarDraft) => KeplerStar;
  updateStar: (id: string, draft: Partial<StarDraft>) => void;
  removeStar: (id: string) => void;
  resetStars: () => void;
}

export const useKeplerStars = create<StarState>((set, get) => ({
  hydrated: false,
  stars: DEFAULT_STARS,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readJSON<KeplerStar[]>(KEPLER_KEY);
    if (Array.isArray(stored) && stored.length > 0) {
      // 兼容早期缺字段的存档
      const fixed = stored.map((s, i) => {
        const orbit = autoOrbit(i);
        return {
          ...s,
          kind: s.kind ?? 'planet',
          color: s.color ?? '',
          year: s.year ?? '',
          roles: s.roles ?? '',
          theta: typeof s.theta === 'number' ? s.theta : orbit.theta,
          phi: typeof s.phi === 'number' ? s.phi : orbit.phi,
          radius: typeof s.radius === 'number' ? s.radius : orbit.radius,
        } as KeplerStar;
      });
      set({ stars: fixed, hydrated: true });
    } else {
      writeJSON(KEPLER_KEY, DEFAULT_STARS);
      set({ stars: DEFAULT_STARS, hydrated: true });
    }
  },

  addStar: (draft) => {
    const list = get().stars;
    const orbit = autoOrbit(list.length);
    const star: KeplerStar = {
      ...draft,
      id: draft.id ?? makeId('kp'),
      theta: draft.theta ?? orbit.theta,
      phi: draft.phi ?? orbit.phi,
      radius: draft.radius ?? orbit.radius,
    };
    const stars = [...list, star];
    writeJSON(KEPLER_KEY, stars);
    set({ stars });
    return star;
  },

  updateStar: (id, draft) => {
    const stars = get().stars.map((s) =>
      s.id === id ? { ...s, ...draft, id: s.id } : s,
    );
    writeJSON(KEPLER_KEY, stars);
    set({ stars });
  },

  removeStar: (id) => {
    const stars = get().stars.filter((s) => s.id !== id);
    writeJSON(KEPLER_KEY, stars);
    set({ stars });
  },

  resetStars: () => {
    writeJSON(KEPLER_KEY, DEFAULT_STARS);
    set({ stars: DEFAULT_STARS });
  },
}));

/* ---------------- 投稿 ---------------- */
export type SubmissionKind = 'music' | 'lyric' | 'story';

export const SUBMISSION_KIND_LABEL: Record<SubmissionKind, string> = {
  music: '🎵 音乐 / Demo 合作',
  lyric: '✍️ 歌词 / 灵感共创',
  story: '💌 树洞故事 / 听歌记忆',
};

export interface Submission {
  id: string;
  /** 署名 / 星星代号 */
  name: string;
  kind: SubmissionKind;
  /** 核心金句（≤ 30 字） */
  lyric: string;
  /** 故事正文或作品链接 */
  story: string;
  /** 微信 / 邮箱 / QQ */
  contact: string;
  createdAt: string;
  /** 管理员点亮后写入的星体 id */
  litStarId?: string;
}

interface SubmissionState {
  hydrated: boolean;
  list: Submission[];
  hydrate: () => void;
  add: (draft: Omit<Submission, 'id' | 'createdAt'>) => Submission;
  remove: (id: string) => void;
  markLit: (id: string, starId: string) => void;
}

export const useSubmissions = create<SubmissionState>((set, get) => ({
  hydrated: false,
  list: [],

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readJSON<Submission[]>(SUBMISSION_KEY);
    set({ list: Array.isArray(stored) ? stored : [], hydrated: true });
  },

  add: (draft) => {
    const item: Submission = {
      ...draft,
      id: makeId('sub'),
      createdAt: new Date().toISOString(),
    };
    const list = [item, ...get().list];
    writeJSON(SUBMISSION_KEY, list);
    set({ list });
    return item;
  },

  remove: (id) => {
    const list = get().list.filter((s) => s.id !== id);
    writeJSON(SUBMISSION_KEY, list);
    set({ list });
  },

  markLit: (id, starId) => {
    const list = get().list.map((s) => (s.id === id ? { ...s, litStarId: starId } : s));
    writeJSON(SUBMISSION_KEY, list);
    set({ list });
  },
}));

/** 把投稿变成一颗公开星星（后台「一键点亮」用） */
export function submissionToStarDraft(sub: Submission): StarDraft {
  return {
    name: sub.name || '匿名旅人',
    album: '访客星座',
    lyric: sub.lyric,
    story: sub.story || '（这位访客只留下了一颗星，没有写故事。）',
    cover: '',
    audio: '',
    kind: 'meteor',
    color: '#DCE9FF',
    year: new Date(sub.createdAt).getFullYear().toString(),
    roles: SUBMISSION_KIND_LABEL[sub.kind] ?? '投稿',
  };
}

/** 投稿推送：FormSubmit 直发邮箱，失败不阻断（本地已经存了一份） */
export async function pushSubmission(sub: Submission): Promise<'ok' | 'fail'> {
  const settings = readNotifySettings();
  if (!settings.enabled) return 'fail';
  const endpoint = FORM_TOKEN
    ? `https://formsubmit.co/ajax/${FORM_TOKEN}`
    : `https://formsubmit.co/ajax/${encodeURIComponent(settings.primaryEmail)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `【克卜勒星空新投稿】来自 ${sub.name || '匿名旅人'}`,
        _template: 'table',
        _captcha: 'false',
        署名: sub.name || '匿名旅人',
        类型: SUBMISSION_KIND_LABEL[sub.kind],
        金句: sub.lyric,
        故事或链接: sub.story,
        联系方式: sub.contact,
        时间: new Date(sub.createdAt).toLocaleString('zh-CN', { hour12: false }),
      }),
    });
    return res.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

/* ---------------- UI 相位（不进 localStorage，纯运行时） ---------------- */
export type KeplerPhase = 'idle' | 'ink-in' | 'space' | 'finale' | 'ink-out';

interface KeplerUI {
  open: boolean;
  phase: KeplerPhase;
  /** 当前聚焦星体 */
  selectedId: string | null;
  /** 星座筛选（album 名，null = 全部） */
  filter: string | null;
  /** 投稿舱 */
  submitOpen: boolean;
  openKepler: (id?: string | null) => void;
  setPhase: (p: KeplerPhase) => void;
  select: (id: string | null) => void;
  setFilter: (album: string | null) => void;
  setSubmitOpen: (v: boolean) => void;
  close: () => void;
}

export const useKeplerUI = create<KeplerUI>((set) => ({
  open: false,
  phase: 'idle',
  selectedId: null,
  filter: null,
  submitOpen: false,

  openKepler: (id = null) =>
    set({ open: true, phase: 'ink-in', selectedId: id, submitOpen: false }),

  setPhase: (phase) => set({ phase }),
  select: (selectedId) => set({ selectedId }),
  setFilter: (filter) => set({ filter }),
  setSubmitOpen: (submitOpen) => set({ submitOpen }),

  close: () =>
    set({
      open: false,
      phase: 'idle',
      selectedId: null,
      submitOpen: false,
      filter: null,
    }),
}));

export const openKepler = (id?: string | null) => useKeplerUI.getState().openKepler(id);

/**
 * 每帧共享的可变量：只有渲染循环里读写，绝不触发 React。
 *   ink       黑墨覆盖进度 0~1
 *   converge  谢幕坍缩 0~1
 *   focus     聚焦星体的镜头推近 0~1
 */
export const kpFX = {
  ink: 0,
  converge: 0,
  focus: 0,
  /** 视野缩放 1 ~ 2.2（罗盘滑块 / 双指捏合同步） */
  zoom: 1,
};

/** 侧边导航用的星座分组（去重，保序） */
export function groupStars(stars: KeplerStar[]): { album: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of stars) map.set(s.album, (map.get(s.album) ?? 0) + 1);
  return Array.from(map, ([album, count]) => ({ album, count }));
}
