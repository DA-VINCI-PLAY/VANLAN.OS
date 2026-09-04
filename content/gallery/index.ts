/**
 * GALLERY —— 视觉作品展内容数据（MV / Vlog / Short / Interview / Analysis）。
 *
 * 更新 / 增删作品只改这个文件，无需改动任何组件。详细步骤见 content/README.md。
 *
 * 字段说明：
 *  - id          : 稳定唯一标识（英文短横线），供缩略图/跳转引用
 *  - title       : 作品标题
 *  - type        : MV / Vlog / Short / Interview / Analysis / Other
 *  - year        : 年份
 *  - description : 简介
 *  - url         : 外链（Bilibili 等）或 /public 下的视频页，'#' = 待补充
 *
 * 如需本地封面/缩略图，图片放 public/gallery/，然后在 entry 里加 cover 字段引用。
 */
export interface GalleryEntry {
  id: string;
  title: string;
  /** MV / Vlog / Short / Interview / Analysis / Other */
  type: string;
  year: number;
  description: string;
  /** 外链或 /public 下的视频页，'#' = 待补充 */
  url: string;
}

export const GALLERY: GalleryEntry[] = [
  {
    id: 'vlog-gaga-party-2026',
    title: '我以为我只是去参加一个Party，直到我真的到了现场',
    type: 'Vlog',
    year: 2026,
    description:
      '第一次参加Gaga Party，所以决定把这一天完整记录下来。从出发前的期待，到真正进入现场，再到Party结束后的情绪，这支Vlog没有刻意做成"完美的一天"，而是想留下一个很真实的体验记录。',
    url: 'https://www.bilibili.com/video/BV1aeuD6sEy3',
  },
  {
    id: 'vlog-hcy-shenzhen-2026',
    title: '华晨宇深圳生日场火星演唱会-高中生vlog',
    type: 'Vlog',
    year: 2026,
    description:
      '华晨宇深圳生日场火星演唱会-高中生vlog。本视频主要以后个人视角进行叙事，涉及到较多个人观点个人经历请理性判断分辨。',
    url: 'https://www.bilibili.com/video/BV1tJZVBFEHz',
  },
  {
    id: 'short-killah-furry-2026',
    title: 'KILLAH FURRY',
    type: 'Short',
    year: 2026,
    description: '12 秒碎片。',
    url: 'https://www.bilibili.com/video/BV1w2ikBUE1q',
  },
];
