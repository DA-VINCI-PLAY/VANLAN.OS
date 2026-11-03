'use client';

/**
 * StageOverlay —— 前景分镜层（R52 / R81）
 *
 * 时间轴进入哪个 ACT，就渲染哪一块前景（R81 黄金四幕：名片 → 工坊 → 矩阵 → 片尾）：
 *   INTRO      名片 + 社交图标矩阵
 *   COMMISSION 接单工坊（复用 CommissionPanel，含下单表单）
 *   MEDIA      自媒体矩阵（集中式平台配置 + 极简展示卡）
 *   CREDITS    系统状态 + 语言切换 + 管理员终端入口 + 星空分站入口
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
import { IDENTITY } from '@/content/about';
import { SOCIALS } from '@/content/social';
import { qqAdd } from '@/lib/qq';
import BrandIcon from '@/components/op/BrandIcon';
import CommissionPanel from '@/components/ui/CommissionPanel';
import { WorksPill } from '@/components/op/MobileWorksDrawer';
import { openKepler } from '@/lib/kepler';
import {
  MATRIX_REGIONS,
  PLATFORM_MATRIX_CONFIG,
  type MatrixRegion,
} from '@/content/platformMatrix';

/** 跳到指定幕的起始位置 */
const gotoAct = (id: ActId) =>
  setProgress((ACTS.find((a) => a.id === id) ?? ACTS[0]).startP + 0.001);

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
    <section className="op-panel op-panel-intro" data-scroll aria-label="个人名片">
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
            className={`op-chip op-chip-${s.id}`}
            title={s.platform}
            aria-label={s.platform}
          >
            <BrandIcon id={s.id} />
          </a>
        ))}
      </div>

      {/* 移动端：轮播带收成一枚胶囊，点开是底部抽屉（桌面端隐藏，走穿插轮播带） */}
      <WorksPill />

      <div className="op-card-foot">
        <span>SCROLL / DRAG →</span>
        <button type="button" className="op-foot-go" onClick={() => gotoAct('COMMISSION')}>
          <span className="op-foot-long">定制工坊</span>
          <span className="op-foot-short">工坊</span> →
        </button>
        {/* 手机专属：名片卡第二枚胶囊，直接潜进星空（桌面端隐藏） */}
        <button type="button" className="op-foot-kp" onClick={() => openKepler()}>
          <b aria-hidden>✦</b> 克卜勒星空
        </button>
      </div>
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
        <button type="button" onClick={() => gotoAct('MEDIA')}>
          矩阵 →
        </button>
      </div>
    </section>
  );
}

