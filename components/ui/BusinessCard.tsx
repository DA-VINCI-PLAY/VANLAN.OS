'use client';

/**
 * BusinessCard —— HOME 模式「社交名片卡」（R48 重设计）
 *
 * 用户指令（R48）：
 *  - 弃用底部文字拥挤排版：上层 [VANLAN] + 身份 Tag 胶囊（COMPOSER 等）；
 *  - 中层主要联系方式（微信 / 邮箱）单行高亮 + 一键复制微交互；
 *  - 下层社交平台统一尺寸极简胶囊（保持 R47 顺序：QQ → 抖音 → BILIBILI →
 *    小红书 → 其余同 CONTACT）；作品集入口保留。
 *  - 彻底移除「微信扩列」模块：COPY WECHAT 大按钮、QR 按钮及名片侧
 *    二维码入口全部删除（QrModal 全局组件保留给 CONTACT 面板使用），
 *    布局随之收紧，名字 / Tag / 联系行 / 社交 / 作品集自然衔接。
 *
 * 数据全部来自 content/*（改内容不动组件）：
 *  - 头像 /icon.png · 昵称 SITE.name · Tag = IDENTITY.role 按 · 拆分
 *  - 联系行 SOCIALS 的 wechat / email（copy 型）· chips = 其余平台
 *  - QQ chips 走 lib/qq qqAdd()，微信内置浏览器降级复制 QQ 号
 *
 * 出场动画：由 PanelSwap（R48 常驻 DOM + GPU 通道）统一驱动
 * translate3d(0,16px,0)→0 + opacity，0.35s cubic-bezier(0.16,1,0.3,1)。
 */

import { useState } from 'react';
import { useOS, type Lang } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { SITE } from '@/content/site';
import { IDENTITY } from '@/content/about';
import { SOCIALS, type SocialEntry } from '@/content/social';
import { qqAdd } from '@/lib/qq';

/** 由 Experience 的 PanelSwap(show=mode==='HOME') 控制显隐（R48 起常驻 DOM） */
export default function BusinessCard() {
  const lang = useOS((s) => s.lang) as Lang;
  const setMode = useOS((s) => s.setMode);
  const compact = useViewport().compactLandscape;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* 身份 Tag 胶囊：'COMPOSER · MUSICIAN · CREATOR' → [COMPOSER, MUSICIAN, CREATOR] */
  const tags = IDENTITY.role.split('·')
    .map((t) => t.trim())
    .filter(Boolean);

  /* 中层联系行：微信 / 邮箱（copy 型，SOCIALS 单一事实源） */
  const contactIds = ['wechat', 'email'];
  const contacts = contactIds
    .map((id) => SOCIALS.find((s) => s.id === id))
    .filter((s): s is SocialEntry => Boolean(s));

  /* 下层社交 chips：保持 R47 用户指定顺序（微信已上移至联系行） */
  const chipIds = [
    'qq',
    'douyin',
    'bilibili',
    'xiaohongshu',
    'x',
    'instagram',
    'threads',
    'youtube',
  ];
  const chips = chipIds
    .map((id) => SOCIALS.find((s) => s.id === id))
    .filter((s): s is SocialEntry => Boolean(s));

  const flashCopied = (id: string) => {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const copyContact = (s: SocialEntry) => {
    navigator.clipboard?.writeText(s.value).catch(() => {});
    flashCopied(s.id);
  };

  /* QQ：lib/qq 协议唤起加好友；微信内置浏览器禁协议 → 复制 QQ 号降级（与 CONTACT 同源） */
  const addQQ = (s: SocialEntry) => {
    const r = qqAdd();
    if (!r.ok) {
      navigator.clipboard?.writeText(s.value).catch(() => {});
      flashCopied(s.id);
    }
  };

  const chipBase =
    'rounded-full border border-ink/10 bg-white/45 px-2.5 py-[4px] font-mono text-[8px] tracking-[0.14em] text-ink/70 transition-colors duration-300 hover:border-ink/30 hover:text-ink';

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
          onClick={() => addQQ(s)}
          aria-live="polite"
          aria-label={lang === 'zh' ? '添加QQ好友' : 'Add QQ friend'}
          className={chipBase}
        >
          {copiedId === s.id
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
        onClick={() => copyContact(s)}
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
        {/* ===== 上层：头像 + [VANLAN] ===== */}
        <div className="flex items-center gap-3 px-4 pt-4 sm:gap-3.5 sm:px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-white/70 object-cover shadow-[0_4px_14px_rgba(17,17,17,0.10)]"
          />
          <h1 className="truncate font-mono text-[17px] font-semibold leading-tight tracking-[0.18em] text-ink sm:text-[19px]">
            {SITE.name}
          </h1>
        </div>

        {/* 身份 Tag 胶囊（IDENTITY.role 拆分，单一事实源） */}
        <div className="mt-2 flex flex-wrap gap-1 px-4 sm:px-5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-ink/10 bg-white/50 px-2 py-[3px] font-mono text-[8px] font-semibold tracking-[0.2em] text-ink/60"
            >
              {t}
            </span>
          ))}
        </div>

        {/* ===== 中层：联系方式单行高亮（微信 / 邮箱，一键复制微交互） ===== */}
        <div className="mt-2.5 space-y-1.5 px-4 sm:px-5">
          {contacts.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => copyContact(s)}
              aria-live="polite"
              aria-label={
                lang === 'zh'
                  ? `复制${s.platform}：${s.value}`
                  : `Copy ${s.platform}: ${s.value}`
              }
              className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-white/60 bg-white/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors duration-300 hover:bg-white active:bg-white/90"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {s.id === 'wechat' && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1faf66]"
                  />
                )}
                <span className="font-mono text-[8px] font-bold tracking-[0.18em] text-ink/50">
                  {s.platform}
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-right font-mono text-[10px] font-semibold tracking-[0.08em] text-ink">
                {s.value}
              </span>
              <span
                className={`w-9 shrink-0 text-right font-mono text-[8px] tracking-[0.14em] transition-colors duration-300 ${
                  copiedId === s.id ? 'text-[#1faf66]' : 'text-ink/40'
                }`}
              >
                {copiedId === s.id ? (lang === 'zh' ? '已复制' : 'COPIED') : 'COPY'}
              </span>
            </button>
          ))}
        </div>

        {/* ===== 下层：社交平台统一胶囊（R47 顺序，QQ 唤起加好友） ===== */}
        <nav
          aria-label={lang === 'zh' ? '社交平台链接' : 'Social links'}
          className="mt-2.5 flex flex-wrap gap-1 px-4 sm:px-5"
        >
          {chips.map(renderChip)}
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
