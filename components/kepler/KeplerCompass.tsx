'use client';

/**
 * KeplerCompass —— 星图罗盘控制栏（R70）
 *
 * 只留四件事：投稿 / 列表 / 视野 / 返回。
 * 星座筛选那套已经拆掉 —— 星星就十来颗，与其筛选不如直接列出来。
 */

import { useEffect, useRef, useState } from 'react';
import {
  KIND_COLOR,
  groupStars,
  kpFX,
  useKeplerStars,
  useKeplerUI,
  type KeplerStar,
} from '@/lib/kepler';
import { chime, unlockAudio } from '@/lib/keplerAudio';

const colorOf = (s: KeplerStar) => s.color || KIND_COLOR[s.kind] || KIND_COLOR.planet;

export default function KeplerCompass() {
  const stars = useKeplerStars((s) => s.stars);
  const selectedId = useKeplerUI((s) => s.selectedId);
  const select = useKeplerUI((s) => s.select);
  const setSubmitOpen = useKeplerUI((s) => s.setSubmitOpen);
  const setPhase = useKeplerUI((s) => s.setPhase);
  const phase = useKeplerUI((s) => s.phase);

  const groups = groupStars(stars);
  const [zoom, setZoom] = useState(1);
  const [listOpen, setListOpen] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  // 捏合缩放也会改 kpFX.zoom，这里慢速回读，保持滑块真实
  useEffect(() => {
    const t = window.setInterval(() => {
      setZoom((z) => (Math.abs(kpFX.zoom - z) > 0.03 ? kpFX.zoom : z));
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  // 选中某颗星后列表自动收起（列表只是入口，不该挡着星空）
  useEffect(() => {
    if (selectedId) setListOpen(false);
  }, [selectedId]);

  return (
    <>
      {listOpen && (
        <div className="kp-list" role="dialog" aria-label="星体列表">
          <header className="kp-list-head">
            <span className="kp-list-kicker">ALL STARS</span>
            <b>全部星体 · {stars.length}</b>
            <button
              type="button"
              className="kp-list-close"
              onClick={() => setListOpen(false)}
              aria-label="关闭列表"
            >
              ✕
            </button>
          </header>
          <div className="kp-list-body">
            {groups.map((g) => (
              <section key={g.album} className="kp-list-group">
                <h4>
                  {g.album}
                  <i>{g.count}</i>
                </h4>
                {stars
                  .filter((s) => s.album === g.album)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={selectedId === s.id ? 'is-on' : ''}
                      style={{ '--star': colorOf(s) } as React.CSSProperties}
                      onClick={() => {
                        unlockAudio();
                        select(s.id);
                        setListOpen(false);
                        chime(523.25, 0.12);
                      }}
                    >
                      <span className="kp-list-dot" />
                      <span className="kp-list-name">{s.name}</span>
                      <span className="kp-list-meta">
                        {s.year || '——'} · {s.kind === 'star' ? 'PRIMARY' : 'SAT'}
                      </span>
                    </button>
                  ))}
              </section>
            ))}
          </div>
        </div>
      )}

      <nav className="kp-compass" aria-label="星图罗盘" ref={wrapRef}>
        <button
          type="button"
          className={`kp-cbtn${listOpen ? ' is-on' : ''}`}
          onClick={() => setListOpen((v) => !v)}
          aria-expanded={listOpen}
        >
          <b>☰</b> 列表
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
    </>
  );
}