/* ============ ACT 03 · 自媒体矩阵（R81 极简重构：无界毛玻璃 + 垂直索引栏） ============ */
function MediaStage() {
  const [region, setRegion] = useState<MatrixRegion>('cn');
  const [platformId, setPlatformId] = useState('bilibili');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  /* 索引栏固定展示全部 7 平台（顺序即 R81 规范），点击跨板块平台时联动切换 */
  const rail = PLATFORM_MATRIX_CONFIG;
  const current = PLATFORM_MATRIX_CONFIG.find((p) => p.id === platformId) ?? rail[0];
  const railIdx = Math.max(0, rail.findIndex((p) => p.id === current.id));

  const switchRegion = (r: MatrixRegion) => {
    if (r === region) return;
    const def = MATRIX_REGIONS.find((x) => x.id === r);
    setRegion(r);
    setPlatformId(def?.defaultPlatform ?? rail.find((p) => p.region === r)!.id);
    setCopied(false);
  };

  const selectPlatform = (p: (typeof rail)[number]) => {
    if (p.id === platformId) return;
    setRegion(p.region);
    setPlatformId(p.id);
    setCopied(false);
  };

  const copyId = () => {
    navigator.clipboard?.writeText(current.copyId).catch(() => {});
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  /* 平台域名（左下角极小标识） */
  const domain = (() => {
    try {
      return new URL(current.link).hostname.replace(/^www\./, '');
    } catch {
      return current.name.toLowerCase();
    }
  })();

  const t = current.theme;
  const vars = {
    '--mx-primary': t.primary,
    '--mx-bg': t.bg,
    '--mx-text': t.text,
    '--mx-sub': t.sub,
    '--mx-border': t.border,
    '--mx-btn': t.btnBg,
    '--mx-btn-text': t.btnText,
    '--mx-ico-bg': t.iconBg,
    '--mx-ico-border': t.iconBorder,
    '--mx-ico-color': t.iconColor,
    '--mx-glow': t.glow,
    '--mx-demo-bg': t.demoBg,
    '--mx-demo-border': t.demoBorder,
    '--mx-rail-tint': t.dockBg,
    '--mx-rail-ico': t.dockIcon,
    '--rail-i': railIdx,
  } as React.CSSProperties;

  return (
    <section className="op-panel op-panel-media" aria-label="自媒体矩阵">
      {/* ① 外部顶栏：平铺文字切换（圆点 + 字重，不画框） */}
      <div className="op-mx-tabs" role="tablist" aria-label="内容板块切换">
        {MATRIX_REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={region === r.id}
            className={`op-mx-tab ${region === r.id ? 'is-active' : ''}`}
            onClick={() => switchRegion(r.id)}
          >
            <i className="op-mx-tab-dot" aria-hidden />
            {r.label}
          </button>
        ))}
      </div>

      {/* ② 主卡：左右一体式，右侧垂直 7 平台索引栏 + 4px 灵动胶囊 */}
      <article
        key={`${region}-${current.id}`}
        className="op-mx-card"
        data-platform={current.id}
        data-region={region}
        style={vars}
      >
        <div className="op-mx-rail" role="tablist" aria-label="平台索引">
          {rail.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={current.id === p.id}
              title={p.name}
              aria-label={p.name}
              className={`op-mx-rail-btn ${current.id === p.id ? 'is-active' : ''}`}
              onClick={() => selectPlatform(p)}
            >
              <BrandIcon id={p.id} size={16} />
            </button>
          ))}
          <span className="op-mx-rail-pill" aria-hidden />
        </div>

        <div className="op-mx-main">
          {/* ③ 左上角：大气品牌视觉锚点 */}
          <header className="op-mx-hero">
            <span className="op-mx-badge" aria-hidden>
              <BrandIcon id={current.id} size={28} />
            </span>
            <div className="op-mx-id">
              <b>
                {current.name}
                {current.zhName ? <i>{current.zhName}</i> : null}
              </b>
              <span>{current.handle}</span>
            </div>
          </header>

          <p className="op-mx-bio">{current.bio}</p>

          {/* ④ 中部：通透双列精选内容卡 */}
          <div className="op-mx-demos">
            {current.demos.map((d) => (
              <a
                key={d.title}
                href={current.link}
                target="_blank"
                rel="noopener noreferrer"
                className="op-mx-demo"
              >
                <em>{d.badge}</em>
                <b>{d.title}</b>
                <span>{d.meta}</span>
                <u className="op-mx-demo-go" aria-hidden>
                  ↗
                </u>
              </a>
            ))}
          </div>

          {/* ⑤ 右下角：唯一胶囊主按钮；左下角域名 + 复制 ID */}
          <footer className="op-mx-foot">
            <span className="op-mx-domain">{domain}</span>
            <button type="button" className="op-mx-copy" onClick={copyId}>
              {copied ? 'ID ✓' : 'COPY ID'}
            </button>
            <a
              className="op-mx-go"
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              前往 {current.name} 主页 ↗
            </a>
          </footer>
        </div>
      </article>

      <div className="op-card-foot">
        <span className="op-foot-note">DOUYIN · BILIBILI · RED · YT · X · IG · THREADS</span>
        <button type="button" onClick={() => gotoAct('CREDITS')}>
          片尾 →
        </button>
      </div>
    </section>
  );
}

/* ============ ACT 04 · 职员表 / 系统 ============ */
function CreditsStage() {
  const lang = useOS((s) => s.lang);
  const setLang = useOS((s) => s.setLang);
  const setAdminOpen = useOS((s) => s.setAdminOpen);
  const unlocked = useOS((s) => s.adminUnlocked);

  return (
    <section className="op-panel op-panel-credits" data-scroll aria-label="系统与职员表">
      <div className="op-kicker">END CARD // SYSTEM</div>
      <h2 className="op-credits-title">
        {lang === 'zh' ? '终章 · 幕后与系统终端' : 'Finale · Behind the Curtain'}
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
          <b>R81 · 2D OP STAGE</b>
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

      {/* R81：专辑播放页撤出主线，这里是它的独立分站入口 */}
      <button
        type="button"
        className="op-kepler-entry"
        onClick={() => openKepler()}
      >
        <b>✦</b> 前往专辑 / 星空独立分站 ↗
        <i>SUBSITE // KEPLER STARFIELD</i>
      </button>

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
