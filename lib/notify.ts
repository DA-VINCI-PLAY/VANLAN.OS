/**
 * notify —— 订单实时推送（R58）
 *
 * 两条通道，都是纯前端调用、无需自建后端：
 *   主：FormSubmit AJAX → 直发 Gmail（首次提交会收到激活邮件，点一下 Activate 即可）
 *   副：PushPlus → 微信聊天列表弹窗（token 由管理员在后台填写）
 *
 * 设置存在 localStorage('vanlan_notify')，后台可改；默认接收邮箱 VANLAN0127@gmail.com。
 * 所有请求都是 fire-and-forget，失败不阻断下单流程。
 */

export const NOTIFY_KEY = 'vanlan_notify';
export const DEFAULT_NOTIFY_EMAIL = 'VANLAN0127@gmail.com';

export interface NotifySettings {
  enabled: boolean;
  /** 主接收邮箱（Gmail） */
  primaryEmail: string;
  /** 备用邮箱（QQ / 163 等，留空则不额外发） */
  backupEmail: string;
  /** PushPlus token（留空则跳过微信推送） */
  pushplusToken: string;
}

const DEFAULT_SETTINGS: NotifySettings = {
  enabled: true,
  primaryEmail: DEFAULT_NOTIFY_EMAIL,
  backupEmail: '',
  pushplusToken: '',
};

export function readNotifySettings(): NotifySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(NOTIFY_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotifySettings>;
    return {
      enabled: parsed.enabled !== false,
      primaryEmail: (parsed.primaryEmail || DEFAULT_NOTIFY_EMAIL).trim(),
      backupEmail: (parsed.backupEmail || '').trim(),
      pushplusToken: (parsed.pushplusToken || '').trim(),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeNotifySettings(next: NotifySettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFY_KEY, JSON.stringify(next));
  } catch {
    /* 配额满 / 隐私模式：静默降级 */
  }
}

export interface NotifyPayload {
  orderId: string;
  serviceName: string;
  clientName: string;
  contactType: string;
  contact: string;
  budget: string;
  brief: string;
  demo: boolean;
  createdAt: string;
}

export type ChannelStatus = 'ok' | 'fail' | 'skip';

export interface NotifyResult {
  mail: ChannelStatus;
  backup: ChannelStatus;
  push: ChannelStatus;
}

const FORM_SUBMIT = (email: string) =>
  `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;

const PUSHPLUS = 'https://www.pushplus.plus/send';

async function sendMail(email: string, p: NotifyPayload): Promise<ChannelStatus> {
  if (!email) return 'skip';
  try {
    const res = await fetch(FORM_SUBMIT(email), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: `[VANLAN.OS] 新委托 ${p.orderId} · ${p.serviceName}`,
        _template: 'table',
        _captcha: 'false',
        订单号: p.orderId,
        服务项目: p.serviceName,
        客户称呼: p.clientName,
        联系方式: `${p.contactType} · ${p.contact}`,
        预算区间: p.budget,
        需要试听小样: p.demo ? '是' : '否',
        需求描述: p.brief,
        提交时间: new Date(p.createdAt).toLocaleString('zh-CN', { hour12: false }),
      }),
    });
    return res.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

async function sendPush(p: NotifyPayload, token: string): Promise<ChannelStatus> {
  if (!token) return 'skip';
  try {
    const res = await fetch(PUSHPLUS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: `新委托 · ${p.orderId}`,
        template: 'html',
        content: [
          `<h3>${p.serviceName}</h3>`,
          `<p><b>客户：</b>${p.clientName}</p>`,
          `<p><b>联系：</b>${p.contactType} · ${p.contact}</p>`,
          `<p><b>预算：</b>${p.budget}</p>`,
          `<p><b>试听小样：</b>${p.demo ? '需要' : '不需要'}</p>`,
          `<p><b>需求：</b>${p.brief}</p>`,
          `<p style="color:#888">${p.orderId} · ${new Date(p.createdAt).toLocaleString('zh-CN', { hour12: false })}</p>`,
        ].join(''),
      }),
    });
    const json = (await res.json().catch(() => null)) as { code?: number } | null;
    if (!res.ok) return 'fail';
    return !json || json.code === undefined || json.code === 200 ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

/** 下单后调用：并发发送三条通道，永不 throw */
export async function notifyOrder(p: NotifyPayload): Promise<NotifyResult> {
  const s = readNotifySettings();
  if (!s.enabled) return { mail: 'skip', backup: 'skip', push: 'skip' };

  const [mail, backup, push] = await Promise.all([
    sendMail(s.primaryEmail, p),
    s.backupEmail && s.backupEmail !== s.primaryEmail
      ? sendMail(s.backupEmail, p)
      : Promise.resolve<ChannelStatus>('skip'),
    sendPush(p, s.pushplusToken),
  ]);

  return { mail, backup, push };
}

/** 后台「发送测试通知」：发一封标记为 TEST 的邮件 + 一条微信推送 */
export async function notifyTest(): Promise<NotifyResult> {
  const now = new Date().toISOString();
  return notifyOrder({
    orderId: 'TEST-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    serviceName: '推送测试 / TEST PING',
    clientName: 'VANLAN.OS',
    contactType: 'System',
    contact: 'admin console',
    budget: '—',
    brief: '这是一条来自管理后台的测试通知，收到即表示通道正常。',
    demo: false,
    createdAt: now,
  });
}
