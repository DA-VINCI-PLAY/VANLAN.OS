import { create } from 'zustand';
import { ALBUMS } from '@/content/albums';
import { SITE } from '@/content/site';

export type Mode =
  | 'HOME'
  | 'GALLERY'
  | 'CONTACT'
  | 'ALBUM'
  | 'ABOUT';

/** 底部导航固定顺序：GALLERY CONTACT HOME ALBUM ABOUT（HOME 居中） */
export const MODES: Mode[] = [
  'GALLERY',
  'CONTACT',
  'HOME',
  'ALBUM',
  'ABOUT',
];

/** 渲染质量档（硬件检测决定初始值，FPS 监测只可向下自适应） */
export type Quality = 'high' | 'medium' | 'low';

/** 全局语言（R11 → R13）：en（英文，默认）/ zh（中文）
 *  实际 UI 文本：首页 VANLAN.OS 欢迎语（R11）+ 底部导航（R12）由 lang 驱动；
 *  R13 起默认英文（用户偏好）。 */
export type Lang = 'en' | 'zh';

interface OSState {
  /** 当前房间模式 */
  mode: Mode;
  setMode: (m: Mode) => void;

  /** Album 模式当前专辑索引 */
  activeAlbum: number;
  setActiveAlbum: (i: number) => void;
  nextAlbum: () => void;
  prevAlbum: () => void;

  /** 当前播放曲目（对应专辑 tracklist 索引） */
  currentTrack: number;
  setCurrentTrack: (i: number) => void;

  /**
   * 播放意图信号：ALBUM 面板点击曲目时递增（真实音源在 AudioPlayer 组件内，
   * 经此跨组件触发"点击即播"。0 = 尚无意图）
   */
  autoplayNonce: number;
  requestAutoplay: () => void;

  /** 微信二维码弹窗（platform 名称，null 关闭） */
  qrPlatform: string | null;
  setQrPlatform: (v: string | null) => void;

  /** 3D 场景加载完成 */
  loaded: boolean;
  setLoaded: (v: boolean) => void;

  /* ---------- 性能 / 可访问性（第五轮） ---------- */

  /** 渲染质量档：初始硬件检测，之后仅 FPS 监测向下调整（hysteresis） */
  quality: Quality;
  setQuality: (q: Quality) => void;

  /** WebGL 是否可用（mount 时探测；false → 2D fallback） */
  webglOK: boolean;
  setWebglOK: (v: boolean) => void;

  /** 用户手动 3D 开关；false → Lightweight 2D，即时生效无需刷新 */
  threeD: boolean;
  setThreeD: (v: boolean) => void;

  /** Reduced Motion（OS 偏好或用户手动开启） */
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  /** 3D 场景运行期崩溃（ErrorBoundary 捕获）→ 2D fallback，页面不白屏 */
  sceneFailed: boolean;
  setSceneFailed: (v: boolean) => void;

  /* ---------- R11 全局语言状态 ---------- */

  /** 全局语言（用户指令 §七·EN / 中文） */
  lang: Lang;
  setLang: (l: Lang) => void;
  /** 切换：zh ↔ en */
  toggleLang: () => void;

  /* ---------- R38 HOME 展台卡片 focus 模式 ---------- */

  /** HOME 展台卡片聚焦：true 时相机凑近展台看（HomeSlab 点击触发）。
   *  离开 HOME 时由 Experience/CameraController 自动复位 false。 */
  homeFocus: boolean;
  setHomeFocus: (v: boolean) => void;
  toggleHomeFocus: () => void;
}

export const useOS = create<OSState>((set, get) => ({
  mode: 'HOME',
  setMode: (m) => set({ mode: m }),

  activeAlbum: 0,
  setActiveAlbum: (i) => {
    const n = ALBUMS.length;
    const normalized = ((i % n) + n) % n;
    set({ activeAlbum: normalized, currentTrack: 0 });
  },
  nextAlbum: () => {
    const { activeAlbum, setActiveAlbum } = get();
    setActiveAlbum(activeAlbum + 1);
  },
  prevAlbum: () => {
    const { activeAlbum, setActiveAlbum } = get();
    setActiveAlbum(activeAlbum - 1);
  },

  currentTrack: 0,
  setCurrentTrack: (i) => set({ currentTrack: i }),

  autoplayNonce: 0,
  requestAutoplay: () =>
    set((s) => ({ autoplayNonce: s.autoplayNonce + 1 })),

  qrPlatform: null,
  setQrPlatform: (v) => set({ qrPlatform: v }),

  loaded: false,
  setLoaded: (v) => set({ loaded: v }),

  /* 性能初值：RenderRoot 在 mount 后立即用硬件检测覆盖 quality / webglOK */
  quality: 'medium',
  setQuality: (q) => set({ quality: q }),
  webglOK: true,
  setWebglOK: (v) => set({ webglOK: v }),
  threeD: true,
  setThreeD: (v) => set({ threeD: v }),
  reducedMotion: false,
  setReducedMotion: (v) => set({ reducedMotion: v }),
  sceneFailed: false,
  setSceneFailed: (v) => set({ sceneFailed: v }),

  /* R13 默认英文（用户偏好：默认英文模式） */
  lang: SITE.defaultLang,
  setLang: (l) => set({ lang: l }),
  toggleLang: () => set({ lang: get().lang === 'zh' ? 'en' : 'zh' }),

  /* R38 HOME focus 模式（默认关，HomeSlab 点击触发） */
  homeFocus: false,
  setHomeFocus: (v) => set({ homeFocus: v }),
  toggleHomeFocus: () => set((s) => ({ homeFocus: !s.homeFocus })),
}));