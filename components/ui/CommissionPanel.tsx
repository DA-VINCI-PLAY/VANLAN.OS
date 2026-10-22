'use client';

/**
 * CommissionPanel —— 接单 / 定制合作（R51 → R74「AI 辅助增效版」）
 *
 * 视图机（单面板内切换，不弹全局 Modal —— 移动端抽屉内更好操作）：
 *   list  : 品类筛选卡 + 细分服务卡列表
 *   form  : 委托表单（称呼 / 联系方式 / 品类卡联动滑块 / 细分服务点选 / 免责条款确认）
 *   done  : 提交回执（订单号 + 状态 + 下一步）
 *
 * 数据：products 来自 useCommerce（localStorage 持久化，管理员可上下架）；
 * 订单写入 vanlan_orders，管理员在控制台查看与流转状态。
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  CONTACT_TYPES,
  ORDER_STATUS_LABEL,
  useCommerce,
  type Order,
} from '@/lib/commerce';
import { notifyOrder } from '@/lib/notify';
import {
  CATEGORY_CARDS,
  CATEGORY_EN,
  CATEGORY_LABEL,
  TERMS_SECTIONS,
  type ServiceCategory,
  type ServiceProduct,
} from '@/content/services';
import { useOS } from '@/lib/store';

type View = 'list' | 'form' | 'done';

const FIELD =
  'w-full rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-[12px] text-ink placeholder:text-ink/25 outline-none transition-colors duration-200 focus:border-[#F35A17]/60';
const LABEL =
  'mb-1.5 block font-mono text-[8px] tracking-[0.22em] text-ink/40';

/* ---------------- 预算区间（R74：AI 增效版 ¥50 – ¥600+） ---------------- */
const BUDGET_FLOOR = 50;
const BUDGET_CEIL = 600;
const BUDGET_STEP = 10;
const money = (n: number) => `¥${n.toLocaleString('zh-CN')}`;

type TierArtKind = 'wave' | 'timeline' | 'rig' | 'code';

const TIER_ART: Record<ServiceCategory, TierArtKind> = {
  AUDIO: 'wave',
  VIDEO: 'timeline',
  MODELING: 'rig',
  WEB: 'code',
  CUSTOM: 'rig',
};

