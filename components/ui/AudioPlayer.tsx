'use client';

import { useEffect, useRef, useState } from 'react';
import { useOS } from '@/lib/store';
import { ALBUMS } from '@/content/albums';

/**
 * 音频播放条（ALBUM 模式专用）
 * - 仅 ALBUM 模式 + xl 以上显示；移动端播放控制仍在 ALBUM 面板内
 * - R51 Tesla 风格：单层玻璃胶囊 / 红色进度 / 圆形主按钮 / 无阴影堆叠
 * - 音源优先级：track.src → album.preview → ASSET PENDING（不报错）
 * - 面板点击曲目 → requestAutoplay() 递增 → 自动播放
 * - 底栏安全间距沿用 --bottom-nav-height，任何导航尺寸下都不遮挡
 */

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer() {
  const mode = useOS((s) => s.mode);
  const activeAlbum = useOS((s) => s.activeAlbum);
  const currentTrack = useOS((s) => s.currentTrack);
  const autoplayNonce = useOS((s) => s.autoplayNonce);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const album = ALBUMS[activeAlbum];
  const track = album.tracks[currentTrack] ?? album.tracks[0];
  const src = track?.src || album.preview || '';
  const hasAudio = Boolean(src);
  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  // 切专辑 / 切曲目时复位
  useEffect(() => {
    const audio = audioRef.current;
    setPlaying(false);
    setTime(0);
    setDuration(0);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [activeAlbum, currentTrack]);

  // 点击曲目（requestAutoplay 递增）→ 播放当前 src
  useEffect(() => {
    if (autoplayNonce === 0) return;
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayNonce, src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false));
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (v: number) => {
    const audio = audioRef.current;
    if (!audio || !hasAudio || !isFinite(duration)) return;
    audio.currentTime = v;
    setTime(v);
  };

  if (mode !== 'ALBUM') return null;

  return (
    <div
      className="pointer-events-auto fixed left-1/2 z-30 hidden -translate-x-1/2 xl:block"
      style={{
        bottom:
          'calc(var(--bottom-nav-height) + 18px + env(safe-area-inset-bottom))',
        width: 'min(540px, calc(100vw - 520px))',
      }}
    >
      <div
        className="os-glass flex items-center gap-3.5 rounded-full px-2 py-2"
        style={{ borderRadius: 999 }}
      >
        {/* 主按钮：圆形，播放时红底 */}
        <button
          onClick={toggle}
          disabled={!hasAudio}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors ${
            !hasAudio
              ? 'cursor-not-allowed bg-white/[0.04] text-ink/25'
              : playing
                ? 'bg-[#E82127] text-white'
                : 'bg-white/10 text-ink hover:bg-white/20'
          }`}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        {/* 曲目 + 进度 */}
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[10px] font-medium tracking-[0.14em] text-ink/90">
              {String(currentTrack + 1).padStart(2, '0')} — {track?.title}
            </span>
            <span className="shrink-0 font-mono text-[9px] tabular-nums tracking-[0.06em] text-ink/40">
              {hasAudio ? `${fmt(time)} / ${fmt(duration)}` : 'ASSET PENDING'}
            </span>
          </div>

          {/* 自绘进度条：底层轨 + 红色已播 + 白色滑块 */}
          <div className="relative mt-1.5 h-3">
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[#E82127]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              className="os-range os-range-bare absolute inset-0 w-full"
              min={0}
              max={duration || 100}
              step={0.1}
              value={time}
              disabled={!hasAudio}
              aria-label={
                hasAudio
                  ? `Seek, ${fmt(time)} of ${fmt(duration)}`
                  : 'Seek (no audio asset)'
              }
              onChange={(e) => seek(Number(e.target.value))}
            />
          </div>
        </div>

        {/* 音量 */}
        <div className="hidden w-20 shrink-0 items-center gap-2 pr-2 sm:flex">
          <span className="text-[8px] tracking-[0.18em] text-ink/35">VOL</span>
          <input
            type="range"
            className="os-range os-range-bare w-full"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Volume"
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
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
    </div>
  );
}
