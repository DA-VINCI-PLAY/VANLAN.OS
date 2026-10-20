'use client';

/**
 * StageOverlay —— 前景分镜层（R52 / R55）
 *
 * 时间轴进入哪个 ACT，就渲染哪一块前景（R55 幕序：名片 → 工坊 → 专辑 → 片尾）：
 *   INTRO      名片 + 社交图标矩阵
 *   COMMISSION 接单工坊（复用 CommissionPanel，含下单表单）
 *   SOUND      内嵌试听器（波形 / 曲目 / 时间码）
 *   CREDITS    系统状态 + 语言切换 + 管理员终端入口
 *
 * 只在 act 变化时重渲染（subscribeAct → useState），拖动过程中不触发任何 React 更新。
 */

import { useEffect, useRef, useState } from 'react';
import {
  ACTS,
  type ActId,
  setProgress,
  subscribeAct,
  scrub,
} from '@/lib/opTimeline';
import { useOS } from '@/lib/store';
import { ALBUMS } from '@/content/albums';
import { IDENTITY } from '@/content/about';
import { SOCIALS } from '@/content/social';
import { qqAdd } from '@/lib/qq';
import BrandIcon from '@/components/op/BrandIcon';
import CommissionPanel from '@/components/ui/CommissionPanel';

/** 跳到指定幕的起始位置 */
const gotoAct = (id: ActId) =>
  setProgress((ACTS.find((a) => a.id === id) ?? ACTS[0]).startP + 0.001);

/** 曲目用的 mm:ss（时间轴那套 00:00:00 是 90 秒总长的归一化时间码） */
const fmt = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

/* 自媒体矩阵：平台 + 内容定位标签（顺序即卡片顺序） */
const MEDIA_CHANNELS: { id: string; tags: string }[] = [
  { id: 'douyin', tags: '高燃片段 / 电子音乐' },
  { id: 'bilibili', tags: '编曲工程 / MV / 混音幕后' },
  { id: 'xiaohongshu', tags: '3D 建模 / 视觉设定' },
  { id: 'youtube', tags: '完整作品 / LIVE SET' },
  { id: 'x', tags: '日常 / 即兴' },
  { id: 'instagram', tags: '视觉碎片 / 幕后' },
  { id: 'threads', tags: '随想 / 更新' },
];

/* 首屏社交矩阵：固定 7 项，与内容源解耦 */
const CHIP_IDS = [
  'douyin',
  'bilibili',
  'xiaohongshu',
  'x',
  'instagram',
  'threads',
  'youtube',
];

export default function StageOverlay() {
  const [act, setAct] = useState<ActId>(scrub.act);

  useEffect(() => {
    const off = subscribeAct((a) => setAct(a));
    return () => {
      off();
    };
  }, []);

  return (
    <div className="op-stage-layer">
      <div key={act} className="op-stage-shell" data-act={act}>
        {act === 'INTRO' && <IntroStage />}
        {act === 'SOUND' && <SoundStage />}
        {act === 'COMMISSION' && <CommissionStage />}
        {act === 'MEDIA' && <MediaStage />}
        {act === 'CREDITS' && <CreditsStage />}
      </div>
    </div>
  );
}