/** 档位缩略图：手绘工业风线稿（矢量在 44px 下远比位图清晰，且可随主题着色） */
function TierArt({ kind }: { kind: TierArtKind }) {
  return (
    <svg className="op-tier-svg" viewBox="0 0 48 48" aria-hidden focusable="false">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'wave' && (
          <>
            <path d="M6 30h36" stroke="rgba(243,90,23,.3)" strokeWidth="1" />
            <path
              d="M8 30l3-10 3 16 4-22 4 26 4-17 3 8 3-5 3 3 3-2"
              stroke="#e8641f"
              strokeWidth="1.7"
            />
            <circle cx="38" cy="14" r="2.2" stroke="rgba(27,30,35,.35)" strokeWidth="1" />
            <path
              d="M8 38h32"
              stroke="rgba(27,30,35,.16)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </>
        )}
        {kind === 'timeline' && (
          <>
            {/* 时间轴轨道 + 关键帧菱形 + 播放头 */}
            <path d="M6 15h36" stroke="rgba(27,30,35,.24)" strokeWidth="1.4" />
            <path d="M6 30h36" stroke="rgba(27,30,35,.14)" strokeWidth="1.2" />
            <path d="M6 38h36" stroke="rgba(27,30,35,.14)" strokeWidth="1.2" />
            {([12, 22, 32] as const).map((x, i) => (
              <path
                key={x}
                d={`M${x} ${[15, 30, 38][i]}l3-3 3 3-3 3Z`}
                fill="#e8641f"
                stroke="none"
              />
            ))}
            <path d="M39 6v20" stroke="rgba(243,90,23,.8)" strokeWidth="1.6" />
            <path d="M36.5 6h5" stroke="#f3702e" strokeWidth="1.6" />
            <circle cx="39" cy="26" r="1.8" fill="#f3702e" stroke="none" />
          </>
        )}
        {kind === 'rig' && (
          <>
            <path d="M24 6L40 18 34 40 14 40 8 18Z" stroke="#e8641f" strokeWidth="1.5" />
            <path
              d="M24 6L24 40M8 18L34 40M40 18L14 40"
              stroke="rgba(232,100,31,.45)"
              strokeWidth="1"
              strokeDasharray="3 2.4"
            />
            {(
              [
                [24, 6],
                [40, 18],
                [34, 40],
                [14, 40],
                [8, 18],
                [24, 23],
              ] as const
            ).map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#f3702e" stroke="none" />
            ))}
          </>
        )}
        {kind === 'code' && (
          <>
            {/* 终端窗口 + </> + 响应式两端 */}
            <rect x="6" y="9" width="36" height="27" rx="3" stroke="#e8641f" strokeWidth="1.5" />
            <path d="M6 16h36" stroke="rgba(27,30,35,.22)" strokeWidth="1.2" />
            <circle cx="10.5" cy="12.5" r="1.1" fill="#f3702e" stroke="none" />
            <circle cx="14.5" cy="12.5" r="1.1" fill="rgba(232,100,31,.5)" stroke="none" />
            <path
              d="M17 22l-4 4.5L17 31M27 22l4 4.5L27 31"
              stroke="#e8641f"
              strokeWidth="1.6"
            />
            <path d="M23.5 20.5l-3 12" stroke="rgba(243,90,23,.55)" strokeWidth="1.4" />
            <rect x="12" y="39" width="10" height="4.5" rx="1.4" fill="rgba(232,100,31,.55)" stroke="none" />
            <rect x="27" y="39" width="10" height="4.5" rx="1.4" stroke="rgba(27,30,35,.3)" strokeWidth="1" />
          </>
        )}
      </g>
    </svg>
  );
}

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
  const [budgetMin, setBudgetMin] = useState(50);
  const [budgetMax, setBudgetMax] = useState(200);
  const [brief, setBrief] = useState('');
  const [demo, setDemo] = useState(false);
  const [agree, setAgree] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  /** 品类卡筛选：null = 全部 */
  const [focusCat, setFocusCat] = useState<ServiceCategory | null>(null);
  const [error, setError] = useState('');
  const [pushing, setPushing] = useState<'idle' | 'sending' | 'done'>('idle');
  const [pushNote, setPushNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const active = useMemo(() => products.filter((p) => p.active), [products]);
  const shown = useMemo(
    () => (focusCat ? active.filter((p) => p.category === focusCat) : active),
    [active, focusCat],
  );

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

  /** 品类卡：联动滑块数值 + 筛选细分服务 */
  const applyCard = (card: (typeof CATEGORY_CARDS)[number]) => {
    setBudgetMin(card.range[0]);
    setBudgetMax(card.range[1]);
    setFocusCat(card.cat);
  };

  /** 点选细分服务：带入预算与描述 */
  const pickItem = (p: ServiceProduct) => {
    setPicked(p);
    setError('');
    const lo = Math.max(BUDGET_FLOOR, Math.min(p.price, BUDGET_CEIL));
    const hi = Math.min(BUDGET_CEIL, Math.max(lo + BUDGET_STEP, lo * 2));
    setBudgetMin(lo);
    setBudgetMax(hi);
    setBrief((cur) =>
      cur.trim()
        ? cur
        : `${p.name}：${p.description}`,
    );
  };

  const submit = () => {
    if (!picked) return;
    const n = name.trim();
    const c = contact.trim();
    const b = brief.trim();
    if (!n) return setError('请填写你的称呼');
    if (!c) return setError('请留下可联系到你的账号');
    if (b.length < 6) return setError('需求描述至少 6 个字，方便准确报价');
    if (!agree)
      return setError('请先阅读并勾选同意《工作室合作须知与 AI 作业免责条款》');

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
      consent: true,
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
      serviceItem: picked.name,
      clientName: created.clientName,
      contactType: created.contactType,
      contact: created.contact,
      budget: created.budget,
      brief: created.brief,
      demo: created.demo,
      consent: true,
      createdAt: created.createdAt,
    })
      .then((r) => {
        setPushing('done');
        if (r.mail === 'ok') setPushNote('通知已推送至邮箱');
        else if (r.mail === 'fail')
          setPushNote('邮件通道未激活（订单已保存，可先通过微信/QQ 联系）');
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
    setAgree(false);
    setFocusCat(null);
  };

  /* ---------------- 《合作须知与免责条款》毛玻璃阅读抽屉 ---------------- */
  const termsDrawer =
    typeof document !== 'undefined' && termsOpen
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="工作室合作须知与 AI 作业免责条款"
            className="fixed inset-0 z-[95] flex items-end justify-center bg-black/35 backdrop-blur-[3px] sm:items-center"
            onClick={() => setTermsOpen(false)}
          >
            <div
              className="os-sheet-in max-h-[82dvh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border border-white/40 bg-white/75 p-5 shadow-[0_-18px_60px_rgba(46,36,24,0.25)] backdrop-blur-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className={LABEL}>COMMISSION TERMS</div>
                  <div className="text-[13px] font-semibold tracking-[0.04em] text-ink">
                    工作室合作须知与 AI 作业免责条款
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTermsOpen(false)}
                  className="rounded-full border border-black/10 px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-ink/55 transition-colors hover:border-black/25 hover:text-ink"
                >
                  关闭 ✕
                </button>
              </div>
              <ol className="space-y-3">
                {TERMS_SECTIONS.map((s) => (
                  <li
                    key={s.title}
                    className="rounded-xl border border-black/[0.07] bg-white/60 p-3.5"
                  >
                    <div className="font-mono text-[9px] font-semibold tracking-[0.1em] text-[#F35A17]">
                      {s.title}
                    </div>
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink/65">
                      {s.body}
                    </p>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => {
                  setAgree(true);
                  setTermsOpen(false);
                }}
                className="os-btn-accent mt-4 w-full rounded-lg py-2.5 font-mono text-[10px] tracking-[0.2em]"
              >
                已阅读，同意以上条款 ✓
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  /* ---------------- 提交回执 ---------------- */
  if (view === 'done' && order) {
    return (
      <div className="os-sheet-in space-y-4">
        {termsDrawer}
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
              <span className="text-ink/30">BUDGET</span>
              <span className="truncate text-right text-ink/85">
                {order.budget}
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

  /* ---------------- 委托表单（R63：双列网格 · 一屏到底） ---------------- */
  if (view === 'form' && picked) {
    return (
      <div className="os-sheet-in op-form">
        {termsDrawer}
        {/* 顶部：返回 + 服务摘要条 */}
        <div className="op-form-head">
          <button
            type="button"
            onClick={() => setView('list')}
            className="op-form-back"
          >
            ← 返回服务列表
          </button>
          <div className="op-form-svc">
            <span className="op-form-svc-cat">{CATEGORY_EN[picked.category]}</span>
            <b>{picked.name}</b>
            <i className="op-num">
              {priceLine(picked)} · {picked.turnaround}
            </i>
          </div>
        </div>

        {/* AI 辅助增效透明化声明 */}
        <p className="flex items-start gap-1.5 rounded-lg border border-[#E08E00]/25 bg-[#E08E00]/[0.07] px-3 py-2 text-[9px] leading-relaxed text-ink/55">
          <span aria-hidden className="shrink-0">⚡</span>
          <span>
            作业模式：AI 尖端工具提效生成 + 人工专业工程精修/排障/落地，极速高性价比交付。
          </span>
        </p>

        <div className="op-form-grid">
          {/* —— 左列：称呼 / 联系方式 / 预算档位 —— */}
          <div className="op-form-col">
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
                <span className={`${LABEL} mb-1`}>预算档位 / TIER</span>
                <span className="font-mono text-[8px] tracking-[0.14em] text-ink/30">
                  CNY
                </span>
              </div>
              <div className="op-budget-presets">
                {CATEGORY_CARDS.map((card) => {
                  const on =
                    budgetMin === card.range[0] && budgetMax === card.range[1];
                  const label = `¥${card.range[0]} - ${card.range[1]}${card.plus ? '+' : ''}`;
                  return (
                    <button
                      key={card.cat}
                      type="button"
                      aria-pressed={on}
                      onClick={() => applyCard(card)}
                      className={`op-tier${on ? ' is-on' : ''}`}
                    >
                      <span className="op-tier-art" aria-hidden>
                        <TierArt kind={TIER_ART[card.cat]} />
                      </span>
                      <span className="op-tier-txt">
                        <b className="op-num">
                          {card.emoji} {label}
                        </b>
                        <i>{card.name}</i>
                      </span>
                      {on && (
                        <span aria-hidden className="op-tier-check">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* —— 右列：预算微调 / 细分服务 / 需求描述 / 试听小样 —— */}
          <div className="op-form-col">
            <div>
              <div className="flex items-baseline justify-between">
                <span className={`${LABEL} mb-1`}>预算区间 / BUDGET RANGE</span>
                <span className="font-mono text-[8px] tracking-[0.14em] text-ink/30">
                  CNY（人民币）· ¥50 起
                </span>
              </div>

              <div className="op-budget-echo op-budget-echo-sm" aria-live="polite">
                <span className="op-num">{money(budgetMin)}</span>
                <i>—</i>
                <span className="op-num">
                  {money(budgetMax)}
                  {budgetMax >= BUDGET_CEIL ? '+' : ''}
                </span>
              </div>

              <div className="op-budget">
                <div className="op-budget-track">
                  <i
                    style={
                      {
                        '--lo': pctMin,
                        '--hi': pctMax,
                      } as CSSProperties
                    }
                  />
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
            </div>

            {/* 细分服务价目表：点选带入预算与描述 */}
            <div>
              <div className="flex items-baseline justify-between">
                <span className={`${LABEL} mb-1`}>
                  细分服务 / SERVICE ITEM（点选带入）
                </span>
                <button
                  type="button"
                  onClick={() => setFocusCat(null)}
                  className={`font-mono text-[8px] tracking-[0.14em] transition-colors ${
                    focusCat
                      ? 'text-[#F35A17] hover:text-[#d94e1f]'
                      : 'text-ink/25'
                  }`}
                >
                  {focusCat ? `筛选：${CATEGORY_LABEL[focusCat]} ✕` : '全部类别'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {active
                  .filter((p) => !focusCat || p.category === focusCat)
                  .map((p) => {
                    const on = picked.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickItem(p)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-[9.5px] leading-tight transition-colors ${
                          on
                            ? 'border-[#E85D2A]/60 bg-[#E85D2A]/12 text-[#c8481c]'
                            : 'border-black/[0.09] text-ink/55 hover:border-black/25 hover:text-ink'
                        }`}
                      >
                        <span className="op-num">{money(p.price)}起</span>
                        <span className="mx-1 text-ink/20">·</span>
                        {p.name}
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
                className={`${FIELD} op-form-brief`}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="请简述您的项目用途、参考风格（Reference）、预计时长、交付周期要求等..."
                maxLength={800}
              />
              <div className="op-form-hint mt-1 flex items-center justify-between font-mono text-[7.5px] tracking-[0.1em] text-ink/25">
                <span>用途 · 参考 · 时长 · 交付周期</span>
                <span className="op-num">{brief.length}/800</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDemo((v) => !v)}
              aria-pressed={demo}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                demo
                  ? 'border-[#E85D2A]/50 bg-[#E85D2A]/10'
                  : 'border-black/[0.08] hover:border-black/20'
              }`}
            >
              <span className="text-left">
                <span className="block text-[10.5px] text-ink/80">
                  申请免费试听小样（Demo Preview）
                </span>
                <span className="mt-0.5 block text-[8px] text-ink/30">
                  先试听方向小样，满意后再推进正式合作
                </span>
              </span>
              <span aria-hidden className={`os-switch${demo ? ' is-on' : ''}`}>
                <i />
              </span>
            </button>
          </div>
        </div>

        {/* 吸底提交条：免责确认 + 提交按钮永不离屏 */}
        <div className="op-form-foot">
          {error && (
            <p className="op-form-error">
              {error}
            </p>
          )}
          <div
            className={`mb-2 flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
              agree
                ? 'border-[#18A057]/45 bg-[#18A057]/[0.08]'
                : 'border-black/[0.1] hover:border-black/25'
            }`}
          >
            <button
              type="button"
              onClick={() => setAgree((v) => !v)}
              aria-pressed={agree}
              aria-label="同意合作须知与免责条款"
              className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] transition-colors ${
                agree
                  ? 'border-[#18A057] bg-[#18A057] text-white'
                  : 'border-black/25 bg-white text-transparent'
              }`}
            >
              ✓
            </button>
            <span className="text-[9.5px] leading-relaxed text-ink/70">
              我已阅读并同意
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="mx-0.5 font-semibold text-[#F35A17] underline decoration-[#F35A17]/40 underline-offset-2 hover:decoration-[#F35A17]"
              >
                《工作室合作须知与 AI 作业免责条款》
              </button>
              （50%定金排期 / 免费微调2次）*
            </span>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="os-btn-accent op-form-submit"
          >
            {sending ? '正在发送需求...' : '提交定制需求 · SUBMIT'}
          </button>
          <p className="op-form-note">
            50% 定金排期 · 需求范围内含 2 次免费微调 · 48 小时内响应
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- 服务列表 ---------------- */
  return (
    <div className="space-y-3">
      {termsDrawer}
      <div>
        <div className="text-[13px] font-semibold tracking-[0.06em] text-ink">
          {lang === 'zh' ? '定制合作' : 'COMMISSION'}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-ink/40">
          {lang === 'zh'
            ? '音频、视频、3D 皮套与网站开发，¥50 起接。选一项，填表即可。'
            : 'Audio, video, 3D models & web dev from ¥50. Pick one and fill the brief.'}
        </p>
        {/* AI 辅助增效透明化声明横幅 */}
        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#E08E00]/25 bg-[#E08E00]/[0.07] px-3 py-2 text-[9px] leading-relaxed text-ink/55">
          <span aria-hidden className="shrink-0">⚡</span>
          <span>
            作业模式：AI 尖端工具提效生成 + 人工专业工程精修/排障/落地，极速高性价比交付。
          </span>
        </p>
      </div>

      {/* 品类筛选卡：点按联动预算滑块 + 筛选服务 */}
      <div className="grid grid-cols-2 gap-1.5">
        {CATEGORY_CARDS.map((card) => {
          const on = focusCat === card.cat;
          return (
            <button
              key={card.cat}
              type="button"
              aria-pressed={on}
              onClick={() => setFocusCat(on ? null : card.cat)}
              className={`rounded-xl border p-2.5 text-left transition-colors ${
                on
                  ? 'border-[#E85D2A]/60 bg-[#E85D2A]/[0.08]'
                  : 'border-black/[0.08] bg-black/[0.015] hover:border-black/25'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden className="text-[13px]">{card.emoji}</span>
                <b className="truncate text-[10.5px] font-semibold text-ink">
                  {card.name}
                </b>
              </div>
              <div className="mt-1 font-mono text-[9px] text-[#F35A17]">
                ¥{card.range[0]} - {card.range[1]}
                {card.plus ? '+' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {!hydrated && (
        <div className="py-6 text-center font-mono text-[9px] tracking-[0.2em] text-ink/30">
          LOADING SERVICES…
        </div>
      )}

      {hydrated && shown.length === 0 && (
        <div className="rounded-lg border border-black/[0.08] py-8 text-center text-[10px] text-ink/35">
          {lang === 'zh' ? '该品类暂无服务，看看其它。' : 'No services in this category.'}
        </div>
      )}

      {shown.map((p) => (
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
          ? '50% 定金排期 · 需求范围内包 2 次免费微调 · 超限 ¥20/次'
          : '50% deposit to schedule · 2 free revisions · ¥20 per extra revision'}
      </p>
    </div>
  );
}
