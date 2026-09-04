'use client';

import { useEffect, useRef, useState } from 'react';
import { useOS } from '@/lib/store';
import { ALBUMS } from '@/content/albums';

/**
 * 音频播放条（ALBUM 模式专用；R31 按用户反馈撤除常驻 mini 条）
 * - 仅 ALBUM 模式显示（桌面 / 大屏）；移动端播放控制与 Queue 在 ALBUM 面板内
 * - 桌面端底部居中浮条：play / pause / seek / volume / progress / time
 * - 音源优先级：track.src（单曲独立音源）→ album.preview（整专单文件）
 *   两者皆空时显示 ASSET PENDING，不会报错
 * - 面板点击曲目 → requestAutoplay() 递增 → 本组件自动播放当前曲目
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
  /** 单曲音源优先，无则回落到专辑整文件试听；两者皆空 → 不可播 */
  const src = track?.src || album.preview || '';
  const hasAudio = Boolean(src);

  // 切专辑 / 切曲目时复位（暂停、归零、清时长）
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

  // 音量
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
      className="pointer-events-auto fixed left-1/2 z-30 hidden -translate-x-1/2 rounded-xl border border-ink/12 bg-white/80 shadow-[0_14px_44px_rgba(17,17,17,0.08)] backdrop-blur-md xl:block"
      style={{
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        width: 'min(520px, calc(100vw - 480px))',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* 播放/暂停 */}
        <button
          onClick={toggle}
          disabled={!hasAudio}
          className={`flex h-8 w-8 shrink-0 items-center justify-center border text-[11px] transition-colors ${
            hasAudio
              ? 'border-ink/40 text-ink hover:border-ink hover:bg-ink hover:text-white'
              : 'cursor-not-allowed border-ink/15 text-ink/30'
          }`}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        {/* 曲目信息 + 进度 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[10px] tracking-[0.15em] text-ink">
              {String(currentTrack + 1).padStart(2, '0')} — {track?.title}
            </span>
            <span className="shrink-0 text-[9px] tracking-[0.1em] text-ink/45">
              {hasAudio ? `${fmt(time)} / ${fmt(duration)}` : 'ASSET PENDING'}
            </span>
          </div>
          <input
            type="range"
            className="os-range mt-1.5 w-full"
            min={0}
            max={duration || 100}
            step={0.1}
            value={time}
            disabled={!hasAudio}
            aria-label={
              hasAudio ? `Seek, ${fmt(time)} of ${fmt(duration)}` : 'Seek (no audio asset)'
            }
            onChange={(e) => seek(Number(e.target.value))}
          />
        </div>

        {/* 音量（移动端隐藏） */}
        <div className="hidden w-16 shrink-0 items-center gap-1.5 sm:flex">
          <span className="text-[9px] text-ink/45">VOL</span>
          <input
            type="range"
            className="os-range w-full"
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
