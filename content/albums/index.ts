/**
 * 专辑内容数据 —— 唯一的专辑事实源。
 *
 * 更新专辑 / 加专辑 / 改曲目 / 换封面 / 换流媒体链接，都只改这个文件，
 * 无需改动任何组件。详细步骤见 content/README.md。
 *
 * 结构说明：
 *  - vanlan    : 罗马字/主名（必填，UI 唯一展示源）
 *  - zhName    : 中文名（可选，鼠标 hover / 长描述用）
 *  - english   : 英文描述（可选，国际化场景）
 *  - description: 长描述（必填，ALBUM 面板正文）
 *  - cover     : 封面图（空串 = 程序化封面），放 public/covers/
 *  - preview   : 整专试听（兼容旧数据，空串 = 走 track.src 或暂无）
 *  - tracks[].src : 单曲独立音源，放 public/audio/
 *
 * 历史：`title` 字段已弃用，新代码请用 `vanlan`。
 */

export interface StreamingLinks {
  netease?: string;
  qqMusic?: string;
  spotify?: string;
  [key: string]: string | undefined;
}

export interface AlbumTrack {
  title: string;
  duration: string;
  /** 单曲音源路径；缺省回落 album.preview */
  src?: string;
}

export interface Album {
  /** 罗马字/主名（UI 唯一展示源） */
  vanlan: string;
  /** 中文名（可选，hover/long desc 用） */
  zhName?: string;
  /** 英文名（可选，国际化） */
  english?: string;
  /** 封面图片路径，空串 = 程序化封面 */
  cover: string;
  /** 试听音频路径（整专单文件，兼容旧数据），空串 = 走 track.src 或暂无 */
  preview: string;
  year: number;
  accentColor: string;
  tracks: AlbumTrack[];
  streamingLinks: StreamingLinks;
  /** 长描述（ALBUM 面板正文） */
  description: string;
}

export const ALBUMS: Album[] = [
  {
    vanlan: 'DIAGNOSIS DIARY',
    zhName: '诊疗日志',
    english: 'Diagnosis Diary',
    cover: '/covers/diagnosis-diary.png',
    preview: '',
    year: 2026,
    accentColor: '#84343e',
    description:
      '诊疗日志 · 第一张全长专辑 —— 8 首 / 20 分钟。修普诺斯负责安眠，自怜狂负责沉溺，弗里达小姐负责痛，ALCOHOL 负责清醒，西西弗斯负责推石，臆想症负责夜里的回声。写给反复来就诊的人。',
    tracks: [
      { title: 'ARTFOREST', duration: '01:14', src: '/audio/01-artforest.mp3' },
      { title: '修普诺斯', duration: '02:38', src: '/audio/02-hypnos.mp3' },
      { title: '自怜狂', duration: '03:01', src: '/audio/03-selfpity.mp3' },
      { title: '弗里达小姐', duration: '02:49', src: '/audio/04-frida.mp3' },
      { title: '闪回', duration: '02:51', src: '/audio/05-flashback.mp3' },
      { title: 'ALCOHOL', duration: '02:30', src: '/audio/06-alcohol.mp3' },
      { title: '西西弗斯', duration: '02:46', src: '/audio/07-sisyphus.mp3' },
      { title: '臆想症', duration: '03:16', src: '/audio/08-paranoia.mp3' },
    ],
    streamingLinks: {
      netease: 'https://music.163.com/#/artist?id=51320865',
      kugou: 'https://m.kugou.com/singer/info/8MEG1KA267F116/',
    },
  },
];
