'use client';

import { QQ_UIN } from '@/content/social';

export { QQ_UIN };

/**
 * QQ 加好友 —— UA 自适配的协议层唤起工具。
 * 供 CONTACT 面板（ModePanels）与 3D 漂浮气泡（BubbleSystem）共用一份，
 * 避免两处各写一遍协议常量与降级逻辑。
 *
 * 三条通道：
 *  ① mqqapi://card/show_pslcard   手机端 → 唤起 QQ APP 打开资料卡
 *  ② tencent://AddContact          桌面端 → 唤起 QQ 客户端弹出添加好友窗口
 *  ③ wpa.qq.com                    网页旧版兜底（不唤起 APP，浏览器内聊天）
 *
 * 限制：微信内置浏览器（MicroMessenger）禁止 mqqapi/tencent 自定义协议，
 * 直接跳转会静默失败 → 调用方应降级为"复制号码 + 提示用户去浏览器打开"。
 */

export const QQ_ADD_MOBILE = `mqqapi://card/show_pslcard?src_type=internal&version=1&uin=${QQ_UIN}&card_type=person&source=sharecard`;

export const QQ_ADD_DESKTOP = `tencent://AddContact/?fromId=45&fromSubId=1&subcmd=all&uin=${QQ_UIN}`;

/** 网页旧版兜底：不唤起 APP，浏览器打开 QQ 网页会话 */
export const QQ_WEB = `http://wpa.qq.com/msgrd?v=3&uin=${QQ_UIN}&site=qq&menu=yes`;

export interface QqAddResult {
  /** 是否已成功发起协议跳转（true）。false = 需要调用方降级处理 */
  ok: boolean;
  /** true = 运行在微信内置浏览器（协议被禁的原因） */
  wechatBlocked?: boolean;
}

/**
 * 唤起 QQ 加好友。规则：移动端 mqqapi 资料卡 → 桌面 tencent:// AddContact。
 * 返回 { ok:false, wechatBlocked:true } = 微信内置浏览器，调用方应复制号码 + 提示。
 */
export function qqAdd(): QqAddResult {
  if (typeof navigator === 'undefined') return { ok: false };
  if (/MicroMessenger/i.test(navigator.userAgent))
    return { ok: false, wechatBlocked: true };
  const isMobile = /android|iphone|ipad/i.test(navigator.userAgent);
  window.location.href = isMobile ? QQ_ADD_MOBILE : QQ_ADD_DESKTOP;
  return { ok: true };
}
