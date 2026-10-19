'use client';

/**
 * AdminConsole —— 管理员专属控制台（R51）
 *
 * 鉴权：右上角 SYS // AUTH 触发；口令 901888！
 *   verifyAdminPasscode 做 NFKC 归一化 → 全角「！」与半角「!」等价，
 *   首尾空格 / 零宽字符自动剔除。
 *
 * 解锁后（同一会话内保持）：
 *   PRODUCTS —— 服务上下架 CRUD（名称 / 分类 / 价格 / 周期 / 描述 / 交付项 / 封面）
 *   ORDERS   —— 访客委托单列表，状态流转 待沟通 → 制作中 → 已交付，
 *               支持 JSON / CSV 导出与一键清空。
 *
 * 数据：lib/commerce 的 localStorage 持久化（vanlan_products / vanlan_orders）。
 */

import { useEffect, useMemo, useState } from 'react';
import { useOS } from '@/lib/store';
import {
  ORDER_FLOW,
  ORDER_STATUS_EN,
  ORDER_STATUS_LABEL,
  downloadText,
  ordersToCSV,
  ordersToJSON,
  useCommerce,
  verifyAdminPasscode,
  type OrderStatus,
  type ProductDraft,
} from '@/lib/commerce';
import {
  CATEGORY_EN,
  CATEGORY_LABEL,
  type ServiceCategory,
} from '@/content/services';

type Tab = 'products' | 'orders';

const CATEGORIES: ServiceCategory[] = [
  'COMPOSER',
  'MIXING',
  'MODELING',
  'CUSTOM',
];

const FIELD =
  'w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[12px] text-ink placeholder:text-ink/25 outline-none transition-colors duration-200 focus:border-[#E82127]/60';
const LABEL = 'mb-1 block font-mono text-[8px] tracking-[0.2em] text-ink/40';

const EMPTY_DRAFT: ProductDraft = {
  name: '',
  category: 'COMPOSER',
  price: 0,
  turnaround: '',
  description: '',
  deliverables: [],
  cover: '',
  active: true,
};

