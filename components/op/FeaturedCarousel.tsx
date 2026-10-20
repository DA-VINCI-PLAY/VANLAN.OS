'use client';

/**
 * FeaturedCarousel —— 首屏 · 穿插式作品轮播带（R61）
 *
 * 位置：左侧主标题下方（58% ~ 76% 高度区），左缘与 VANLAN / 副标题同一基准线；
 * 层级：15 —— 高于 2D 背景与大字（9），低于 3D 兽头（20），右缘用 mask 羽化，
 *      卡片滑到兽头背后自然消隐，形成 2.5D 穿插。
 *
 * 轮播：桌面 rAF 匀速左移（hover 暂停 / 可手动切换）；移动端原生横向滚动 + snap。
 * 仅在 ACT01 显示，切幕淡出，避免与工坊/专辑面板打架。
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFeatured, type Work } from '@/lib/featured';
import { type ActId, scrub, subscribeAct } from '@/lib/opTimeline';

const TAG_ICON: Record<string, string> = {
  BILIBILI: 'bilibili',
  DOUYIN: 'douyin',
  RED: 'xiaohongshu',
  'RED 小红书': 'xiaohongshu',
  YOUTUBE: 'youtube',
  X: 'x',
  INSTAGRAM: 'instagram',
};

function CoverArt({ work, index }: { work: Work; index: number }) {
  if (work.cover) {
    return (
      <span
        className="fc-cover"
        style={{ backgroundImage: `url(${work.cover})` }}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={`fc-cover fc-cover-g${(index % 5) + 1}`}
      aria-hidden
    >
      <b>{String(index + 1).padStart(2, '0')}</b>
      <i />
    </span>
  );
}

export default function FeaturedCarousel() {
  const hydrate = useFeatured((s) => s.hydrate);
  const works = useFeatured((s) => s.works);

  const [act, setAct] = useState<ActId>(scrub.act);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [preview, setPreview] = useState<Work | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const trackRef = useRef<HTMLDivElement>(null);
  const marquee = useRef<{ nudge: (dir: number) => void } | null>(null);
  const pausedRef = useRef(false);
  const hoverRef = useRef(false);

  pausedRef.current = paused;
  hoverRef.current = hovered;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const off = subscribeAct((a) => setAct(a));
    return () => {
      off();
    };
  }, []);

  // 预览弹窗 ESC 关闭
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const active = act === 'INTRO';

  useEffect(() => {
    if (!active || works.length === 0) return;
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia('(max-width: 767px)').matches) return;

    let raf = 0;
    let last = performance.now();
    let offset = 0;
    let target = 0;
    const speed = 26; // px / s

    const loopWidth = () => track.scrollWidth / 2;

    marquee.current = {
      nudge: (dir) => {
        target += dir * 224;
      },
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !hoverRef.current) target += speed * dt;
      offset += (target - offset) * Math.min(1, dt * 9);
      const loop = loopWidth();
      if (loop > 0) {
        while (offset >= loop) {
          offset -= loop;
          target -= loop;
        }
        while (offset < 0) {
          offset += loop;
          target += loop;
        }
      }
      track.style.transform = `translate3d(${-offset.toFixed(2)}px, 0, 0)`;
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      marquee.current = null;
      track.style.transform = '';
    };
  }, [active, works]);

  const open = (w: Work) => {
    if (w.href) {
      window.open(w.href, '_blank', 'noopener');
      return;
    }
    setPreview(w);
  };

  const cards = works.length > 0 && !narrow ? [...works, ...works] : works;

  return (
    <section
      className="fc-root"
      data-on={active}
      aria-label="精选视频与作品"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <header className="fc-head">
        <span className="fc-kicker">FEATURED WORKS</span>
        <span className="fc-kicker-sub">// 精选视频与作品</span>
        <span className="fc-head-bar" />
        <button
          type="button"
          className="fc-arrow"
          aria-label="上一张"
          onClick={() => marquee.current?.nudge(1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="fc-arrow"
          aria-label="下一张"
          onClick={() => marquee.current?.nudge(-1)}
        >
          ›
        </button>
        <button
          type="button"
          className="fc-dot"
          aria-label={paused ? '继续轮播' : '暂停轮播'}
          aria-pressed={paused}
          onClick={() => setPaused((v) => !v)}
        >
          <i />
        </button>
      </header>

      <div className="fc-viewport">
        <div ref={trackRef} className="fc-track" data-paused={paused}>
          {cards.map((w, i) => (
            <button
              key={`${w.id}-${i}`}
              type="button"
              className="fc-card"
              onClick={() => open(w)}
              aria-label={`${w.title} · ${w.tag}`}
            >
              <CoverArt work={w} index={i % Math.max(works.length, 1)} />
              <span className="fc-tag">
                {TAG_ICON[w.tag] ? <span className="fc-tag-dot" /> : null}
                {w.tag}
              </span>
              <span className="fc-play" aria-hidden>
                ▶
              </span>
              <span className="fc-meta">
                <b>{w.title}</b>
                <i>{w.duration}</i>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* portal 到 body：逃出 .fc-root（z15）的层叠上下文，否则会被 3D 画布（z20）盖住 */}
      {preview &&
        createPortal(
          <div
            className="fc-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={preview.title}
            onClick={() => setPreview(null)}
          >
            <div className="fc-box" onClick={(e) => e.stopPropagation()}>
              <div className="fc-box-cover">
                <CoverArt work={preview} index={0} />
                <span className="fc-play is-large" aria-hidden>
                  ▶
                </span>
              </div>
              <div className="fc-box-foot">
                <div>
                  <div className="fc-kicker">{preview.tag}</div>
                  <div className="fc-box-title">{preview.title}</div>
                </div>
                <button
                  type="button"
                  className="fc-close"
                  aria-label="关闭预览"
                  onClick={() => setPreview(null)}
                >
                  ✕
                </button>
              </div>
              <p className="fc-box-note">
                该作品尚未配置外链。可在管理员后台「首屏轮播」里补上视频地址。
              </p>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
