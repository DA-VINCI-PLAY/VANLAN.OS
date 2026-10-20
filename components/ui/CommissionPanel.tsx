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
  CONTACT_TYPES,
  ORDER_STATUS_LABEL,
  useCommerce,
  type Order,
} from '@/lib/commerce';
import { notifyOrder } from '@/lib/notify';
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

/* ---------------- 预算区间 ---------------- */
const BUDGET_FLOOR = 500;
const BUDGET_CEIL = 20000;
const BUDGET_STEP = 500;
const money = (n: number) => `¥${n.toLocaleString('zh-CN')}`;

const BUDGET_PRESETS: { label: string; hint: string; range: [number, number] }[] = [
  { label: '¥500 - 1.5k', hint: '轻量级 · Demo或单项协助', range: [500, 1500] },
  { label: '¥1.5k - 4k', hint: '标准商业 · 完整编曲/混音/模型', range: [1500, 4000] },
  { label: '¥4k - 10k', hint: '深度定制 · 词曲编混全案/高精3D', range: [4000, 10000] },
  { label: '¥10k+', hint: '旗舰级 · 专辑制作/大型商业项目', range: [10000, 20000] },
];

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
  const [budgetMin, setBudgetMin] = useState(1500);
  const [budgetMax, setBudgetMax] = useState(4000);
  const [brief, setBrief] = useState('');
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState('');
  const [pushing, setPushing] = useState<'idle' | 'sending' | 'done'>('idle');
  const [pushNote, setPushNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const active = useMemo(() => products.filter((p) => p.active), [products]);

  const openForm = (p: ServiceProduct) => {
    setPicked(p);
    setError('');
    setView('form');
  };

  const budgetLabel = `${money(budgetMin)} – ${money(budgetMax)}${
    budgetMax >= BUDGET_CEIL ? '+' : ''
  }`;
  const span = BUDGET_CEIL - BUDGET_FLOOR;
  const pctMin = ((budgetMin - BUDGET_FLOOR) / span) * 100;
  const pctMax = ((budgetMax - BUDGET_FLOOR) / span) * 100;

  const setBudget = (which: 'min' | 'max', raw: number) => {
    const v = Math.min(BUDGET_CEIL, Math.max(BUDGET_FLOOR, Math.round(raw)));
    if (which === 'min') {
      setBudgetMin(Math.min(v, budgetMax - BUDGET_STEP < BUDGET_FLOOR ? BUDGET_FLOOR : budgetMax - BUDGET_STEP));
    } else {
      setBudgetMax(Math.max(v, budgetMin + BUDGET_STEP > BUDGET_CEIL ? BUDGET_CEIL : budgetMin + BUDGET_STEP));
    }
  };

  const applyPreset = (range: [number, number]) => {
    setBudgetMin(range[0]);
    setBudgetMax(range[1]);
  };

  const submit = () => {
    if (!picked) return;
    const n = name.trim();
    const c = contact.trim();
    const b = brief.trim();
    if (!n) return setError('请填写你的称呼');
    if (!c) return setError('请留下可联系到你的账号');
    if (b.length < 6) return setError('需求描述至少 6 个字，方便准确报价');

    setSending(true);
    const created = addOrder({
      serviceId: picked.id,
      serviceName: picked.name,
      clientName: n,
      contactType,
      contact: c,
      budget: budgetLabel,
      brief: b,
      demo,
    });
    setOrder(created);
    // 留一点「正在发送需求…」的可感知反馈，再切回执
    window.setTimeout(() => {
      setSending(false);
      setView('done');
    }, 320);

    // 实时推送（不阻断 UI；失败也不影响订单落库）
    setPushing('sending');
    setPushNote('');
    notifyOrder({
      orderId: created.id,
      serviceName: created.serviceName,
      clientName: created.clientName,
      contactType: created.contactType,
      contact: created.contact,
      budget: created.budget,
      brief: created.brief,
      demo: created.demo,
      createdAt: created.createdAt,
    })
      .then((r) => {
        setPushing('done');
        if (r.mail === 'ok') setPushNote('通知已推送到邮箱');
        else if (r.mail === 'fail') setPushNote('邮件通道未激活，请到邮箱点击 Activate');
        else if (r.push === 'ok') setPushNote('已通过微信推送');
      })
      .catch(() => {
        setPushing('done');
      });
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

        {pushing !== 'idle' && (
          <p className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.14em] text-ink/35">
            <i
              className={`h-1.5 w-1.5 rounded-full ${
                pushing === 'sending' ? 'animate-pulse bg-[#E08E00]' : 'bg-[#18A057]'
              }`}
            />
            {pushing === 'sending' ? 'PUSHING NOTIFICATION…' : pushNote || 'NOTIFICATION SENT'}
          </p>
        )}

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
          ← 返回服务列表
        </button>

        <div className="rounded-lg border border-[#E85D2A]/25 bg-[#E85D2A]/[0.06] px-3 py-2.5">
          <div className="font-mono text-[9px] tracking-[0.16em] text-[#D94E1F]">
            {CATEGORY_EN[picked.category]}
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-ink">
            {picked.name}
          </div>
          <div className="mt-1 font-mono text-[9px] text-ink/40">
            <span className="op-num">{priceLine(picked)}</span> · {picked.turnaround}
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="c-name">
            您的称呼 *
          </label>
          <input
            id="c-name"
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="怎么称呼您？如：陈先生 / 工作室名称"
            maxLength={32}
          />
        </div>

        <div>
          <span className={LABEL}>联系方式 *</span>
          <div className="mb-1.5 grid grid-cols-3 gap-1">
            {CONTACT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setContactType(t)}
                aria-pressed={contactType === t}
                className={`op-tab${contactType === t ? ' is-on' : ''}`}
              >
                {t === 'WeChat' ? '微信 WeChat' : t === 'Email' ? '邮箱 Email' : 'QQ'}
              </button>
            ))}
          </div>
          <input
            className={FIELD}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={
              contactType === 'Email'
                ? '请输入您的常用邮箱地址'
                : contactType === 'QQ'
                  ? '请输入您的 QQ 号码'
                  : '请输入您的微信号（方便添加好友沟通）'
            }
            maxLength={64}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className={`${LABEL} mb-1`}>预算范围 / BUDGET</span>
            <span className="font-mono text-[8px] tracking-[0.14em] text-ink/30">
              CNY（人民币）
            </span>
          </div>

          {/* 遥测：大号等宽数字随拖动跳动 */}
          <div className="op-budget-echo" aria-live="polite">
            <span className="op-num">{money(budgetMin)}</span>
            <i>—</i>
            <span className="op-num">
              {money(budgetMax)}
              {budgetMax >= BUDGET_CEIL ? '+' : ''}
            </span>
          </div>

          {/* 双滑块轨道 */}
          <div className="op-budget">
            <div className="op-budget-track">
              <i style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }} />
            </div>
            <input
              type="range"
              aria-label="预算下限"
              min={BUDGET_FLOOR}
              max={BUDGET_CEIL}
              step={BUDGET_STEP}
              value={budgetMin}
              onChange={(e) => setBudget('min', Number(e.target.value))}
            />
            <input
              type="range"
              aria-label="预算上限"
              min={BUDGET_FLOOR}
              max={BUDGET_CEIL}
              step={BUDGET_STEP}
              value={budgetMax}
              onChange={(e) => setBudget('max', Number(e.target.value))}
            />
          </div>

          {/* 快捷档位 */}
          <div className="op-budget-presets">
            {BUDGET_PRESETS.map((p) => {
              const on = budgetMin === p.range[0] && budgetMax === p.range[1];
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => applyPreset(p.range)}
                  className={on ? 'is-on' : ''}
                >
                  <b className="op-num">{p.label}</b>
                  <i>{p.hint}</i>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="c-brief">
            需求描述 / PROJECT BRIEF *
          </label>
          <textarea
            id="c-brief"
            className={`${FIELD} min-h-[84px] resize-none leading-relaxed`}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="请简述您的项目用途、参考风格（Reference）、预计时长、交付周期要求等..."
            maxLength={800}
          />
        </div>

        <button
          type="button"
          onClick={() => setDemo((v) => !v)}
          aria-pressed={demo}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
            demo
              ? 'border-[#E85D2A]/50 bg-[#E85D2A]/10'
              : 'border-black/[0.08] hover:border-black/20'
          }`}
        >
          <span className="text-left">
            <span className="block text-[11px] text-ink/80">
              申请免费试听小样（Demo Preview）
            </span>
            <span className="mt-0.5 block text-[8px] text-ink/30">
              先试听一段方向小样，满意后再推进正式合作
            </span>
          </span>
          <span aria-hidden className={`os-switch${demo ? ' is-on' : ''}`}>
            <i />
          </span>
        </button>

        {error && (
          <p className="rounded-md border border-[#E85D2A]/30 bg-[#E85D2A]/10 px-3 py-2 text-[10px] text-[#D94E1F]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="os-btn-accent w-full rounded-lg py-3 font-mono text-[10px] font-semibold tracking-[0.16em] disabled:opacity-70"
        >
          {sending ? '正在发送需求...' : '提交定制需求 · SUBMIT'}
        </button>
        <p className="text-center text-[8.5px] leading-relaxed text-ink/30">
          48 小时内极速响应 · 确认合作前无需支付任何定金
        </p>
        <p className="text-center font-mono text-[7.5px] tracking-[0.14em] text-ink/20">
          编曲制作 · 混音母带 · 3D 建模 · 商业定制
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
