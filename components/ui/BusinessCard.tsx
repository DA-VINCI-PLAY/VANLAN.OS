'use client';

/**
 * BusinessCard —— HOME 名片（R51 Tesla In-Car OS 重构）
 *
 * 结构：
 *  上：头像 + VANLAN + 身份 Tag + 「OPEN FOR WORK」状态
 *  中：QQ（点击唤起加好友 / 微信内置浏览器降级复制）+ EMAIL 一键复制
 *  下：社交平台胶囊（QQ 已上移，其余同 CONTACT）
 *  底：PORTFOLIO / SERVICE 双入口（SERVICE → 接单页）
 *
 * 交互：所有可点行高度 ≥ 44px（移动端触控标准）；桌面 hover 提亮描边。
 * 数据全部来自 content/*（改内容不动组件）。
 */

import { useState } from 'react';
import { useOS, type Lang } from '@/lib/store';
import { useViewport } from '@/lib/useViewport';
import { SITE } from '@/content/site';
import { IDENTITY } from '@/content/about';
import { SOCIALS, type SocialEntry } from '@/content/social';
import { qqAdd } from '@/lib/qq';

export default function BusinessCard() {
  const lang = useOS((s) => s.lang) as Lang;
  const setMode = useOS((s) => s.setMode);
  const compact = useViewport().compactLandscape;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tags = IDENTITY.role
    .split('·')
    .map((t) => t.trim())
    .filter(Boolean);

  const contactIds = ['qq', 'email'];
  const contacts = contactIds
    .map((id) => SOCIALS.find((s) => s.id === id))
    .filter((s): s is SocialEntry => Boolean(s));

  const chipIds = [
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

  /** QQ：协议唤起加好友；微信内置浏览器 / 无客户端 → 降级复制 */
  const handleContact = (s: SocialEntry) => {
    if (s.action === 'qq') {
      const r = qqAdd();
      if (r.ok) return;
    }
    copyContact(s);
  };

  const raiser = (s: SocialEntry) => {
    if (s.action === 'qq') {
      return lang === 'zh'
        ? `添加${s.platform}好友：${s.value}`
        : `Add ${s.platform} friend: ${s.value}`;
    }
    return lang === 'zh'
      ? `复制${s.platform}：${s.value}`
      : `Copy ${s.platform}: ${s.value}`;
  };

  return (
    <section
      aria-label={lang === 'zh' ? '电子名片' : 'Business card'}
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4"
      style={{
        bottom: compact
          ? 'calc(54px + env(safe-area-inset-bottom))'
          : 'calc(64px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="fade-in pointer-events-auto w-full max-w-[356px] rounded-2xl border border-white/[0.08] bg-[rgba(18,20,24,0.78)] shadow-[0_24px_64px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
        {/* ===== 上：头像 + 名字 + 状态 ===== */}
        <div className="flex items-center gap-3 px-4 pt-4 sm:gap-3.5 sm:px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IDENTITY.avatar}
            alt="VANLAN"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-black/5 object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[0.14em] text-ink">
              {SITE.name}
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="dot-pulse h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />
              <span className="font-mono text-[8px] tracking-[0.18em] text-ink/45">
                {lang === 'zh' ? '开放合作中' : 'OPEN FOR WORK'}
              </span>
            </div>
          </div>
        </div>

        {/* 身份 Tag */}
        <div className="mt-3 flex flex-wrap gap-1 px-4 sm:px-5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-[3px] font-mono text-[8px] tracking-[0.18em] text-ink/45"
            >
              {t}
            </span>
          ))}
        </div>

        {/* ===== 中：联系方式（44px 触控行） ===== */}
        <div className="mt-3 space-y-1.5 px-4 sm:px-5">
          {contacts.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleContact(s)}
              aria-live="polite"
              aria-label={raiser(s)}
              className="group flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 transition-colors duration-200 hover:border-white/[0.16] hover:bg-white/[0.06]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.id === 'qq' ? 'bg-[#12B7F5]' : 'bg-[#E82127]'
                  }`}
                />
                <span className="font-mono text-[9px] font-semibold tracking-[0.16em] text-ink/55">
                  {s.platform}
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-right font-mono text-[10px] tracking-[0.06em] text-ink/90">
                {s.value}
              </span>
              <span
                className={`w-9 shrink-0 text-right font-mono text-[8px] tracking-[0.12em] transition-colors duration-200 ${
                  copiedId === s.id ? 'text-[#3ddc84]' : 'text-ink/30 group-hover:text-[#E82127]'
                }`}
              >
                {s.action === 'qq'
                  ? lang === 'zh'
                    ? '添加'
                    : 'ADD'
                  : copiedId === s.id
                    ? lang === 'zh'
                      ? '已复制'
                      : 'COPIED'
                    : 'COPY'}
              </span>
            </button>
          ))}
        </div>

        {/* ===== 下：社交胶囊 ===== */}
        <nav
          aria-label={lang === 'zh' ? '社交平台链接' : 'Social links'}
          className="mt-3 flex flex-wrap gap-1 px-4 sm:px-5"
        >
          {chips.map((s) => (
            <a
              key={s.id}
              href={s.value}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-[5px] font-mono text-[8px] tracking-[0.12em] text-ink/55 transition-colors duration-200 hover:border-[#E82127]/50 hover:text-ink"
            >
              {s.platform}
            </a>
          ))}
        </nav>

        {/* ===== 底：双入口 ===== */}
        <div className="mt-3.5 grid grid-cols-2 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => setMode('GALLERY')}
            aria-label={lang === 'zh' ? '打开作品集' : 'Open portfolio gallery'}
            className="group flex min-h-[44px] items-center justify-between border-r border-white/[0.07] px-4 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.04] sm:px-5"
          >
            <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-ink/80">
              {lang === 'zh' ? '作品集' : 'PORTFOLIO'}
            </span>
            <span
              aria-hidden
              className="font-mono text-[10px] text-ink/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
            >
              →
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('COMMISSION')}
            aria-label={lang === 'zh' ? '查看接单服务' : 'View commission services'}
            className="group flex min-h-[44px] items-center justify-between px-4 py-2.5 text-left transition-colors duration-200 hover:bg-[#E82127]/10 sm:px-5"
          >
            <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-[#E82127]">
              {lang === 'zh' ? '接单' : 'ORDER'}
            </span>
            <span
              aria-hidden
              className="font-mono text-[10px] text-[#E82127]/60 transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
