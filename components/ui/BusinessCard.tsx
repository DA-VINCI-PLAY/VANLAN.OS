'use client';

/**
 * BusinessCard —— HOME 模式「电子名片卡」（R46 名片化重构）
 *
 * 用户指令：首屏名片化、扩列优先 —— 手机扫码进来第一眼就是可操作的
 * 名片（头像 / 昵称定位 / 微信一键复制 + 二维码 / 社交外链 / 作品集入口），
 * 3D 兽头退居背景（canvas pointer-events:none，见 SceneCanvas）。
 *
 * 数据全部来自 content/*（改内容不动组件）：
 *  - 头像        /icon.png（站点图标，即兽头标识）
 *  - 昵称        SITE.name（content/site）
 *  - 身份/定位   IDENTITY.role + BIO（content/about）
 *  - 社交区      SOCIALS 按 R47 排序：QQ → 抖音 → BILIBILI → 微信 → 小红书 → 其余同 CONTACT
 *                （数据仍全部来自 content/social 单一事实源，此处只定展示顺序）
 *  - 作品集入口  setMode('GALLERY')
 *
 * 交互：
 *  - 微信复制：navigator.clipboard，成功后按钮 1.6s 显示 COPIED
 *  - QQ 加好友：lib/qq qqAdd() 协议唤起；微信内置浏览器禁协议 → 复制 QQ 号 1.6s 降级
 *  - 二维码：setQrPlatform('wechat') → 复用全局 QrModal（含焦点管理）
 *  - 布局：贴底居中（导航胶囊上方），白博物馆玻璃语言，动画全 linear
 */

import { useState } from 'react';
import { useOS, type Lang } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { SITE } from '@/content/site';
import { IDENTITY, BIO } from '@/content/about';
import { SOCIALS, type SocialEntry } from '@/content/social';
import { qqAdd } from '@/lib/qq';

