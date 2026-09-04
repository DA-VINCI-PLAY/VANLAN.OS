'use client';

import { useState } from 'react';
import { useOS, type Mode } from '@/lib/store';
import { ALBUMS } from '@/content/albums';
import { SOCIALS } from '@/content/social';
import { GALLERY } from '@/content/gallery';
import { IDENTITY } from '@/content/about';
import MobileContentSafeArea from './MobileContentSafeArea';
import PanelSwap from './PanelSwap';
import { QQ_WEB, qqAdd } from '@/lib/qq';

/**
 * Mode Content UI（Layer 3）
 * - 统一视觉语言：白/半透白、轻 Blur、细边框、小圆角、轻阴影、清晰等宽字
 * - 语义：外层 <section aria-labelledby>（由 MobileContentSafeArea 提供）
 * - 可访问：icon/短文本按钮均带 aria-label；非装饰文字对比度 ≥ 4.5:1 附近
 * - 桌面：右下信息面板；移动端：MobileContentSafeArea 统一锚定在
 *   BottomNavigation 上方（第七轮），永不进 Nav Zone
 * - 与 Floating Bubbles 分区：气泡走顶部弧线带，本面板不与其重叠
 */

const KBD =
  'border border-ink/20 px-2 py-1 text-[9px] tracking-[0.2em] text-ink/70 hover:border-ink hover:text-ink transition-colors bg-white/70';
const LABEL = 'text-[9px] tracking-[0.3em] text-ink/50';

/** 流媒体平台展示顺序与标签（过滤空值 / 旧占位 '#'） */
const STREAM_META: { key: string; label: string }[] = [
  { key: 'netease', label: 'NETEASE' },
  { key: 'kugou', label: 'KUGOU' },
  { key: 'qqMusic', label: 'QQ MUSIC' },
  { key: 'spotify', label: 'SPOTIFY' },
];