/* ============ ACT 01 · 名片 ============ */
function IntroStage() {
  const lang = useOS((s) => s.lang);
  const [copied, setCopied] = useState<string | null>(null);
  const tags = IDENTITY.role
    .split('·')
    .map((t) => t.trim())
    .filter(Boolean);

  const chips = CHIP_IDS.map((id) => SOCIALS.find((s) => s.id === id)).filter(
    (s): s is (typeof SOCIALS)[number] => Boolean(s),
  );
  const qq = SOCIALS.find((s) => s.id === 'qq');
  const email = SOCIALS.find((s) => s.id === 'email');

  const copy = (value: string, id: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const fire = (s: (typeof SOCIALS)[number]) => {
    if (s.action === 'link') window.open(s.value, '_blank', 'noopener');
    else if (s.action === 'qq') qqAdd();
    else if (s.action === 'qr') copy(s.value, s.id);
    else copy(s.value, s.id);
  };

  return (
    <section className="op-panel op-panel-intro" aria-label="个人名片">
      <header className="op-card-head">
        <div className="op-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/avatar.png" alt="VANLAN avatar" />
          <span className="op-avatar-ring" />
        </div>
        <div className="op-card-id">
          <div className="op-name">{IDENTITY.name}</div>
          <div className="op-role">{tags.join(' · ')}</div>
        </div>
        <span className="op-status">
          <i />
          {lang === 'zh' ? '开放合作' : 'OPEN'}
        </span>
      </header>

      <p className="op-card-line">
        {lang === 'zh'
          ? '编曲 / 混音 / 3D 角色 / 交互视觉。把想法做成能听、能看、能玩的东西。'
          : 'Composition, mixing, 3D characters and interactive visuals — making ideas audible and playable.'}
      </p>

      {/* 联系直达：图标 + 精简文字 */}
      <div className="op-contact-row">
        {qq && (
          <button type="button" onClick={() => fire(qq)} className="op-contact-btn">
            <svg viewBox="0 0 24 24" className="op-cicon" aria-hidden>
              {/* QQ 企鹅：身形 + 白肚 + 橙围巾 */}
              <path
                d="M12 2.8c-3.4 0-5.7 2.9-5.7 7 0 2.3.4 4.5 1.3 6.3l-1.2 3 2.7-.9c.9.5 1.9.8 2.9.8s2-.3 2.9-.8l2.7.9-1.2-3c.9-1.8 1.3-4 1.3-6.3 0-4.1-2.3-7-5.7-7Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M12 8.1c-1.9 0-3.1 2-3.1 4.7 0 2.4 1.2 4 3.1 4s3.1-1.6 3.1-4c0-2.7-1.2-4.7-3.1-4.7Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <circle cx="9.9" cy="6.5" r="0.7" fill="currentColor" stroke="none" />
              <circle cx="14.1" cy="6.5" r="0.7" fill="currentColor" stroke="none" />
              <path
                d="M9.2 9.7c.9.6 1.8 1 2.8 1s1.9-.4 2.8-1"
                fill="none"
                stroke="#f35a17"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <b>{qq.value}</b>
            <em>ADD</em>
          </button>
        )}
        {email && (
          <button
            type="button"
            onClick={() => copy(email.value, email.id)}
            className="op-contact-btn"
          >
            <svg viewBox="0 0 24 24" className="op-cicon" aria-hidden>
              <rect
                x="3.5"
                y="5.5"
                width="17"
                height="13"
                rx="2.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="m4.5 7.5 7.5 5.5 7.5-5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <b>{copied === email.id ? 'COPIED' : 'EMAIL'}</b>
            <em>COPY</em>
          </button>
        )}
      </div>

      {/* 社交矩阵：纯图标，hover/无障碍由 title 与 aria-label 兼底 */}
      <div className="op-chips">
        {chips.map((s) => (
          <a
            key={s.id}
            href={s.action === 'link' ? s.value : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (s.action !== 'link') {
                e.preventDefault();
                fire(s);
              }
            }}
            className="op-chip"
            title={s.platform}
            aria-label={s.platform}
          >
            <BrandIcon id={s.id} />
          </a>
        ))}
      </div>

      <div className="op-card-foot">
        <span>SCROLL / DRAG →</span>
        <button type="button" onClick={() => gotoAct('COMMISSION')}>
          工坊 →
        </button>
      </div>
    </section>
  );
}

