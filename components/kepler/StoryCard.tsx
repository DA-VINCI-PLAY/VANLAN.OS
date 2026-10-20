'use client';

/**
 * StoryCard —— 黑金唱片故事卡（R67）
 *
 * 右侧毛玻璃卡：旋转星轨黑胶 + 环形进度 + 曲目信息 + 歌词 + 故事。
 * 有音频 URL 就走 <audio>；没有就用 Web Audio 的八音盒氛围兜底试听，
 * 两种模式共用同一套播放按钮与进度环。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useKeplerStars, useKeplerUI } from '@/lib/kepler';
import { chime, startAmbient, unlockAudio } from '@/lib/keplerAudio';

const fmt = (sec: number) => {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** 没有封面时的程序化星轨封面 */
function StarCover({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return (
    <span
      className="kp-cover-fallback"
      style={{
        background: `radial-gradient(circle at 50% 50%, rgba(255,216,155,0.9) 0%, rgba(232,93,42,0.5) 22%, transparent 46%),
          conic-gradient(from ${h}deg, #07080d, #141018, #07080d, #1a1218, #07080d)`,
      }}
    >
      <i /><i /><i />
    </span>
  );
}

export default function StoryCard() {
  const stars = useKeplerStars((s) => s.stars);
  const selectedId = useKeplerUI((s) => s.selectedId);
  const select = useKeplerUI((s) => s.select);

  const star = useMemo(
    () => stars.find((s) => s.id === selectedId) ?? null,
    [stars, selectedId],
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const ambientRef = useRef<{ stop: () => void } | null>(null);
  const fakeTimer = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(0);
  const [total, setTotal] = useState(0);
  const [muted, setMuted] = useState(false);
  /** 外链音源（Spotify 试听直链）拉不到时，退回合成试听，别让播放键变成死的 */
  const [broken, setBroken] = useState(false);

  const hasAudio = Boolean(star?.audio) && !broken;

  /* 换星 / 关卡片：全停 */
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setNow(0);
    setTotal(0);
    setBroken(false);
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    ambientRef.current?.stop();
    ambientRef.current = null;
    window.clearInterval(fakeTimer.current);
  }, [selectedId]);

  useEffect(
    () => () => {
      ambientRef.current?.stop();
      window.clearInterval(fakeTimer.current);
    },
    [],
  );

  const stopAll = () => {
    const a = audioRef.current;
    if (a) a.pause();
    ambientRef.current?.stop();
    ambientRef.current = null;
    window.clearInterval(fakeTimer.current);
    setPlaying(false);
  };

  const toggle = () => {
    if (!star) return;
    unlockAudio();
    if (playing) {
      stopAll();
      return;
    }
    chime(784, 0.1);
    if (hasAudio && audioRef.current) {
      void audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    // 氛围八音盒兜底
    if (!ambientRef.current) ambientRef.current = startAmbient();
    setPlaying(true);
    const t0 = performance.now();
    const dur = 48000;
    window.clearInterval(fakeTimer.current);
    fakeTimer.current = window.setInterval(() => {
      const t = ((performance.now() - t0) % dur) / 1000;
      setNow(t);
      setTotal(dur / 1000);
      setProgress(((performance.now() - t0) % dur) / dur);
    }, 250);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setProgress(p);
    const a = audioRef.current;
    if (a && hasAudio && isFinite(a.duration)) {
      a.currentTime = p * a.duration;
      setNow(a.currentTime);
    } else if (!hasAudio) {
      setNow(p * (total || 48));
    }
  };

  const goNext = () => {
    if (!star) return;
    const i = stars.findIndex((s) => s.id === star.id);
    const next = stars[(i + 1) % stars.length];
    if (next) select(next.id);
  };

  const paragraphs = (star?.story || '').split(/\n{2,}/).filter(Boolean);

  return (
    <aside
      className={`kp-card${star ? ' is-open' : ''}`}
      aria-hidden={!star}
      aria-label="克卜勒音乐故事卡"
    >
      {star && (
        <>
          <div className="kp-card-top">
            <span className="kp-card-kicker">
              KEPLER // {star.kind === 'star' ? 'PRIMARY STAR' : 'SATELLITE'}
            </span>
            <button
              type="button"
              className="kp-card-close"
              onClick={() => {
                stopAll();
                select(null);
              }}
              aria-label="收起故事卡"
            >
              ✕
            </button>
          </div>

          <div className="kp-vinyl-wrap">
            <div
              className="kp-vinyl"
              data-playing={playing}
              style={{ ['--ring-p' as string]: progress } as React.CSSProperties}
            >
              <svg className="kp-vinyl-ring" viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r="56" className="kp-vinyl-track" />
                <circle
                  cx="60"
                  cy="60"
                  r="56"
                  className="kp-vinyl-progress"
                  style={{
                    strokeDasharray: 2 * Math.PI * 56,
                    strokeDashoffset: 2 * Math.PI * 56 * (1 - progress),
                  }}
                />
              </svg>
              <div className="kp-vinyl-disc">
                {star.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={star.cover} alt={`${star.name} 封面`} />
                ) : (
                  <StarCover seed={star.id} />
                )}
                <span className="kp-vinyl-hole" />
              </div>
            </div>

            <div className="kp-track-meta">
              <span className="kp-track-album">{star.album}</span>
              <h3 className="kp-track-name">{star.name}</h3>
              <span className="kp-track-sub">
                {star.year || '——'} · {star.roles || 'VANLAN'}
              </span>
              {star.spotify && (
                <a
                  className="kp-spotify-link"
                  href={`https://open.spotify.com/track/${star.spotify}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  在 Spotify 打开 ↗
                </a>
              )}
            </div>
          </div>

          {star.lyric && (
            <blockquote className="kp-lyric">
              <span>「</span>
              {star.lyric}
              <span>」</span>
            </blockquote>
          )}

          <div className="kp-card-body" data-scroll>
            <div className="kp-section-label">MY STORY · 关于这首歌</div>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="kp-player">
            <audio
              ref={audioRef}
              src={star.audio || undefined}
              preload="metadata"
              onTimeUpdate={(e) => {
                const a = e.currentTarget;
                if (!isFinite(a.duration) || a.duration <= 0) return;
                setNow(a.currentTime);
                setTotal(a.duration);
                setProgress(a.currentTime / a.duration);
              }}
              onEnded={() => {
                setPlaying(false);
                setProgress(0);
              }}
              onError={() => {
                setBroken(true);
                setPlaying(false);
              }}
              muted={muted}
            />

            <button
              type="button"
              className="kp-play"
              onClick={toggle}
              aria-label={playing ? '暂停' : '播放'}
            >
              {playing ? (
                <span className="kp-ico-pause">
                  <i />
                  <i />
                </span>
              ) : (
                <span className="kp-ico-play" />
              )}
            </button>

            <div className="kp-player-main">
              <div
                className="kp-seek"
                onClick={seek}
                role="slider"
                tabIndex={0}
                aria-label="播放进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const a = audioRef.current;
                    const d = e.key === 'ArrowRight' ? 5 : -5;
                    if (a && hasAudio) a.currentTime = Math.max(0, a.currentTime + d);
                  }
                }}
              >
                <i style={{ transform: `scaleX(${progress})` }} />
                <b style={{ left: `${progress * 100}%` }} />
              </div>
              <div className="kp-player-row">
                <span>
                  {fmt(now)} / {fmt(total)}
                </span>
                <span className="kp-player-mode">
                  {hasAudio ? 'AUDIO FILE' : 'SYNTH AMBIENT'}
                  {hasAudio && (
                    <button
                      type="button"
                      className="kp-mute"
                      onClick={() => setMuted((m) => !m)}
                      aria-label={muted ? '取消静音' : '静音'}
                    >
                      {muted ? 'UNMUTE' : 'MUTE'}
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="kp-card-foot">
            <span className="kp-foot-hint">
              {hasAudio
                ? star?.spotify
                  ? 'Spotify 试听 · 30 秒'
                  : '真实音源'
                : broken
                  ? '外链音源连不上 · 已切合成试听'
                  : '未填音频 · 已启用合成试听'}
            </span>
            <button type="button" className="kp-next" onClick={goNext}>
              下一颗星 ➔
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
