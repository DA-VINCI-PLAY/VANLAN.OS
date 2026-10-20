'use client';

/**
 * KeplerCompass —— 星图罗盘控制栏（R67）
 *
 * 自由漫游 / 按星座筛选 / 随机摘星 / 摘星投稿 / 视野缩放 / 返回地表。
 * 移动端横向滚动，不换行、不挤成两排。
 */

import { useEffect, useRef, useState } from 'react';
import {
  groupStars,
  kpFX,
  useKeplerStars,
  useKeplerUI,
} from '@/lib/kepler';
import { chime, unlockAudio } from '@/lib/keplerAudio';

export default function KeplerCompass() {
  const stars = useKeplerStars((s) => s.stars);
  const filter = useKeplerUI((s) => s.filter);
  const setFilter = useKeplerUI((s) => s.setFilter);
  const select = useKeplerUI((s) => s.select);
  const setSubmitOpen = useKeplerUI((s) => s.setSubmitOpen);
  const setPhase = useKeplerUI((s) => s.setPhase);
  const phase = useKeplerUI((s) => s.phase);

  const groups = groupStars(stars);
  const [zoom, setZoom] = useState(1);
  const [openGroups, setOpenGroups] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  // 捏合缩放也会改 kpFX.zoom，这里慢速回读，保持滑块真实
  useEffect(() => {
    const t = window.setInterval(() => {
      setZoom((z) => (Math.abs(kpFX.zoom - z) > 0.03 ? kpFX.zoom : z));
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  const randomStar = () => {
    if (!stars.length) return;
    const s = stars[Math.floor(Math.random() * stars.length)];
    setFilter(null);
    select(s.id);
    chime(1046.5, 0.14);
  };

  return (
    <nav className="kp-compass" aria-label="星图罗盘" ref={wrapRef}>
      <button
        type="button"
        className={`kp-cbtn${!filter ? ' is-on' : ''}`}
        onClick={() => {
          setFilter(null);
          setOpenGroups(false);
        }}
      >
        <b>✦</b> 自由漫游
      </button>

      <div className={`kp-cdrop${openGroups ? ' is-open' : ''}`}>
        <button
          type="button"
          className={`kp-cbtn${filter ? ' is-on' : ''}`}
          onClick={() => setOpenGroups((v) => !v)}
          aria-expanded={openGroups}
        >
          <b>💿</b> {filter ?? '按星座筛选'}
        </button>
        <div className="kp-cmenu">
          <button type="button" onClick={() => { setFilter(null); setOpenGroups(false); }}>
            全部星座 <i>{stars.length}</i>
          </button>
          {groups.map((g) => (
            <button
              key={g.album}
              type="button"
              onClick={() => {
                setFilter(g.album);
                setOpenGroups(false);
              }}
            >
              {g.album} <i>{g.count}</i>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="kp-cbtn" onClick={randomStar}>
        <b>🔀</b> 随机摘星
      </button>

      <button
        type="button"
        className="kp-cbtn kp-cbtn-warm"
        onClick={() => {
          unlockAudio();
          select(null);
          setSubmitOpen(true);
        }}
      >
        <b>✦</b> 摘星投稿
      </button>

      <label className="kp-zoom">
        <span>视野</span>
        <input
          type="range"
          min={1}
          max={2.2}
          step={0.01}
          value={zoom}
          onChange={(e) => {
            const v = Number(e.target.value);
            setZoom(v);
            kpFX.zoom = v;
          }}
          aria-label="视野缩放"
        />
        <i>{zoom.toFixed(1)}×</i>
      </label>

      <button
        type="button"
        className="kp-cbtn kp-cbtn-exit"
        onClick={() => {
          if (phase === 'finale') setPhase('ink-out');
          else setPhase('finale');
        }}
      >
        <b>↑</b> 返回地表主页
      </button>
    </nav>
  );
}
