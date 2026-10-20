'use client';

/**
 * CommissionPanel —— 接单 / 定制合作（R51）
 *
 * 视图机（单面板内切换，不弹全局 Modal —— 移动端抽屉内更好操作）：
 *   list  : 服务卡列表（分类 / 起步价 / 交付周期 / 包含项）
 *   form  : 选中服务后的委托表单（称呼 / 联系方式 / 预算 / 需求 / demo）
 *   done  : 提交回执（订单号 + 状态 + 下一步）
 *
 * 数据：products 来自 useCommerce（localStorage 持久化，管理员可上下架）；
 * 订单写入 vanlan_orders，管理员在控制台查看与流转状态。
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BUDGET_OPTIONS,
  CONTACT_TYPES,
  ORDER_STATUS_LABEL,
  useCommerce,
  type Order,
} from '@/lib/commerce';
import {
  CATEGORY_EN,
  CATEGORY_LABEL,
  type ServiceProduct,
} from '@/content/services';
import { useOS } from '@/lib/store';

type View = 'list' | 'form' | 'done';

const FIELD =
  'w-full rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-[12px] text-ink placeholder:text-ink/25 outline-none transition-colors duration-200 focus:border-[#F35A17]/60';
const LABEL =
  'mb-1.5 block font-mono text-[8px] tracking-[0.22em] text-ink/40';

function priceLine(p: ServiceProduct): string {
  if (p.price <= 0) return '面议';
  return `¥${p.price.toLocaleString('zh-CN')} 起`;
}

export default function CommissionPanel() {
  const hydrate = useCommerce((s) => s.hydrate);
  const hydrated = useCommerce((s) => s.hydrated);
  const products = useCommerce((s) => s.products);
  const addOrder = useCommerce((s) => s.addOrder);
  const lang = useOS((s) => s.lang);

  const [view, setView] = useState<View>('list');
  const [picked, setPicked] = useState<ServiceProduct | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const [name, setName] = useState('');
  const [contactType, setContactType] =
    useState<(typeof CONTACT_TYPES)[number]>('WeChat');
  const [contact, setContact] = useState('');
  const [budget, setBudget] = useState(BUDGET_OPTIONS[2]);
  const [brief, setBrief] = useState('');
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const active = useMemo(() => products.filter((p) => p.active), [products]);

  const openForm = (p: ServiceProduct) => {
    setPicked(p);
    setError('');
    setView('form');
  };

  const submit = () => {
    if (!picked) return;
    const n = name.trim();
    const c = contact.trim();
    const b = brief.trim();
    if (!n) return setError('请填写你的称呼');
    if (!c) return setError('请留下可联系到你的账号');
    if (b.length < 6) return setError('需求描述至少 6 个字，方便准确报价');

    const created = addOrder({
      serviceId: picked.id,
      serviceName: picked.name,
      clientName: n,
      contactType,
      contact: c,
      budget,
      brief: b,
      demo,
    });
    setOrder(created);
    setView('done');
  };

  const resetAll = () => {
    setView('list');
    setPicked(null);
    setOrder(null);
    setError('');
    setName('');
    setContact('');
    setBrief('');
    setDemo(false);
  };

  /* ---------------- 提交回执 ---------------- */
  if (view === 'done' && order) {
    return (
      <div className="os-sheet-in space-y-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#18A057]/30 bg-[#18A057]/10 text-[13px] text-[#18A057]">
            ✓
          </span>
          <div>
            <div className="text-[13px] font-semibold tracking-[0.06em] text-ink">
              {lang === 'zh' ? '委托已提交' : 'Request received'}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-ink/45">
              {lang === 'zh'
                ? '我会在 48 小时内通过你留下的方式联系你。'
                : 'I will reach out within 48 hours via your contact.'}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.08] bg-black/[0.02] p-4">
          <div className={LABEL}>ORDER ID</div>
          <div className="font-mono text-[17px] tracking-[0.14em] text-[#F35A17]">
            {order.id}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-black/[0.07] pt-3 font-mono text-[10px] text-ink/55">
            <div className="flex justify-between gap-3">
              <span className="text-ink/30">SERVICE</span>
              <span className="truncate text-right text-ink/85">
                {order.serviceName}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink/30">CONTACT</span>
              <span className="truncate text-right text-ink/85">
                {order.contactType} · {order.contact}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink/30">STATUS</span>
              <span className="text-[#E08E00]">
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[9px] leading-relaxed text-ink/30">
          {lang === 'zh'
            ? '订单号已保存在本机。截图或复制给客服可加速确认。'
            : 'Your order ID is stored locally — keep it for reference.'}
        </p>

        <button
          type="button"
          onClick={resetAll}
          className="w-full rounded-lg border border-black/10 py-2.5 font-mono text-[10px] tracking-[0.2em] text-ink/70 transition-colors hover:border-black/25 hover:text-ink"
        >
          {lang === 'zh' ? '再下一单' : 'NEW REQUEST'}
        </button>
      </div>
    );
  }

  /* ---------------- 委托表单 ---------------- */
  if (view === 'form' && picked) {
    return (
      <div className="os-sheet-in space-y-3.5">
        <button
          type="button"
          onClick={() => setView('list')}
          className="font-mono text-[9px] tracking-[0.16em] text-ink/40 transition-colors hover:text-ink"
        >
          ← {lang === 'zh' ? '返回服务列表' : 'BACK'}
        </button>

        <div className="rounded-lg border border-[#F35A17]/25 bg-[#F35A17]/[0.06] px-3 py-2.5">
          <div className="font-mono text-[9px] tracking-[0.16em] text-[#F35A17]">
            {CATEGORY_EN[picked.category]}
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-ink">
            {picked.name}
          </div>
          <div className="mt-1 font-mono text-[9px] text-ink/40">
            {priceLine(picked)} · {picked.turnaround}
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="c-name">
            {lang === 'zh' ? '你的称呼' : 'YOUR NAME'} *
          </label>
          <input
            id="c-name"
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'zh' ? '怎么称呼你' : 'How should I address you'}
            maxLength={32}
          />
        </div>

        <div>
          <span className={LABEL}>{lang === 'zh' ? '联系方式' : 'CONTACT'} *</span>
          <div className="mb-1.5 grid grid-cols-3 gap-1">
            {CONTACT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setContactType(t)}
                aria-pressed={contactType === t}
                className={`rounded-md border py-1.5 font-mono text-[9px] tracking-[0.1em] transition-colors ${
                  contactType === t
                    ? 'border-[#F35A17]/60 bg-[#F35A17]/15 text-white'
                    : 'border-black/[0.08] text-ink/45 hover:border-black/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className={FIELD}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={
              contactType === 'Email'
                ? 'you@example.com'
                : contactType === 'QQ'
                  ? 'QQ 号'
                  : '微信号'
            }
            maxLength={64}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="c-budget">
            {lang === 'zh' ? '预算范围' : 'BUDGET'}
          </label>
          <select
            id="c-budget"
            className={FIELD}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            {BUDGET_OPTIONS.map((b) => (
              <option key={b} value={b} className="bg-white">
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL} htmlFor="c-brief">
            {lang === 'zh' ? '需求描述' : 'PROJECT BRIEF'} *
          </label>
          <textarea
            id="c-brief"
            className={`${FIELD} min-h-[84px] resize-none leading-relaxed`}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={
              lang === 'zh'
                ? '用途、参考风格、时长、截止日期…'
                : 'Use case, references, length, deadline…'
            }
            maxLength={800}
          />
        </div>

        <button
          type="button"
          onClick={() => setDemo((v) => !v)}
          aria-pressed={demo}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
            demo
              ? 'border-[#F35A17]/45 bg-[#F35A17]/10'
              : 'border-black/[0.08] hover:border-black/20'
          }`}
        >
          <span className="text-left">
            <span className="block text-[11px] text-ink/80">
              {lang === 'zh' ? '需要试听小样 demo' : 'Request a demo preview'}
            </span>
            <span className="mt-0.5 block text-[8px] text-ink/30">
              {lang === 'zh' ? '先听听方向是否对味' : 'Hear the direction first'}
            </span>
          </span>
          <span
            aria-hidden
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              demo ? 'bg-[#F35A17]' : 'bg-black/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                demo ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>

        {error && (
          <p className="rounded-md border border-[#F35A17]/30 bg-[#F35A17]/10 px-3 py-2 text-[10px] text-[#D94709]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          className="os-btn-accent w-full rounded-lg py-3 font-mono text-[10px] font-semibold tracking-[0.22em]"
        >
          {lang === 'zh' ? '提交委托' : 'SUBMIT REQUEST'}
        </button>
        <p className="text-center text-[8px] text-ink/25">
          {lang === 'zh'
            ? '提交后 48 小时内回复 · 不收取任何预付款'
            : 'Reply within 48h · No upfront payment'}
        </p>
      </div>
    );
  }

  /* ---------------- 服务列表 ---------------- */
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[13px] font-semibold tracking-[0.06em] text-ink">
          {lang === 'zh' ? '定制合作' : 'COMMISSION'}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-ink/40">
          {lang === 'zh'
            ? '编曲、混音、3D 角色与商业定制。选一项，填表即可。'
            : 'Composition, mixing, 3D character & custom work. Pick one and fill the brief.'}
        </p>
      </div>

      {!hydrated && (
        <div className="py-6 text-center font-mono text-[9px] tracking-[0.2em] text-ink/30">
          LOADING SERVICES…
        </div>
      )}

      {hydrated && active.length === 0 && (
        <div className="rounded-lg border border-black/[0.08] py-8 text-center text-[10px] text-ink/35">
          {lang === 'zh' ? '服务整理中，稍后再来。' : 'Services are being updated.'}
        </div>
      )}

      {active.map((p) => (
        <article
          key={p.id}
          className="os-card rounded-xl p-3.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[8px] tracking-[0.2em] text-[#F35A17]">
                {CATEGORY_EN[p.category]} · {CATEGORY_LABEL[p.category]}
              </div>
              <h3 className="mt-1 text-[12.5px] font-semibold leading-snug text-ink">
                {p.name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-[12px] font-semibold text-ink">
                {priceLine(p)}
              </div>
              <div className="mt-0.5 font-mono text-[8px] text-ink/35">
                {p.turnaround}
              </div>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-[9.5px] leading-relaxed text-ink/40">
            {p.description}
          </p>

          <ul className="mt-2 space-y-1">
            {p.deliverables.slice(0, 3).map((d) => (
              <li
                key={d}
                className="flex items-start gap-1.5 text-[9px] leading-snug text-ink/55"
              >
                <span aria-hidden className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-black/25" />
                {d}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => openForm(p)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-left transition-colors hover:border-[#F35A17]/55 hover:bg-[#F35A17]/[0.07]"
          >
            <span className="font-mono text-[9px] tracking-[0.18em] text-ink/75">
              {lang === 'zh' ? '发起委托' : 'REQUEST'}
            </span>
            <span aria-hidden className="text-[11px] text-[#F35A17]">
              →
            </span>
          </button>
        </article>
      ))}

      <p className="pt-1 text-center text-[8px] leading-relaxed text-ink/25">
        {lang === 'zh'
          ? '所有委托均含 1–2 次修改 · 商用授权可另议'
          : 'All commissions include 1–2 revisions · Commercial licensing available'}
      </p>
    </div>
  );
}