function StreamLinks({ links }: { links: Record<string, string | undefined> }) {
  const live = STREAM_META.filter(
    ({ key }) => links[key] && links[key] !== '#',
  );
  if (live.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {live.map(({ key, label }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Stream on ${label}`}
          className={`${KBD} touch-target uppercase`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

/* R32：每个模式独立 PanelSwap 层 —— 交叉切换时旧面板缩小退出
 *（panel-exit 0.34s）、新面板上浮进入（panel-enter 0.55s），同时进行。
 * 非激活层返回 null（退场动画期间 PanelSwap 内部保留快照）。 */
const PANEL_MODES: Exclude<Mode, 'HOME'>[] = [
  'GALLERY',
  'CONTACT',
  'ALBUM',
  'ABOUT',
];

export default function ModePanels() {
  const mode = useOS((s) => s.mode);

  return (
    <>
      {PANEL_MODES.map((m) => (
        <PanelSwap key={m} show={mode === m} z={30}>
          {mode === m && (
            <MobileContentSafeArea mode={m}>
              {m === 'GALLERY' && <GalleryPanel />}
              {m === 'CONTACT' && <ContactPanel />}
              {m === 'ALBUM' && <AlbumPanel />}
              {m === 'ABOUT' && <AboutPanel />}
            </MobileContentSafeArea>
          )}
        </PanelSwap>
      ))}
    </>
  );
}

/* ---------------- GALLERY（视觉作品展，Feature + Grid） ---------------- */
/** url='#' 时视为"占位草稿"，对外展示用 DRAFT 角标 + 隐藏开发者串 */
function galleryIsDraft(url: string): boolean {
  return !url || url === '#';
}
/** 把开发占位文案 / 仅 "Placeholder entry" 类串收成对外中性文字 */
function galleryDescription(raw: string, draft: boolean): string {
  if (!draft) return raw;
  if (/placeholder|replace in data/i.test(raw)) return '内容整理中';
  return raw;
}

function GalleryPanel() {
  if (GALLERY.length === 0) {
    return (
      <div className="rounded-xl border border-ink/10 bg-white/55 px-5 py-10 text-center">
        <div className="text-[9px] tracking-[0.3em] text-ink/55">GALLERY</div>
        <div className="mt-3 text-[12px] font-bold tracking-[0.12em] text-ink">
          NO WORKS YET
        </div>
        <div className="mt-2 text-[10px] leading-relaxed text-ink/55">
          内容整理中 · WORKS IN PROGRESS
        </div>
      </div>
    );
  }
  const [feature, ...rest] = GALLERY;
  const draft = galleryIsDraft(feature.url);

  return (
    <div className="space-y-3">
      {/* Feature Video 主卡 */}
      <a
        href={draft ? undefined : feature.url}
        target={draft ? undefined : '_blank'}
        rel="noopener noreferrer"
        aria-label={
          draft ? `${feature.title} — pending` : `Open featured video: ${feature.title}`
        }
        className={`block rounded-xl border border-ink/10 bg-white/60 p-4 transition-colors ${
          draft ? 'cursor-default' : 'hover:border-ink/40'
        }`}
      >
        <div className="flex items-center gap-1.5 text-[8px] tracking-[0.25em] text-ink/50">
          <span>FEATURE</span>
          <span className="text-ink/30">/</span>
          {draft ? (
            <span className="border border-ink/40 bg-white/80 px-1.5 py-px text-[7px] tracking-[0.22em] text-ink">
              DRAFT
            </span>
          ) : (
            <span>{feature.year}</span>
          )}
        </div>
        <div
          className={`mt-2 text-[12px] font-bold tracking-[0.12em] ${
            draft ? 'text-ink/55' : 'text-ink'
          }`}
        >
          {feature.title}
        </div>
        <div className="mt-1.5 text-[10px] leading-relaxed text-ink/55">
          {galleryDescription(feature.description, draft)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="border border-ink/20 px-1.5 py-0.5 text-[8px] tracking-[0.2em] text-ink/60">
            {feature.type.toUpperCase()}
          </span>
          <span
            className={`text-[9px] tracking-[0.2em] ${
              draft ? 'text-ink/45' : 'text-ink/70 underline-offset-2 hover:text-ink hover:underline'
            }`}
          >
            {draft ? 'PENDING' : 'OPEN →'}
          </span>
        </div>
      </a>

      {/* 其余视频：2 列小卡 */}
      <div className="grid grid-cols-2 gap-3">
        {rest.map((m) => {
          const mDraft = galleryIsDraft(m.url);
          return (
            <a
              key={m.id}
              href={mDraft ? undefined : m.url}
              target={mDraft ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={
                mDraft ? `${m.title} — pending` : `Open video: ${m.title}`
              }
              className={`group rounded-xl border border-ink/8 bg-white/45 p-3 transition-colors ${
                mDraft ? 'cursor-default' : 'hover:border-ink/35'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] tracking-[0.2em] text-ink/50">
                {mDraft ? (
                  <span className="border border-ink/40 bg-white/80 px-1.5 py-px text-[7px] tracking-[0.22em] text-ink">
                    DRAFT
                  </span>
                ) : (
                  <span>{m.year}</span>
                )}
              </div>
              <div
                className={`mt-1 line-clamp-2 text-[10px] font-semibold leading-snug tracking-[0.08em] ${
                  mDraft ? 'text-ink/55' : 'text-ink'
                }`}
              >
                {m.title}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[7px] tracking-[0.18em] text-ink/50">
                  {m.type.toUpperCase()}
                </span>
                <span
                  aria-hidden
                  className="text-[8px] text-ink/45 group-hover:text-ink/70"
                >
                  {mDraft ? '·' : '↗'}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- ALBUM（唱片档案 + 播放；原 ALBUM ∪ MUSIC）
 * 双版式（第七轮）：
 *   .os-album-desk   —— 桌面 / 平板右侧档案面板（配合 3D 封面轮播切换）
 *   .os-album-mobile —— 竖屏手机 / 矮横屏的垂直卡片：
 *       大 Cover（‹/› 切换）→ metadata → description → tracklist → stream
 *       整卡锚定在 BottomNavigation 上方，超高只滚卡片；切换动画 linear。
 * ---------------------------------------------------------------- */
function AlbumPanel() {
  const activeAlbum = useOS((s) => s.activeAlbum);
  const currentTrack = useOS((s) => s.currentTrack);
  const setCurrentTrack = useOS((s) => s.setCurrentTrack);
  const requestAutoplay = useOS((s) => s.requestAutoplay);
  const prevAlbum = useOS((s) => s.prevAlbum);
  const nextAlbum = useOS((s) => s.nextAlbum);
  const album = ALBUMS[activeAlbum];

  /** 点击曲目：选中 + 触发播放条立即播放该曲 */
  const pickTrack = (i: number) => {
    setCurrentTrack(i);
    requestAutoplay();
  };

  return (
    <>
      {/* ============ 桌面式档案面板 ============ */}
      <div className="os-album-desk">
        {/* Cover 区 */}
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink/10"
            style={{
              background: album.cover
                ? undefined
                : `linear-gradient(135deg, #fff 0%, ${album.accentColor}55 100%)`,
            }}
          >
            {album.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            <div
              className="absolute bottom-2 left-2 right-2 border-t border-ink/15 pt-1"
              style={{ height: 24 }}
            >
              <div className="text-[8px] font-bold tracking-[0.12em] text-ink/80">
                {album.vanlan.slice(0, 12)}
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className={LABEL}>ALBUM</div>
            <div className="mt-1 truncate text-[12px] font-bold tracking-[0.12em] text-ink">
              {album.vanlan}
            </div>
            <div className="mt-0.5 text-[9px] tracking-[0.2em] text-ink/55">
              {album.year} · DISC ARCHIVE
            </div>
          </div>
        </div>

        {/* 专辑描述 */}
        {album.description && (
          <p className="mt-4 rounded-lg border border-ink/8 bg-white/45 px-3 py-2.5 text-[10px] leading-relaxed text-ink/55">
            {album.description}
          </p>
        )}

        {/* Tracklist（点击 → 选曲并播放） */}
        <div className="mt-4">
          <div className={`${LABEL} mb-2`}>
            TRACKS — 点击选曲播放
          </div>
          <ul className="space-y-1">
            {album.tracks.map((t, i) => (
              <li key={t.title}>
                <button
                  type="button"
                  onClick={() => pickTrack(i)}
                  aria-pressed={i === currentTrack}
                  aria-label={`Play ${t.title}`}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors ${
                    i === currentTrack
                      ? 'bg-ink text-white'
                      : 'text-ink/60 hover:bg-ink/5'
                  }`}
                >
                  <span className="truncate text-[10px] tracking-[0.15em]">
                    {String(i + 1).padStart(2, '0')} — {t.title}
                  </span>
                  <span className="shrink-0 text-[9px] tracking-[0.1em] opacity-70">
                    {t.duration}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Streaming Links */}
        <div className="mt-4">
          <div className={`${LABEL} mb-2`}>STREAM</div>
          <StreamLinks links={album.streamingLinks} />
        </div>

        {ALBUMS.length > 1 && (
          <p className="mt-4 text-[8px] leading-relaxed tracking-[0.18em] text-ink/45">
            左右拖拽 / 滚轮切换专辑，方向键 ← → 亦可。
          </p>
        )}
      </div>
      <div className="os-album-mobile">
        <div key={activeAlbum} className="os-album-swap">
          {/* Cover 行：‹ cover › —— 多专辑时移动端切换方式（3D carousel 隐藏） */}
          <div
            className={`flex items-center gap-2 ${
              ALBUMS.length > 1 ? 'justify-between' : 'justify-center'
            }`}
          >
            {ALBUMS.length > 1 && (
              <button
                type="button"
                onClick={prevAlbum}
                aria-label="Previous album"
                className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/20 bg-white/70 text-[16px] text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                ‹
              </button>
            )}

            <div
              aria-hidden
              className="relative shrink-0 overflow-hidden border border-ink/12"
              style={{
                width: 'min(132px, 38vw)',
                aspectRatio: '1 / 1',
                background: album.cover
                  ? undefined
                  : `linear-gradient(135deg, #fff 0%, ${album.accentColor}59 100%)`,
              }}
            >
              {album.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.cover}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <span
                className="absolute left-2 top-2 h-[6px] w-4"
                style={{ background: album.accentColor }}
              />
              <div className="absolute inset-x-2 bottom-1.5 border-t border-ink/10 pt-1">
                <div className="truncate text-[7px] font-bold leading-tight tracking-[0.1em] text-ink/80">
                  {album.vanlan}
                </div>
                <div className="text-[6px] tracking-[0.18em] text-ink/50">
                  {album.year}
                </div>
              </div>
            </div>

            {ALBUMS.length > 1 && (
              <button
                type="button"
                onClick={nextAlbum}
                aria-label="Next album"
                className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/20 bg-white/70 text-[16px] text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                ›
              </button>
            )}
          </div>

          {/* metadata */}
          <div className="mt-3 text-center">
            <div className={LABEL}>ALBUM</div>
            <div className="mt-1 truncate text-[12px] font-bold tracking-[0.14em] text-ink">
              {album.vanlan}
            </div>
            <div className="mt-0.5 text-[9px] tracking-[0.2em] text-ink/55">
              {album.year} · DISC ARCHIVE
            </div>
          </div>

          {/* 描述 */}
          {album.description && (
            <p className="mt-2.5 line-clamp-2 rounded-lg border border-ink/8 bg-white/45 px-3 py-2 text-[9px] leading-relaxed text-ink/55">
              {album.description}
            </p>
          )}

          {/* Tracklist */}
          <div className="mt-3">
            <div className={`${LABEL} mb-1.5`}>
              TRACKS — 点击选曲播放
            </div>
            <ul className="space-y-1">
              {album.tracks.map((t, i) => (
                <li key={t.title}>
                  <button
                    type="button"
                    onClick={() => pickTrack(i)}
                    aria-pressed={i === currentTrack}
                    aria-label={`Play ${t.title}`}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors ${
                      i === currentTrack
                        ? 'bg-ink text-white'
                        : 'text-ink/60 hover:bg-ink/5'
                    }`}
                  >
                    <span className="truncate text-[10px] tracking-[0.15em]">
                      {String(i + 1).padStart(2, '0')} — {t.title}
                    </span>
                    <span className="shrink-0 text-[9px] tracking-[0.1em] opacity-70">
                      {t.duration}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Streaming Links */}
          <div className="mt-3">
            <div className={`${LABEL} mb-1.5`}>STREAM</div>
            <StreamLinks links={album.streamingLinks} />
          </div>

          {ALBUMS.length > 1 && (
            <p className="mt-3 text-[8px] leading-relaxed tracking-[0.18em] text-ink/45">
              ‹ › 切换专辑 · 点击曲目选曲
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- ABOUT（公众身份条；原个人履历时间线） ---------------- */
function AboutPanel() {
  /* 核心数字全部从 ALBUMS 推导：专辑数 / 曲目总数 / 流媒体平台数 */
  const albumCount = ALBUMS.length;
  const trackCount = ALBUMS.reduce((n, a) => n + a.tracks.length, 0);
  const platforms = new Set<string>();
  ALBUMS.forEach((a) =>
    Object.entries(a.streamingLinks).forEach(([k, v]) => {
      if (v && v !== '#') platforms.add(k);
    }),
  );

  const stats = [
    {
      value: String(albumCount),
      label: albumCount > 1 ? 'ALBUMS' : 'ALBUM',
    },
    {
      value: String(trackCount),
      label: trackCount > 1 ? 'TRACKS' : 'TRACK',
    },
    {
      value: String(platforms.size),
      label: platforms.size > 1 ? 'PLATFORMS' : 'PLATFORM',
    },
  ];

  return (
    <div className="space-y-3">
      {/* 名字主卡 */}
      <div className="rounded-lg border border-ink/10 bg-white/60 px-4 py-4">
        <div className="text-[22px] font-bold leading-none tracking-[0.08em] text-ink">
          {IDENTITY.name}
        </div>
        <div className="mt-2.5 text-[10px] tracking-[0.22em] text-ink/70">
          {IDENTITY.role}
        </div>
      </div>
      {/* 身份 / 地域标签 */}
      <div className="flex flex-wrap gap-1.5">
        {IDENTITY.tags.map((t) => (
          <span
            key={t}
            className="border border-ink/15 bg-white/50 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-ink/65"
          >
            {t}
          </span>
        ))}
      </div>
      {/* 核心数字（专辑 / 曲目 / 平台） */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-ink/10 bg-white/50 px-2 py-3 text-center"
          >
            <div className="text-[18px] font-bold leading-none text-ink">
              {s.value}
            </div>
            <div className="mt-1.5 text-[8px] tracking-[0.2em] text-ink/50">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- CONTACT（联系 + 社交渠道；原 CONTACT ∪ SOCIAL） ---------------- */
function ContactPanel() {
  const setQrPlatform = useOS((s) => s.setQrPlatform);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [wxBlocked, setWxBlocked] = useState(false);

  const flashCopied = (id: string) => {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1200);
  };

  const act = (id: string, action: string, value: string) => {
    if (action === 'link') window.open(value, '_blank', 'noopener');
    else if (action === 'qr') setQrPlatform(id);
    else if (action === 'copy') {
      navigator.clipboard?.writeText(value).catch(() => {});
      flashCopied(id);
    } else if (action === 'qq') {
      const r = qqAdd();
      if (!r.ok) {
        // 微信内置浏览器禁止 mqqapi/tencent 协议 → 复制号码并提示
        navigator.clipboard?.writeText(value).catch(() => {});
        setWxBlocked(true);
        window.setTimeout(() => setWxBlocked(false), 3200);
      }
    }
  };

  const actionLabel = (a: string) =>
    a === 'link'
      ? 'open link'
      : a === 'qr'
        ? 'show QR code'
        : a === 'copy'
          ? 'copy handle'
          : 'add QQ friend';

  const btnLabel = (a: string, id: string) =>
    a === 'link'
      ? 'OPEN'
      : a === 'qr'
        ? 'QR'
        : a === 'copy'
          ? copiedId === id
            ? 'COPIED'
            : 'COPY'
          : 'ADD';

  return (
    <div className="space-y-3">
      {/* EMAIL */}
      <div className="rounded-lg border border-ink/8 bg-white/50 px-3 py-2.5">
        <div className={LABEL}>EMAIL</div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              ?.writeText('jason901888@163.com')
              .catch(() => {});
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          aria-label="Copy email address"
          className="touch-target mt-1 text-[11px] tracking-[0.08em] text-ink underline-offset-2 hover:underline"
        >
          jason901888@163.com {copied ? '[COPIED]' : '[COPY]'}
        </button>
        <span role="status" className="sr-only">
          {copied ? 'Email address copied to clipboard' : ''}
        </span>
      </div>

      {/* 社交渠道全列表（WECHAT QR / QQ UA 自适配加好友 / 外链 / 复制） */}
      <div>
        <div className={`${LABEL} mb-1.5`}>CHANNELS</div>
        <ul className="space-y-1.5">
          {SOCIALS.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-ink/8 bg-white/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.2em] text-ink">
                    {s.platform}
                  </div>
                  <div className="mt-0.5 truncate text-[8px] tracking-[0.18em] text-ink/55">
                    {s.handle}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => act(s.id, s.action, s.value)}
                    aria-label={`${s.platform}: ${actionLabel(s.action)}`}
                    aria-live="polite"
                    className={`${KBD} touch-target ${
                      s.action === 'copy' && copiedId === s.id
                        ? 'border-ink/60 text-ink'
                        : ''
                    }`}
                  >
                    {btnLabel(s.action, s.id)}
                  </button>
                  {/* QQ 专属：wpa.qq.com 网页版备用入口（不唤起 APP） */}
                  {s.action === 'qq' && (
                    <a
                      href={QQ_WEB}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open QQ web chat (no app required)"
                      className={`${KBD} touch-target`}
                    >
                      WEB
                    </a>
                  )}
                </div>
              </div>
              {s.id === 'qq' && wxBlocked && (
                <div
                  role="status"
                  className="mt-1.5 text-[8px] leading-relaxed tracking-[0.12em] text-ink/60"
                >
                  QQ IS BLOCKED INSIDE WECHAT — NO. COPIED. OPEN THIS PAGE IN A
                  BROWSER.
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* LOCATION */}
      <div className="rounded-lg border border-ink/8 bg-white/50 px-3 py-2.5">
        <div className={LABEL}>LOCATION</div>
        <div className="mt-1 text-[11px] tracking-[0.1em] text-ink/70">
          GUANGDONG, CN
        </div>
      </div>
    </div>
  );
}