/** 由 Experience 的 PanelSwap(show=mode==='HOME') 控制挂载与进出动画 */
export default function BusinessCard() {
  const lang = useOS((s) => s.lang) as Lang;
  const setMode = useOS((s) => s.setMode);
  const setQrPlatform = useOS((s) => s.setQrPlatform);
  const compact = useViewport().compactLandscape;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const wechat = SOCIALS.find((s) => s.id === 'wechat');
  const qq = SOCIALS.find((s) => s.id === 'qq');

  /* R47 社交排序（用户指令）：QQ → 抖音 → BILIBILI →（微信专属行）→ 小红书 → 其余保持 CONTACT 原序。
     数据仍全部取自 content/social（单一事实源），此处只定展示顺序。 */
  const beforeWechat = ['qq', 'douyin', 'bilibili'];
  const afterWechat = ['xiaohongshu', 'x', 'instagram', 'threads', 'youtube'];
  const pick = (ids: string[]) =>
    ids
      .map((id) => SOCIALS.find((s) => s.id === id))
      .filter((s): s is SocialEntry => Boolean(s));

  const flashCopied = (id: string) => {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const copyWechat = () => {
    if (!wechat) return;
    navigator.clipboard?.writeText(wechat.value).catch(() => {});
    flashCopied('wechat');
  };

  /* QQ：lib/qq 协议唤起加好友；微信内置浏览器禁 mqqapi/tencent 协议 → 复制 QQ 号降级（与 CONTACT 同源逻辑） */
  const addQQ = () => {
    const r = qqAdd();
    if (!r.ok) {
      if (qq) navigator.clipboard?.writeText(qq.value).catch(() => {});
      flashCopied('qq');
    }
  };

  const chipBase =
    'rounded-full border border-ink/10 bg-white/45 px-2 py-[3px] font-mono text-[8px] tracking-[0.14em] text-ink/70 transition-colors duration-300 hover:border-ink/30 hover:text-ink';

  /* chips 按 action 分流：link 开外链 / qq 唤起加好友（微信内降级复制）/ copy 复制账号。
     copy·qr 型平台（如 wechat）一般走微信专属行，不进 chips 列表。 */
  const renderChip = (s: SocialEntry) => {
    if (s.action === 'link') {
      return (
        <a
          key={s.id}
          href={s.value}
          target="_blank"
          rel="noopener noreferrer"
          className={chipBase}
        >
          {s.platform}
        </a>
      );
    }
    if (s.action === 'qq') {
      return (
        <button
          key={s.id}
          type="button"
          onClick={addQQ}
          aria-live="polite"
          aria-label={lang === 'zh' ? '添加QQ好友' : 'Add QQ friend'}
          className={chipBase}
        >
          {copiedId === 'qq'
            ? lang === 'zh'
              ? '已复制QQ号'
              : 'QQ COPIED'
            : s.platform}
        </button>
      );
    }
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(s.value).catch(() => {});
          flashCopied(s.id);
        }}
        aria-live="polite"
        aria-label={
          lang === 'zh' ? `复制${s.platform}账号` : `Copy ${s.platform} handle`
        }
        className={chipBase}
      >
        {copiedId === s.id
          ? lang === 'zh'
            ? '已复制'
            : 'COPIED'
          : s.platform}
      </button>
    );
  };

  return (
    <section
      aria-label={lang === 'zh' ? '电子名片' : 'Business card'}
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4"
      style={{
        // 导航胶囊（bottom 14~24px，高约 34px）上方留位
        bottom: compact
          ? 'calc(54px + env(safe-area-inset-bottom))'
          : 'calc(64px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="fade-in pointer-events-auto w-full max-w-[340px] rounded-2xl border border-white/60 bg-white/55 ring-1 ring-ink/[0.05] shadow-[0_16px_48px_rgba(17,17,17,0.10),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl"
      >
        {/* ===== 头部：头像 + 昵称 + 身份/定位 ===== */}
        <div className="flex items-center gap-3 px-4 pt-4 sm:gap-3.5 sm:px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-white/70 object-cover shadow-[0_4px_14px_rgba(17,17,17,0.10)]"
          />
          <div className="min-w-0">
            <h1 className="truncate font-mono text-[17px] font-semibold leading-tight tracking-[0.18em] text-ink sm:text-[19px]">
              {SITE.name}
            </h1>
            <p className="mt-0.5 truncate font-mono text-[8px] tracking-[0.2em] text-ink/60 sm:text-[9px]">
              {IDENTITY.role}
            </p>
          </div>
        </div>
        <p className="mt-1.5 px-4 font-mono text-[8px] tracking-[0.18em] text-ink/50 sm:px-5 sm:text-[9px]">
          {BIO[lang]}
        </p>

        {/* ===== 社交区（R47 排序）：QQ → 抖音 → BILIBILI → 微信 → 小红书 → 其余同 CONTACT ===== */}
        <nav
          aria-label={lang === 'zh' ? '社交平台链接' : 'Social links'}
          className="px-4 sm:px-5"
        >
          <div className="mt-2.5 flex flex-wrap gap-1">
            {pick(beforeWechat).map(renderChip)}
          </div>

          {/* 微信专属行：一键复制 + 二维码（名片主 CTA，保持 R46 形态） */}
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={copyWechat}
              aria-label={
                lang === 'zh' ? '复制微信号' : 'Copy WeChat ID to clipboard'
              }
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/60 bg-white/70 font-mono text-[9px] font-bold tracking-[0.16em] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors duration-300 hover:bg-white active:bg-white/90"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[#1faf66]"
              />
              {copiedId === 'wechat'
                ? lang === 'zh'
                  ? '已复制'
                  : 'COPIED'
                : lang === 'zh'
                  ? '复制微信号'
                  : `COPY ${wechat?.platform ?? 'WECHAT'}`}
            </button>
            <button
              type="button"
              onClick={() => setQrPlatform('wechat')}
              aria-label={lang === 'zh' ? '打开微信二维码' : 'Open WeChat QR code'}
              className="flex h-8 items-center justify-center rounded-lg border border-white/60 bg-white/70 px-3 font-mono text-[9px] font-bold tracking-[0.16em] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors duration-300 hover:bg-white active:bg-white/90"
            >
              {lang === 'zh' ? '二维码' : 'QR'}
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1">
            {pick(afterWechat).map(renderChip)}
          </div>
        </nav>

        {/* ===== 作品集入口（扩列优先：一眼可达） ===== */}
        <button
          type="button"
          onClick={() => setMode('GALLERY')}
          aria-label={lang === 'zh' ? '打开作品集' : 'Open portfolio gallery'}
          className="group mt-3 flex w-full items-center justify-between rounded-b-2xl border-t border-ink/[0.07] bg-white/40 px-4 py-2.5 text-left transition-colors duration-300 hover:bg-white/70 sm:px-5"
        >
          <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink">
            {lang === 'zh' ? '作品集' : 'PORTFOLIO'}
          </span>
          <span
            aria-hidden
            className="font-mono text-[10px] text-ink/45 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
      </div>
    </section>
  );
}
