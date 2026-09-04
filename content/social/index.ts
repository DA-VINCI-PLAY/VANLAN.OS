/**
 * SOCIAL —— 联系方式 / 社交渠道内容数据（唯一的联系事实源）。
 *
 * 改微信 / 换 QQ / 更新各平台链接，都只改这个文件，无需改动任何组件。
 * 详细步骤见 content/README.md。
 *
 * 字段说明：
 *  - platform : 展示名（全大写英文 / 中文）
 *  - handle   : 展示用的账号名/昵称
 *  - action   : 点击后的行为
 *      · link = 打开网址（value = URL）
 *      · qr   = 展示二维码（value = /public/social/<id>-qr.png 的路径）
 *      · copy = 复制文本（value = 要复制的内容，复制后按钮短暂显示 COPIED）
 *      · qq   = 按设备 UA 唤起 QQ 加好友（value = QQ 号）
 *  - value    : 见 action 说明
 */

export interface SocialEntry {
  id: string;
  platform: string;
  handle: string;
  action: 'link' | 'qr' | 'copy' | 'qq';
  value: string;
}

/** QQ 号（全局唯一事实源：SOCIALS 的 qq 项 + lib/qq.ts 的加好友协议都从这里取） */
export const QQ_UIN = '1787613907';

export const SOCIALS: SocialEntry[] = [
  {
    id: 'wechat',
    platform: 'WECHAT',
    handle: 'ID: VANLAN_PLAY',
    action: 'copy',
    value: 'VANLAN_PLAY',
  },
  {
    id: 'qq',
    platform: 'QQ',
    handle: QQ_UIN,
    action: 'qq',
    value: QQ_UIN,
  },
  {
    id: 'bilibili',
    platform: 'BILIBILI',
    handle: 'VANLAN梵岚',
    action: 'link',
    value: 'https://space.bilibili.com/622920233',
  },
  {
    id: 'douyin',
    platform: 'DOUYIN',
    handle: 'VANLAN-梵岚',
    action: 'link',
    value: 'https://www.douyin.com/user/MS4wLjABAAAAVV2pcc0Q08E7dZiNrrWVpglhJTrQwFUcelpeJS20x9FpNGPckARxWZHSyBZ5p48l',
  },
  {
    id: 'xiaohongshu',
    platform: 'XIAOHONGSHU',
    handle: 'VANLAN(梵岚)YU',
    action: 'link',
    value: 'https://www.xiaohongshu.com/user/profile/5e63321a0000000001007938',
  },
  {
    id: 'x',
    platform: 'X',
    handle: '@VANLAN_01277',
    action: 'link',
    value: 'https://x.com/VANLAN_01277',
  },
  {
    id: 'instagram',
    platform: 'INSTAGRAM',
    handle: '@vanlanplay',
    action: 'link',
    value: 'https://www.instagram.com/vanlanplay/',
  },
  {
    id: 'threads',
    platform: 'THREADS',
    handle: '@vanlanplay',
    action: 'link',
    value: 'https://www.threads.com/@vanlanplay',
  },
  {
    id: 'youtube',
    platform: 'YOUTUBE',
    handle: '@VANLANPLAY',
    action: 'link',
    value: 'https://www.youtube.com/@VANLANPLAY',
  },
];