/* ============ ACT 03 · 专辑试听 ============ */
function SoundStage() {
  const [albumIdx, setAlbumIdx] = useState(0);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const album = ALBUMS[albumIdx];
  const track = album.tracks[trackIdx] ?? album.tracks[0];
  const src = track?.src || album.preview || '';
  const hasAudio = Boolean(src);
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  // 换曲复位
  useEffect(() => {
    const a = audioRef.current;
    setPlaying(false);
    setTime(0);
    setDuration(0);
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }, [albumIdx, trackIdx]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !hasAudio) return;
    if (a.paused) {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const selectAlbum = (i: number) => {
    setAlbumIdx(i);
    setTrackIdx(0);
  };

  return (
    <section className="op-panel op-panel-sound" aria-label="作品试听">
      <header className="op-snd-head">
        <div>
          <div className="op-kicker">NOW PLAYING</div>
          <h2 className="op-snd-title">{track?.title ?? '—'}</h2>
          <div className="op-snd-album">
            {album.vanlan}
            {album.zhName ? ` · ${album.zhName}` : ''} · {album.year}
          </div>
        </div>
        <div className="op-snd-time">
          {hasAudio ? `${fmt(time)} / ${fmt(duration)}` : 'ASSET PENDING'}
        </div>
      </header>

      {/* 波形（进度填充） */}
      <div className="op-wave" aria-hidden>
        {Array.from({ length: 56 }).map((_, i) => {
          const h = 18 + ((i * 37) % 71);
          const on = (i / 56) * 100 <= pct;
          return (
            <i
              key={i}
              className={on ? 'is-on' : ''}
              style={{ height: `${h}%`, ['--i' as string]: i }}
            />
          );
        })}
      </div>

      <div className="op-snd-controls">
        <button
          type="button"
          className="op-play"
          onClick={toggle}
          disabled={!hasAudio}
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="op-snd-track-line">
          <div className="op-snd-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="op-snd-nums">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
          <input
            type="range"
            className="os-range os-range-bare op-snd-seek"
            min={0}
            max={duration || 100}
            step={0.1}
            value={time}
            disabled={!hasAudio}
            aria-label="进度"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = v;
              setTime(v);
            }}
          />
        </div>
      </div>

      {/* 专辑 / 曲目 */}
      <div className="op-snd-body">
        <div className="op-albums">
          {ALBUMS.map((a, i) => (
            <button
              key={a.vanlan}
              type="button"
              onClick={() => selectAlbum(i)}
              className={i === albumIdx ? 'is-active' : ''}
              aria-pressed={i === albumIdx}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {a.vanlan}
            </button>
          ))}
        </div>

        <ol className="op-tracks">
          {album.tracks.map((t, i) => (
            <li key={t.title}>
              <button
                type="button"
                onClick={() => setTrackIdx(i)}
                className={i === trackIdx ? 'is-active' : ''}
                aria-current={i === trackIdx}
              >
                <span className="op-track-no">{String(i + 1).padStart(2, '0')}</span>
                <span className="op-track-name">{t.title}</span>
                <span className="op-track-dur">{t.duration}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="op-card-foot">
        <span>{album.description.slice(0, 34)}…</span>
        <button type="button" onClick={() => gotoAct('MEDIA')}>
          矩阵 →
        </button>
      </div>

      {hasAudio && (
        <audio
          ref={audioRef}
          key={src}
          src={src}
          preload="metadata"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
          onError={() => setPlaying(false)}
        />
      )}
    </section>
  );
}

/* ============ ACT 02 · 接单工坊 ============ */
function CommissionStage() {
  return (
    <section className="op-panel op-panel-store" aria-label="定制接单">
      <div className="op-store-head">
        <div>
          <div className="op-kicker">COMMISSION // 工坊</div>
          <h2 className="op-store-title">定制合作</h2>
          <div className="op-store-sub">填写需求信息，我将尽快与您取得联系</div>
        </div>
        <span className="op-store-badge">OPEN</span>
      </div>
      <div className="op-store-body os-scroll" data-scroll>
        <CommissionPanel />
      </div>
      <div className="op-card-foot">
        <span className="op-foot-note">COMPOSITION · MIXING · 3D · CUSTOM</span>
        <button type="button" onClick={() => gotoAct('SOUND')}>
          专辑 →
        </button>
      </div>
    </section>
  );
}

/* ============ ACT 04 · 自媒体矩阵 ============ */
function MediaStage() {
  const lang = useOS((s) => s.lang);

  const channels = MEDIA_CHANNELS.flatMap(({ id, tags }) => {
    const s = SOCIALS.find((x) => x.id === id);
    return s ? [{ entry: s, tags }] : [];
  });

  return (
    <section className="op-panel op-panel-media" aria-label="自媒体矩阵">
      <div className="op-store-head">
        <div>
          <div className="op-kicker">MEDIA MATRIX // INFO CARD</div>
          <h2 className="op-store-title">{lang === 'zh' ? '自媒体矩阵' : 'Channels'}</h2>
        </div>
        <span className="op-store-badge">{channels.length} CH</span>
      </div>

      <div className="op-store-body os-scroll" data-scroll>
        <div className="op-media-grid">
          {channels.map(({ entry, tags }) => (
            <a
              key={entry.id}
              href={entry.value}
              target="_blank"
              rel="noopener noreferrer"
              className="op-media-card"
              title={`${entry.platform} · ${entry.handle}`}
            >
              <span className="op-media-ico">
                <BrandIcon id={entry.id} size={20} />
              </span>
              <span className="op-media-body">
                <b>{entry.platform}</b>
                <i>{entry.handle}</i>
                <em>{tags}</em>
              </span>
              <span className="op-media-go" aria-hidden>
                ↗
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="op-card-foot">
        <span className="op-foot-note">DOUYIN · BILIBILI · RED · YT · X · IG · THREADS</span>
        <button type="button" onClick={() => gotoAct('CREDITS')}>
          片尾 →
        </button>
      </div>
    </section>
  );
}

/* ============ ACT 05 · 职员表 / 系统 ============ */
function CreditsStage() {
  const lang = useOS((s) => s.lang);
  const setLang = useOS((s) => s.setLang);
  const setAdminOpen = useOS((s) => s.setAdminOpen);
  const unlocked = useOS((s) => s.adminUnlocked);

  return (
    <section className="op-panel op-panel-credits" aria-label="系统与职员表">
      <div className="op-kicker">END CARD // SYSTEM</div>
      <h2 className="op-credits-title">
        {lang === 'zh' ? '到这里，先谢幕。' : 'That’s a wrap.'}
      </h2>

      <ul className="op-sys-rows">
        <li>
          <span>SYS</span>
          <b className="is-live">
            <i />
            ONLINE
          </b>
        </li>
        <li>
          <span>ACT</span>
          <b>{scrub.act}</b>
        </li>
        <li>
          <span>BUILD</span>
          <b>R55 · 2D OP STAGE</b>
        </li>
      </ul>

      <div className="op-credit-actions">
        <div className="op-lang" role="group" aria-label="语言切换">
          <button
            type="button"
            className={lang === 'zh' ? 'is-active' : ''}
            onClick={() => setLang('zh')}
            aria-pressed={lang === 'zh'}
          >
            中文
          </button>
          <button
            type="button"
            className={lang === 'en' ? 'is-active' : ''}
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
          >
            EN
          </button>
          <span className="op-lang-hint">L</span>
        </div>

        <button
          type="button"
          className="op-admin-entry"
          onClick={() => setAdminOpen(true)}
        >
          SYS // ADMIN
          <i>{unlocked ? 'UNLOCKED' : 'LOCKED'}</i>
        </button>
      </div>

      <ul className="op-credits-list">
        <li>
          <span>DIRECTION / CODE</span>VANLAN
        </li>
        <li>
          <span>MUSIC / MIX</span>VANLAN
        </li>
        <li>
          <span>3D KEMONO HEAD</span>VANLAN
        </li>
        <li>
          <span>SPECIAL THANKS</span>YOU · {new Date().getFullYear()}
        </li>
      </ul>

      <div className="op-card-foot">
        <span>{lang === 'zh' ? '拖动时间轴可重看' : 'Scrub back to replay'}</span>
        <button type="button" onClick={() => setProgress(0.0005)}>
          REPLAY ↺
        </button>
      </div>
    </section>
  );
}
