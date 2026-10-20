'use client';

/**
 * MobileWorksDrawer —— 移动端首屏「轮播带」的收纳形态（R64）
 *
 * 竖屏首屏只留核心：标题 / 兽头 / 名片 / 时间轴。
 * 穿插式轮播带在 <768px 收成一枚胶囊入口，点开后是半透明全屏底部抽屉。
 *
 * 层级：portal 到 body（z 88），不受 .fc-root / .op-stage-layer 的层叠上下文限制。
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFeatured, type Work } from '@/lib/featured';
import { subscribeAct } from '@/lib/opTimeline';
import { CoverArt, WorkLightbox } from './FeaturedCarousel';
import { useWorksDrawer } from '@/lib/worksDrawer';

/**
 * 首屏胶囊入口 —— 渲染在名片卡片内部（移动端才显示）。
 * 与抽屉分居两个组件，靠 useWorksDrawer 这一个开关串联。
 */
export function WorksPill() {
  const hydrate = useFeatured((s) => s.hydrate);
  const works = useFeatured((s) => s.works);
  const setOpen = useWorksDrawer((s) => s.setOpen);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <button
      type="button"
      className="mw-pill"
      aria-label={`查看媒体矩阵作品，共 ${works.length} 项`}
      onClick={() => setOpen(true)}
    >
      <span className="mw-pill-ico" aria-hidden>
        ▶
      </span>
      <span className="mw-pill-txt">查看媒体矩阵作品</span>
      <span className="mw-pill-count op-num">{works.length}</span>
      <span className="mw-pill-go" aria-hidden>
        ➔
      </span>
    </button>
  );
}

export default function MobileWorksDrawer() {
  const hydrate = useFeatured((s) => s.hydrate);
  const works = useFeatured((s) => s.works);
  const open = useWorksDrawer((s) => s.open);
  const setOpen = useWorksDrawer((s) => s.setOpen);

  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<Work | null>(null);

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const off = subscribeAct((a) => {
      // 离开名片幕时顺手收起，避免抽屉盖在别的分镜上
      if (a !== 'INTRO') setOpen(false);
    });
    return () => {
      off();
    };
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const openWork = (w: Work) => {
    if (w.href) {
      window.open(w.href, '_blank', 'noopener');
      return;
    }
    setPreview(w);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="mw-sheet"
      data-drawer
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label="媒体矩阵作品"
    >
      <button
        type="button"
        className="mw-scrim"
        tabIndex={open ? 0 : -1}
        aria-label="关闭作品抽屉"
        onClick={() => setOpen(false)}
      />
      <div className="mw-panel">
        <header className="mw-head">
          <div className="mw-head-txt">
            <div className="mw-kicker">FEATURED WORKS</div>
            <h2 className="mw-title">精选视频与作品</h2>
          </div>
          <button
            type="button"
            className="mw-close"
            aria-label="关闭"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </header>

        <div className="mw-body os-scroll" data-scroll>
          <div className="mw-grid">
            {works.map((w, i) => (
              <button
                key={w.id}
                type="button"
                className="mw-card"
                onClick={() => openWork(w)}
                aria-label={`${w.title} · ${w.tag}${w.href ? '' : '（暂无外链）'}`}
              >
                <span className="mw-cover">
                  <CoverArt work={w} index={i % 5} />
                  <span className="mw-badge">{w.tag}</span>
                  <span className="mw-play" aria-hidden>
                    ▶
                  </span>
                  <span className="mw-dur op-num">{w.duration}</span>
                </span>
                <span className="mw-card-title">{w.title}</span>
              </button>
            ))}
          </div>

          <p className="mw-note">
            点击卡片直达对应平台 · 未配置外链的作品会以站内预览展示
          </p>
        </div>
      </div>

      {preview && (
        <WorkLightbox work={preview} onClose={() => setPreview(null)} />
      )}
    </div>,
    document.body,
  );
}