export default function AdminConsole() {
  const open = useOS((s) => s.adminOpen);
  const setOpen = useOS((s) => s.setAdminOpen);
  const unlocked = useOS((s) => s.adminUnlocked);
  const setUnlocked = useOS((s) => s.setAdminUnlocked);

  const hydrate = useCommerce((s) => s.hydrate);
  const products = useCommerce((s) => s.products);
  const orders = useCommerce((s) => s.orders);
  const addProduct = useCommerce((s) => s.addProduct);
  const updateProduct = useCommerce((s) => s.updateProduct);
  const toggleProduct = useCommerce((s) => s.toggleProduct);
  const removeProduct = useCommerce((s) => s.removeProduct);
  const advanceOrder = useCommerce((s) => s.advanceOrder);
  const removeOrder = useCommerce((s) => s.removeOrder);
  const clearOrders = useCommerce((s) => s.clearOrders);

  const [pass, setPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('products');
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (open) hydrate();
  }, [open, hydrate]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const stats = useMemo(() => {
    const activeCount = products.filter((p) => p.active).length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    return { activeCount, pending, delivered, total: products.length };
  }, [products, orders]);

  if (!open) return null;

  /* ---------------- 口令闸门 ---------------- */
  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5 backdrop-blur-md">
        <div className="os-sheet-in w-full max-w-[340px] rounded-2xl border border-white/[0.08] bg-[rgba(16,18,22,0.96)] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.28em] text-[#E82127]">
              SYS // AUTH
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-[14px] leading-none text-ink/30 transition-colors hover:text-ink"
            >
              ×
            </button>
          </div>

          <h2 className="mt-4 text-[15px] font-semibold tracking-[0.1em] text-ink">
            管理员验证
          </h2>
          <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink/35">
            输入访问口令以解锁商品与订单控制台。
          </p>

          <input
            autoFocus
            type="password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setAuthError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (verifyAdminPasscode(pass)) {
                  setUnlocked(true);
                  setPass('');
                } else setAuthError('口令不正确');
              }
            }}
            placeholder="PASSCODE"
            aria-label="Admin passcode"
            className={`${FIELD} mt-4 text-center font-mono tracking-[0.3em]`}
          />

          {authError && (
            <p className="mt-2 text-center font-mono text-[9px] tracking-[0.1em] text-[#ff8f92]">
              {authError}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              if (verifyAdminPasscode(pass)) {
                setUnlocked(true);
                setPass('');
              } else setAuthError('口令不正确');
            }}
            className="os-btn-accent mt-3 w-full rounded-lg py-2.5 font-mono text-[10px] font-semibold tracking-[0.22em]"
          >
            UNLOCK
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- 控制台 ---------------- */
  const submitProduct = () => {
    const clean: ProductDraft = {
      ...draft,
      name: draft.name.trim(),
      turnaround: draft.turnaround.trim(),
      description: draft.description.trim(),
      price: Math.max(0, Math.round(Number(draft.price) || 0)),
      deliverables: draft.deliverables
        .map((d) => d.trim())
        .filter(Boolean),
      cover: (draft.cover || '').trim(),
    };
    if (!clean.name) return;
    if (editingId) {
      updateProduct(editingId, clean);
    } else {
      addProduct(clean);
    }
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  const startEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setDraft({
      name: p.name,
      category: p.category,
      price: p.price,
      turnaround: p.turnaround,
      description: p.description,
      deliverables: p.deliverables,
      cover: p.cover ?? '',
      active: p.active,
    });
    setTab('products');
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#090A0C]/97 backdrop-blur-lg">
      {/* 顶栏 */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-[0.28em] text-[#E82127]">
            ADMIN
          </span>
          <span className="font-mono text-[8px] tracking-[0.18em] text-ink/30 max-sm:hidden">
            VANLAN.OS CONTROL
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] tracking-[0.12em] text-ink/30 max-sm:hidden">
            {stats.activeCount} ONLINE · {stats.pending} PENDING
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close admin console"
            className="rounded-full border border-white/10 px-3 py-1 font-mono text-[9px] tracking-[0.14em] text-ink/55 transition-colors hover:border-white/30 hover:text-ink"
          >
            EXIT
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-white/[0.06] px-4 py-2 sm:px-6">
        {(['products', 'orders'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-full px-3.5 py-1.5 font-mono text-[9px] tracking-[0.18em] transition-colors ${
              tab === t
                ? 'bg-[#E82127] text-white'
                : 'text-ink/45 hover:text-ink/80'
            }`}
          >
            {t === 'products' ? `SERVICES · ${products.length}` : `ORDERS · ${orders.length}`}
          </button>
        ))}
      </div>

      {/* 内容 */}
      <div className="os-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {tab === 'products' ? (
          <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-[380px_1fr]">
            {/* 编辑表单 */}
            <section className="h-fit rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className={LABEL.replace('mb-1', 'mb-0')}>
                  {editingId ? 'EDIT SERVICE' : 'NEW SERVICE'}
                </span>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(EMPTY_DRAFT);
                    }}
                    className="font-mono text-[8px] tracking-[0.14em] text-ink/35 hover:text-ink"
                  >
                    CANCEL
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <label className={LABEL} htmlFor="p-name">名称</label>
                  <input
                    id="p-name"
                    className={FIELD}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="原创编曲 / 定制 BGM"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={LABEL} htmlFor="p-cat">类别</label>
                    <select
                      id="p-cat"
                      className={FIELD}
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          category: e.target.value as ServiceCategory,
                        })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-[#12141A]">
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="p-price">起步价 ¥</label>
                    <input
                      id="p-price"
                      type="number"
                      min={0}
                      className={FIELD}
                      value={draft.price}
                      onChange={(e) =>
                        setDraft({ ...draft, price: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL} htmlFor="p-turn">交付周期</label>
                  <input
                    id="p-turn"
                    className={FIELD}
                    value={draft.turnaround}
                    onChange={(e) =>
                      setDraft({ ...draft, turnaround: e.target.value })
                    }
                    placeholder="7–10 天"
                  />
                </div>

                <div>
                  <label className={LABEL} htmlFor="p-desc">详细描述</label>
                  <textarea
                    id="p-desc"
                    className={`${FIELD} min-h-[64px] resize-none`}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={LABEL} htmlFor="p-deliv">
                    包含项（每行一条）
                  </label>
                  <textarea
                    id="p-deliv"
                    className={`${FIELD} min-h-[64px] resize-none`}
                    value={draft.deliverables.join('\n')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        deliverables: e.target.value.split('\n'),
                      })
                    }
                  />
                </div>

                <div>
                  <label className={LABEL} htmlFor="p-cover">封面图 URL（可选）</label>
                  <input
                    id="p-cover"
                    className={FIELD}
                    value={draft.cover}
                    onChange={(e) => setDraft({ ...draft, cover: e.target.value })}
                    placeholder="/covers/xxx.png"
                  />
                </div>

                <label className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2">
                  <span className="text-[10px] text-ink/60">立即上架</span>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) =>
                      setDraft({ ...draft, active: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#E82127]"
                  />
                </label>

                <button
                  type="button"
                  onClick={submitProduct}
                  className="os-btn-accent w-full rounded-lg py-2.5 font-mono text-[9px] font-semibold tracking-[0.2em]"
                >
                  {editingId ? 'SAVE CHANGES' : 'ADD SERVICE'}
                </button>
              </div>
            </section>

            {/* 列表 */}
            <section className="space-y-2">
              {products.length === 0 && (
                <div className="rounded-xl border border-white/[0.08] py-12 text-center text-[10px] text-ink/30">
                  暂无服务，先在左侧创建。
                </div>
              )}
              {products.map((p) => (
                <article
                  key={p.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    p.active
                      ? 'border-white/[0.08] bg-white/[0.02]'
                      : 'border-white/[0.04] bg-white/[0.01] opacity-55'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[8px] tracking-[0.18em] text-[#E82127]">
                        {CATEGORY_EN[p.category]}
                        {!p.active && ' · OFFLINE'}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] font-semibold text-ink">
                        {p.name}
                      </div>
                      <div className="mt-1 font-mono text-[9px] text-ink/35">
                        ¥{p.price.toLocaleString('zh-CN')} · {p.turnaround || '—'} ·{' '}
                        {p.deliverables.length} items
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleProduct(p.id)}
                        className={`rounded-md border px-2 py-1 font-mono text-[8px] tracking-[0.12em] transition-colors ${
                          p.active
                            ? 'border-[#3ddc84]/30 text-[#3ddc84] hover:bg-[#3ddc84]/10'
                            : 'border-white/15 text-ink/45 hover:text-ink'
                        }`}
                      >
                        {p.active ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(p.id)}
                        className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-ink/50 hover:border-white/25 hover:text-ink"
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-ink/35 hover:border-[#E82127]/50 hover:text-[#E82127]"
                      >
                        DEL
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>
        ) : (
          /* ---------------- 订单 ---------------- */
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.16em] text-ink/35">
                {orders.length} TOTAL · {stats.pending} PENDING · {stats.delivered} DELIVERED
              </span>
              <span className="flex-1" />
              <button
                type="button"
                disabled={orders.length === 0}
                onClick={() =>
                  downloadText(
                    `vanlan-orders-${Date.now()}.json`,
                    ordersToJSON(orders),
                    'application/json',
                  )
                }
                className="rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[8px] tracking-[0.14em] text-ink/60 transition-colors hover:border-white/30 hover:text-ink disabled:opacity-30"
              >
                EXPORT JSON
              </button>
              <button
                type="button"
                disabled={orders.length === 0}
                onClick={() =>
                  downloadText(
                    `vanlan-orders-${Date.now()}.csv`,
                    ordersToCSV(orders),
                    'text/csv;charset=utf-8',
                  )
                }
                className="rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[8px] tracking-[0.14em] text-ink/60 transition-colors hover:border-white/30 hover:text-ink disabled:opacity-30"
              >
                EXPORT CSV
              </button>
              <button
                type="button"
                disabled={orders.length === 0}
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    window.setTimeout(() => setConfirmClear(false), 4000);
                    return;
                  }
                  clearOrders();
                  setConfirmClear(false);
                }}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[8px] tracking-[0.14em] transition-colors disabled:opacity-30 ${
                  confirmClear
                    ? 'border-[#E82127] bg-[#E82127]/15 text-[#ff8f92]'
                    : 'border-white/10 text-ink/40 hover:border-[#E82127]/50 hover:text-[#E82127]'
                }`}
              >
                {confirmClear ? 'CONFIRM CLEAR?' : 'CLEAR ALL'}
              </button>
            </div>

            {orders.length === 0 && (
              <div className="rounded-xl border border-white/[0.08] py-16 text-center">
                <div className="font-mono text-[10px] tracking-[0.2em] text-ink/30">
                  NO ORDERS YET
                </div>
                <div className="mt-2 text-[9px] text-ink/25">
                  访客在「接单」页提交后会出现在这里。
                </div>
              </div>
            )}

            <div className="space-y-2">
              {orders.map((o) => {
                const isOpen = expanded === o.id;
                const idx = ORDER_FLOW.indexOf(o.status as OrderStatus);
                return (
                  <article
                    key={o.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] tracking-[0.12em] text-[#E82127]">
                            {o.id}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-[2px] font-mono text-[7.5px] tracking-[0.12em] ${
                              o.status === 'pending'
                                ? 'border-[#f2c14e]/35 text-[#f2c14e]'
                                : o.status === 'in_progress'
                                  ? 'border-[#12B7F5]/35 text-[#12B7F5]'
                                  : 'border-[#3ddc84]/35 text-[#3ddc84]'
                            }`}
                          >
                            {ORDER_STATUS_EN[o.status]}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-ink/80">
                          {o.serviceName}
                        </div>
                        <div className="mt-1 font-mono text-[8.5px] text-ink/35">
                          {o.clientName} · {o.contactType} {o.contact} · {o.budget} ·{' '}
                          {new Date(o.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => advanceOrder(o.id)}
                          disabled={idx >= ORDER_FLOW.length - 1}
                          className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-ink/55 transition-colors hover:border-white/30 hover:text-ink disabled:opacity-25"
                        >
                          {idx >= ORDER_FLOW.length - 1
                            ? 'DONE'
                            : `→ ${ORDER_STATUS_LABEL[ORDER_FLOW[idx + 1]]}`}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(isOpen ? null : o.id)
                          }
                          className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-ink/45 hover:border-white/25 hover:text-ink"
                        >
                          {isOpen ? 'HIDE' : 'BRIEF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOrder(o.id)}
                          aria-label={`Delete order ${o.id}`}
                          className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] text-ink/30 hover:border-[#E82127]/50 hover:text-[#E82127]"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                        <div>
                          <div className={LABEL}>BRIEF</div>
                          <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-ink/65">
                            {o.brief}
                          </p>
                        </div>
                        <div className="flex gap-4 font-mono text-[8.5px] text-ink/35">
                          <span>DEMO: {o.demo ? 'YES' : 'NO'}</span>
                          <span>
                            CREATED:{' '}
                            {new Date(o.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
