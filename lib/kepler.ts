/**
 * kepler —— 「克卜勒」星图音乐故事集（R67）
 *
 * 三份数据各自独立：
 *   vanlan_kepler_stars  星体节点（歌曲 / 专辑 / 随笔碎片），后台可 CRUD
 *   vanlan_submissions   访客投稿，管理员可在后台「点亮」成真星星
 *   UI 相位              idle → ink-in → space → finale → ink-out → idle
 *
 * 3D 球面坐标 (theta, phi, radius) 在新增时自动分配（黄金角球面分布），
 * 保证后加进来的星星也能平均散开、不会挤在同一块天区。
 */

import { create } from 'zustand';
import { FORM_TOKEN, readNotifySettings } from './notify';

export const KEPLER_KEY = 'vanlan_kepler_stars';
export const SUBMISSION_KEY = 'vanlan_submissions';

/** 默认星表版本：升级后老存档会自动补进新增的默认星（已删的不复活） */
const STAR_VER_KEY = 'vanlan_kepler_ver';
const STAR_VER = 3;

/** 恒星-专辑 / 行星-单曲 / 流星-随笔碎片 */
export type StarKind = 'star' | 'planet' | 'meteor';

export const KIND_LABEL: Record<StarKind, string> = {
  star: '恒星 · 专辑',
  planet: '行星 · 单曲',
  meteor: '流星 · 碎片',
};

export const KIND_COLOR: Record<StarKind, string> = {
  star: '#DCEAFF',
  planet: '#9CC8FF',
  meteor: '#7FA8E8',
};

export const KIND_SIZE: Record<StarKind, number> = {
  star: 1,
  planet: 0.68,
  meteor: 0.46,
};

export interface KeplerStar {
  id: string;
  /** 歌曲 / 星星名 */
  name: string;
  /** 所属专辑 = 星座分组 */
  album: string;
  /** 悬浮在星旁的那句歌词 */
  lyric: string;
  /** 背后的故事 */
  story: string;
  /** 封面图 URL（空 = 程序化星轨封面） */
  cover: string;
  /** 音频 URL（空 = Web Audio 氛围八音盒兜底） */
  audio: string;
  /** Spotify 曲目 ID（可选，卡片里给一个「在 Spotify 打开」的出口） */
  spotify?: string;
  kind: StarKind;
  /** 星体颜色，空 = 按 kind 取默认 */
  color: string;
  year: string;
  /** 身份标签：作词 / 作曲 / 编曲 / 混音 */
  roles: string;
  /** 球面坐标：经度（弧度） */
  theta: number;
  /** 球面坐标：纬度（弧度，-π/2 ~ π/2） */
  phi: number;
  /** 离球心距离（世界单位，1.2 ~ 2.6） */
  radius: number;
}

export type StarDraft = Omit<KeplerStar, 'id' | 'theta' | 'phi' | 'radius'> & {
  id?: string;
  theta?: number;
  phi?: number;
  radius?: number;
};

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** 黄金角球面分布：第 n 颗星落在哪片天区 */
export function autoOrbit(index: number): { theta: number; phi: number; radius: number } {
  const phi = Math.asin(Math.max(-1, Math.min(1, -1 + (2 * (index + 0.5)) / 12)));
  return {
    theta: (index * GOLDEN) % (Math.PI * 2),
    phi,
    radius: 1.75 + ((index * 37) % 7) * 0.06,
  };
}

/** 默认星群：诊疗日志 8 首 + 专辑恒星 + 克卜勒致敬恒星 */
const OWN_STARS: KeplerStar[] = [
  {
    id: 'kp-album',
    name: 'DIAGNOSIS DIARY',
    album: '诊疗日志',
    lyric: '写给反复来就诊的人。',
    story:
      '整张专辑是一间没有门牌号的诊室。八首歌是八次挂号，修普诺斯、自怜狂、弗里达小姐轮流坐诊。\n\n我把它们收进同一片天区，是想让这张唱片在星图上有一个可以回望的原点——后来所有的星，都是从这颗星长出来的。',
    cover: '/covers/diagnosis-diary.png',
    audio: '',
    kind: 'star',
    color: '#DCEAFF',
    year: '2026',
    roles: '作词 / 作曲 / 编曲 / 混音',
    theta: 0.42,
    phi: 0.18,
    radius: 1.32,
  },
  {
    id: 'kp-artforest',
    name: 'ARTFOREST',
    album: '诊疗日志',
    lyric: '我在森林里，练习不被听见地生长。',
    story:
      '开场曲。想做一段「还没有说出任何话」的声音，像走进树林前的那口气。\n\n鼓组一直压得很低，合成器的泛音在高处散开，像树冠漏下来的光。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/01-artforest.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '编曲 / 混音',
    theta: 0.95,
    phi: 0.46,
    radius: 1.92,
  },
  {
    id: 'kp-hypnos',
    name: '修普诺斯',
    album: '诊疗日志',
    lyric: '把灯关掉，让睡眠替我签名。',
    story:
      '修普诺斯是睡神。这首写给那些「清醒得太久」的夜晚。\n\n主歌只有人声和一台电钢，副歌才让低频涌进来——像终于允许自己沉下去。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/02-hypnos.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '作词 / 作曲 / 编曲',
    theta: 1.66,
    phi: -0.12,
    radius: 2.14,
  },
  {
    id: 'kp-selfpity',
    name: '自怜狂',
    album: '诊疗日志',
    lyric: '我爱我自己，爱到没有空隙。',
    story:
      '这首是整张里最不体面的一首，也是我最喜欢的一首。\n\n贝斯一直在重复同一个动机，像一句自我辩解说到第九遍，连自己都不信了。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/03-selfpity.mp3',
    kind: 'planet',
    color: '#6FA8FF',
    year: '2026',
    roles: '作词 / 作曲 / 编曲 / 混音',
    theta: 2.34,
    phi: 0.34,
    radius: 2.02,
  },
  {
    id: 'kp-frida',
    name: '弗里达小姐',
    album: '诊疗日志',
    lyric: '骨头里开花，才算真的活过。',
    story:
      '写这首的时候一直在看弗里达的画：身体被打开，里面是花。\n\n弦乐用了很多滑音，像疼的时候倒吸的那口气。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/04-frida.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '作曲 / 编曲',
    theta: 3.02,
    phi: -0.4,
    radius: 1.86,
  },
  {
    id: 'kp-flashback',
    name: '闪回',
    album: '诊疗日志',
    lyric: '一秒的旧画面，比一年还长。',
    story:
      '整首只有两分五十一秒，但结构被剪碎了：副歌提前出现，主歌在最后才补上。\n\n想模拟闪回本身的时序——它从来不讲顺序。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/05-flashback.mp3',
    kind: 'planet',
    color: '#6FA8FF',
    year: '2026',
    roles: '词曲 / 编曲',
    theta: 3.74,
    phi: 0.22,
    radius: 2.18,
  },
  {
    id: 'kp-alcohol',
    name: 'ALCOHOL',
    album: '诊疗日志',
    lyric: '清醒是种误会，醉了才敢诚实。',
    story:
      '节奏是摇晃的，故意让拍子站不太稳。\n\n录人声那晚只留了一盏台灯，气声全部保留，包括唱错的地方。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/06-alcohol.mp3',
    kind: 'planet',
    color: '#6FA8FF',
    year: '2026',
    roles: '词曲 / 编曲 / 混音',
    theta: 4.46,
    phi: -0.26,
    radius: 1.98,
  },
  {
    id: 'kp-sisyphus',
    name: '西西弗斯',
    album: '诊疗日志',
    lyric: '石头滚下来，我就再走一趟。',
    story:
      '最重的一首。副歌的鼓一层一层加上去，到最后也没有迎来释放的和弦。\n\n因为石头不会到顶，这本来就是重点。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/07-sisyphus.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '作曲 / 编曲',
    theta: 5.14,
    phi: 0.5,
    radius: 2.2,
  },
  {
    id: 'kp-paranoia',
    name: '臆想症',
    album: '诊疗日志',
    lyric: '门外的脚步声，我听了整夜。',
    story:
      '收尾曲，也是唯一一首在凌晨四点完成的。\n\n结尾没有收干净，留了半分钟的房间底噪——那张唱片到这里就该熄灯了。',
    cover: '/covers/diagnosis-diary.png',
    audio: '/audio/08-paranoia.mp3',
    kind: 'planet',
    color: '#9CC8FF',
    year: '2026',
    roles: '词曲 / 编曲 / 混音',
    theta: 5.82,
    phi: -0.5,
    radius: 1.78,
  },
  {
    id: 'kp-kepler',
    name: '克卜勒',
    album: '克卜勒 · 致敬',
    lyric: '藏在众多孤星之中，还是找得到你。',
    story:
      '第一次听到这首歌是在一个很吵的晚上，那句词突然把所有噪音都按了静音。\n\n我把它放在星图最深的那片天区。不是因为我写过它，而是因为它先找到了我。',
    cover: '',
    audio: '',
    kind: 'star',
    color: '#FFFFFF',
    year: '致敬',
    roles: '翻唱 / 编曲',
    theta: 2.7,
    phi: 0.86,
    radius: 1.55,
  },
];

/* ------------------------------------------------------------------
   R71 ·「克卜勒计划」Spotify 歌单 69 首
   这些不是自己的作品，所以只占一颗小流星：不给歌词、不配音源，
   点开只有「歌名 / 歌手 / 第几首」—— 星图负责记住你听过什么。
   ------------------------------------------------------------------ */

const PLAYLIST: [string, string, string, string][] = [
  ['Tomorrow will be fine.', '蘇打綠', '3tzi8a5FEO3bczurgbNuAJ', 'https://p.scdn.co/mp3-preview/7ab76650e08de6065201345dac69000039a30239'], // 1
  ['Perfect Celebrity', 'Lady Gaga', '0Tqn5Th0wk55eLdga96vZM', 'https://p.scdn.co/mp3-preview/8c849021bc5029df6eaf819d60d89ca190b638ec'], // 2
  ['Sympathy is a knife', 'Charli xcx', '5c9tBmJKbTdn1vhzXHeAwW', 'https://p.scdn.co/mp3-preview/9ae5e70bf871a591034c923a5e361d2f00cf3904'], // 3
  ['The One That Got Away', 'Katy Perry', '3oL3XRtkP1WVbMxf7dtTdu', 'https://p.scdn.co/mp3-preview/5a1bf93027db1e2bd8bc7cd71fc465ba4c5126dc'], // 4
  ['Dying for You', 'Charli xcx', '0T3sHoiR3t9HtwbIOgTI7J', 'https://p.scdn.co/mp3-preview/77b0eb33af6948a7c0d7749f5e6a5c1e2c326b8b'], // 5
  ['Chains of Love', 'Charli xcx', '77qLAmRzMPetmXywybpH15', 'https://p.scdn.co/mp3-preview/421ee63ddb138e0f86cf7f0d4144269d317eb02d'], // 6
  ['費洛蒙小姐', '吳青峰', '43awhRjJRYcBdfyAIGmvzN', 'https://p.scdn.co/mp3-preview/3534a125ed01dba83782f3648c765da38d18b8b5'], // 7
  ['蓋亞', '林憶蓮', '0VVpMr7XqPiJMuIhzzMorh', 'https://p.scdn.co/mp3-preview/628b22302da356e5213ef6d3d8cd91732bbdffe5'], // 8
  ['ALIEN SUPERSTAR', 'Beyoncé', '1Hohk6AufHZOrrhMXZppax', 'https://p.scdn.co/mp3-preview/2f27d82d984f8f84a017a44b7992a7723ec8b6c4'], // 9
  ['絲路', '梁靜茹', '3n1pQaVXdH9KGW8z2BbqAP', 'https://p.scdn.co/mp3-preview/06e9bea54adba652ed473429c0614c6a603770f2'], // 10
  ['Wenn Ich Tanzen Will', 'Theater an der Wien Ensemble, Orchester der Vereinigten Bühnen Wien', '3oiRwDSqLWAUyELhUCYwar', 'https://p.scdn.co/mp3-preview/8e988d9dd1152fbb4adfc418496340366a66e80e'], // 11
  ['Rebel Heart', 'Madonna', '1cCVKNYOBi99Jo3S2iWudL', 'https://p.scdn.co/mp3-preview/198aa38b5c274010ef523ddedd4e1f4c61f42e39'], // 12
  ['飛鳥', '魏如萱', '4jIDRIjSAoPdcoiuO5vJ7u', 'https://p.scdn.co/mp3-preview/5d0f4e66d6e546206a79c01fc84a84b09939b589'], // 13
  ['蜕 (Peel The Skin)', 'Siyan', '1kZsvem68TRERAoPvVR1qP', ''], // 14
  ['生鏽遊樂場', '蔡健雅', '4EjU1O2s7i73CVNZGS8CNn', 'https://p.scdn.co/mp3-preview/5e729e7454f5a662fe4a7cb85403016b8de6b3c1'], // 15
  ['Vivre à en crever', 'Mozart Opera Rock', '7JDcceMelimTjxLmWMOjMd', 'https://p.scdn.co/mp3-preview/1f3ee32807ea4f112ca46222bad597874bf452d7'], // 16
  ['Dors mon ange', 'Mozart Opera Rock', '265Er1GtG5t9e1c4FStYQZ', 'https://p.scdn.co/mp3-preview/46f1233ecf79ad1d9f06327a3ebd45c427a64bef'], // 17
  ['極限', '徐佳瑩', '1nNzdeQAbkMpiHNCcJhuGv', 'https://p.scdn.co/mp3-preview/cc91c4650d3afe5effcbac7e09af7c2bbbd5d444'], // 18
  ['Just Another Day', 'Next To Normal 2024 Original London Company', '6bhjbZGzuderX1tYOvGpAS', 'https://p.scdn.co/mp3-preview/45f8581fbe9a6c5138ef0aee5f94de7c899530cd'], // 19
  ['nowhere, nobody', 'Ariana Grande', '5JbnupagBhD0AanbkCELdH', 'https://p.scdn.co/mp3-preview/b9e978df77e9ede079f075102759dddf6f9b68c0'], // 20
  ['克卜勒', '孙燕姿', '15tD731GK0VYsmd1Im4C7q', 'https://p.scdn.co/mp3-preview/f6a29d8c65d61d566f941f5330edb3bfe74b7a67'], // 21
  ['愛錯', '王力宏', '4vdX5mQE0oXkflFqsqQkUP', 'https://p.scdn.co/mp3-preview/e58d6342271f243b16323c3c0ce29f7881390c44'], // 22
  ['刻在我心底的名字 (Your Name Engraved Herein) - 電影<刻在你心底的名字>主題曲', '盧廣仲', '3OC84eKMxRJ4x0Hcwl9i4i', 'https://p.scdn.co/mp3-preview/3343d7c68b4098437f7a4137ce8101954ce2ab73'], // 23
  ['L’AMOUR DE MA VIE', 'Billie Eilish', '6fPan2saHdFaIHuTSatORv', 'https://p.scdn.co/mp3-preview/c1c545337b56496e5f098e1f4190f95043369b45'], // 24
  ['太空人', '吳青峰', '0aIF8XCR5hVmzN6rI7tpOv', 'https://p.scdn.co/mp3-preview/18e877a57d457efa03b3ee3645ba43dd06541278'], // 25
  ['The Faith', '尚雯婕', '7dg3GoD2vXfjRTXMNOMGri', 'https://p.scdn.co/mp3-preview/1066dc5aef8374ed37155de8e31446b9c2748e24'], // 26
  ['bandaids', 'Katy Perry', '7vlkotgJCvYzVrmRqDYNYh', 'https://p.scdn.co/mp3-preview/66222c6b21866205793812386af14159c8a93025'], // 27
  ['Pink Pony Club', 'Chappell Roan', '1k2pQc5i348DCHwbn5KTdc', 'https://p.scdn.co/mp3-preview/064dd33ec1b86bb205a7e6875a247d61da32e8e9'], // 28
  ['Green Light', 'Lorde', '6ie2Bw3xLj2JcGowOlcMhb', 'https://p.scdn.co/mp3-preview/4ea9fa151649665d85f266dcb65646e5c716227e'], // 29
  ['Summerboy', 'Lady Gaga', '17xFcSuciJ9O10WqDERQep', 'https://p.scdn.co/mp3-preview/3c83eea3817a5512c76b226c282d65311454a6ba'], // 30
  ['我會 我會', '吳青峰', '5w4wpfcnMxOt0pbxzLNT1j', 'https://p.scdn.co/mp3-preview/d0b32ba8fba70133478b1575a25f05bb6bcf0189'], // 31
  ['還你茉莉', '單依純', '7yztuchKRg40qPNw3ihlCL', 'https://p.scdn.co/mp3-preview/8a4216e3cdc815c3dbc8b90f41fce02b75daaef2'], // 32
  ['我的滑板鞋2016', '華晨宇', '1PjpweQVZBZrH7fYWFB6h0', 'https://p.scdn.co/mp3-preview/18494cfda7ebee1f790c890935a841e7201ee301'], // 33
  ['Plastic Doll', 'Lady Gaga', '3CidPLqWXqgesJlwYVJZdy', 'https://p.scdn.co/mp3-preview/9fac12e52b67635d7efbd0d4687b7c1b6ff6e094'], // 34
  ['How Bad Do U Want Me', 'Lady Gaga', '2rvd6akG8qEtBNUvQpN7iY', 'https://p.scdn.co/mp3-preview/f443b8f88b93d0a0f9e8bb5267cd45ed3cdca150'], // 35
  ['Vanish Into You', 'Lady Gaga', '5IoPnNiYAOvHHJpz13wzRL', 'https://p.scdn.co/mp3-preview/32e68e4ef93bcc4d8edb23b948b9a30ce748fa6c'], // 36
  ['LoveDrug', 'Lady Gaga', '3hcivoswCVR8LZkHR8MYA5', 'https://p.scdn.co/mp3-preview/2127095bc2b11bc22e598a9900e72c41cc6acb4a'], // 37
  ['good 4 u', 'Olivia Rodrigo', '4ZtFanR9U6ndgddUvNcjcG', 'https://p.scdn.co/mp3-preview/b842388e0a8bb4c8667f77d645b25fdcd50961c1'], // 38
  ['Witness', 'Katy Perry', '6EzuVdWmzgOBmqHpzbbzfQ', 'https://p.scdn.co/mp3-preview/a651ad3be63029170f474fb14d286a2f004ea2da'], // 39
  ['老人與海', '鄧紫棋', '0Sk5Fa1PS5BfAHSWJ2HjAo', 'https://p.scdn.co/mp3-preview/770c46906311f819dceefdde7f2f2303fca9ca80'], // 40
  ['Speechless', 'Lady Gaga', '0hwfOlSrYQ36ULiphozHgJ', 'https://p.scdn.co/mp3-preview/7a59dcc8015d4ac6dec691c5e6d170a08fe0518e'], // 41
  ['Paparazzi', 'Lady Gaga', '02XnQdf7sipaKBBHixz3Zp', 'https://p.scdn.co/mp3-preview/769475c6a0156d8458fa41b1110860d8ff41a3cf'], // 42
  ['champagne problems', 'Taylor Swift', '0sY6ZUTh4yoctD8VIXz339', 'https://p.scdn.co/mp3-preview/033519b1930ef8cf19f2e42bfc31edc97f0bfa1f'], // 43
  ['tolerate it', 'Taylor Swift', '0PurA4JVJ8YQgSVopY8fn6', 'https://p.scdn.co/mp3-preview/b63028cc03668a0b097c4bdf1f7a7cfe2970e276'], // 44
  ['Tightrope', 'Michelle Williams', '0GVuLQtPXFaL18ijEOqoAa', 'https://p.scdn.co/mp3-preview/a0c94ba385f00edd86d80a99812708c7a2d35073'], // 45
  ['倒流時間', '鄧紫棋', '0vrLUOZBlfezUK7k1rxmsw', 'https://p.scdn.co/mp3-preview/0783f35932fbcf101806ca3240c1b77d662724a2'], // 46
  ['I\'m so Stupid', 'Madonna', '2mdKGSHfYj97sPr1rjyLEp', 'https://p.scdn.co/mp3-preview/5c5f645980b6f46b3caa2cc43b5bd184f17f3dc9'], // 47
  ['So Long, London', 'Taylor Swift', '7wAkQFShJ27V8362MqevQr', 'https://p.scdn.co/mp3-preview/4f43fbe8b01d36f14d576fb976368721ccb8cb8a'], // 48
  ['willow', 'Taylor Swift', '0lx2cLdOt3piJbcaXIV74f', 'https://p.scdn.co/mp3-preview/6c828e79c55b0fe731ef9029ee2f2f2b2ff9f032'], // 49
  ['illicit affairs', 'Taylor Swift', '2NmsngXHeC1GQ9wWrzhOMf', 'https://p.scdn.co/mp3-preview/93886065c09a3a093391c2b4dd01b7a7827f0a79'], // 50
  ['Call It What You Want', 'Taylor Swift', '1GwMQaZz6Au3QLDbjbMdme', 'https://p.scdn.co/mp3-preview/3188f3522112569b1406de6676e6211456d1ce30'], // 51
  ['Applause', 'Lady Gaga', '5ka2ajep9OAvU5Sgduhiex', 'https://p.scdn.co/mp3-preview/b8c840f3b4d07e6021e0a2028f5c3c6e08af7f3a'], // 52
  ['Roulette', 'Katy Perry', '2rk4s5NBhtHhhJIfjoaWES', 'https://p.scdn.co/mp3-preview/4eca3d9cf05a3537edc85daee1ea0f2f58b0684e'], // 53
  ['I\'m not yours (feat. 安室奈美惠)', 'JOLIN蔡依林, 安室奈美惠', '0k4FG9l3OrxLt5NQU3uEkR', 'https://p.scdn.co/mp3-preview/19d84405532fe733076d442c652a4d46f4d6b0a6'], // 54
  ['Now That We Don\'t Talk (Taylor\'s Version) (From The Vault)', 'Taylor Swift', '5KD6AEm19QnMbfWpfoOHMl', 'https://p.scdn.co/mp3-preview/403045fb66ac0dd6519f941d571b0f06537c89cd'], // 55
  ['I Have Never Felt More Alive - from the feature film "Fall"', 'Madison Beer', '3Hz0axxTsemGQSNK3BiRa9', 'https://p.scdn.co/mp3-preview/27609ca56d5c1cae1d675a362869d64d9d0c44d0'], // 56
  ['Circus', 'Britney Spears', '7jk7gqyEonmVVYahZN5zhW', 'https://p.scdn.co/mp3-preview/b77fb43c0133e94eacdfb4c2f6310a869b8cfaa0'], // 57
  ['TRUSTFALL', 'P!nk', '1gUwi1o1S9W9P0FQgJdY8s', 'https://p.scdn.co/mp3-preview/1b33af874205626b878ddcf415f39118d0435a34'], // 58
  ['Rich, White, Straight Men', 'Kesha', '0esnwtbSdqUZQoboUvApH4', 'https://p.scdn.co/mp3-preview/00705dd4778cd914a1c6572604b0b8296a1f853f'], // 59
  ['HELL', '鄧紫棋', '3KYs6A8fOWMEX0sjYxA4gY', 'https://p.scdn.co/mp3-preview/2b812288008aafc67c42fdefee359d6f619c5052'], // 60
  ['Swine', 'Lady Gaga', '6AczxDV0grtXZZ7h8xI5cS', 'https://p.scdn.co/mp3-preview/5eee0aff4b646a77d6f729a639a68d3966c22dc4'], // 61
  ['天空沒有極限', '鄧紫棋', '4nivAUgvOrWdkv44kjAlxs', 'https://p.scdn.co/mp3-preview/42a528692c54dd34524ea9ca882f4bd86f656251'], // 62
  ['Dumb Blonde (feat. Nicki Minaj)', 'Avril Lavigne, Nicki Minaj', '1Spmq0UazGU6ovMIlGldZX', 'https://p.scdn.co/mp3-preview/2bd3a3929391583222318ee6976662276a48e9da'], // 63
  ['Dance In The Dark', 'Lady Gaga', '6Qh10T7u43YciJsJa99R3v', 'https://p.scdn.co/mp3-preview/b8c51ceaf95a1f32516ca8bf1b03bddf5e884150'], // 64
  ['Bois Lie (feat. Machine Gun Kelly)', 'Avril Lavigne, mgk', '2lHktSigIAZqf7BkA7NRS7', 'https://p.scdn.co/mp3-preview/5249e290c9704c8411d6ab01a075640db747c6f2'], // 65
  ['Gypsy', 'Lady Gaga', '2BnfMbmWbfqi7ac5y7GHXn', 'https://p.scdn.co/mp3-preview/cb03791a6d54fc0b15bfc624d5fb6636d79544b9'], // 66
  ['Cannonball', 'Avril Lavigne', '6xXzhKhNNmBJ4q0Qzw485o', 'https://p.scdn.co/mp3-preview/5e9ecfc64819eb8c74687ff881c3e05294e429b1'], // 67
  ['Monster', 'Lady Gaga', '2WgyOP8Z1D6GQYumCwH4Dk', 'https://p.scdn.co/mp3-preview/28c012655ff54128299060f1886383c9c0099d4f'], // 68
  ['Getting Older', 'Billie Eilish', '4HOryCnbme0zBnF8LWij3f', 'https://p.scdn.co/mp3-preview/9a679878063b9c440d6f611d42811737acfdece4'], // 69
];

export const PLAYLIST_ALBUM = '克卜勒计划';

/** 斐波那契球面：69 颗也能均匀铺开，不会挤成一坨 */
function sphereAt(i: number, n: number) {
  return {
    phi: Math.asin(Math.max(-1, Math.min(1, -1 + (2 * (i + 0.5)) / n))),
    theta: (i * GOLDEN) % (Math.PI * 2),
    radius: 1.58 + ((i * 23) % 8) * 0.062,
  };
}

const PLAYLIST_TINT = ['#DCEAFF', '#9CC8FF', '#7FA8E8', '#B8D6FF', '#8FBDF5'];

const PLAYLIST_STARS: KeplerStar[] = PLAYLIST.map(([name, artist, spotify, preview], i) => {
  const orbit = sphereAt(i, PLAYLIST.length);
  const namesake = name === '克卜勒';
  return {
    id: `kp-pl-${String(i + 1).padStart(2, '0')}`,
    name,
    album: PLAYLIST_ALBUM,
    lyric: '',
    story: `${artist}\n\n歌单《克卜勒计划》第 ${i + 1} 首。`,
    cover: '',
    // Spotify 的 30 秒试听直链：加载不到会自动落回合成试听
    audio: preview,
    spotify,
    // 同名那首升成主星，其余都是安静的小流星
    kind: namesake ? 'star' : 'meteor',
    color: namesake ? '#EAF4FF' : PLAYLIST_TINT[i % PLAYLIST_TINT.length],
    year: '2026',
    roles: artist,
    ...orbit,
  };
});

export const DEFAULT_STARS: KeplerStar[] = [...OWN_STARS, ...PLAYLIST_STARS];

/* ---------------- 存储 ---------------- */
function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满 / 隐私模式：静默降级 */
  }
}

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;

interface StarState {
  hydrated: boolean;
  stars: KeplerStar[];
  hydrate: () => void;
  addStar: (draft: StarDraft) => KeplerStar;
  updateStar: (id: string, draft: Partial<StarDraft>) => void;
  removeStar: (id: string) => void;
  resetStars: () => void;
}

export const useKeplerStars = create<StarState>((set, get) => ({
  hydrated: false,
  stars: DEFAULT_STARS,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readJSON<KeplerStar[]>(KEPLER_KEY);
    if (Array.isArray(stored) && stored.length > 0) {
      // 兼容早期缺字段的存档
      const fixed = stored.map((s, i) => {
        const orbit = autoOrbit(i);
        return {
          ...s,
          kind: s.kind ?? 'planet',
          color: s.color ?? '',
          year: s.year ?? '',
          roles: s.roles ?? '',
          theta: typeof s.theta === 'number' ? s.theta : orbit.theta,
          phi: typeof s.phi === 'number' ? s.phi : orbit.phi,
          radius: typeof s.radius === 'number' ? s.radius : orbit.radius,
        } as KeplerStar;
      });
      set({ stars: fixed, hydrated: true });

      // 老存档补新星：只补「默认表里新增、存档里没有」的那些，用户删掉的不复活
      if (readJSON<number>(STAR_VER_KEY) !== STAR_VER) {
        const have = new Set(fixed.map((s) => s.id));
        const missing = DEFAULT_STARS.filter((s) => !have.has(s.id));
        // 歌单星的内容（试听直链 / Spotify ID）以后可能整批更新，直接以默认表为准
        const refreshed = fixed.map((s) => {
          if (!s.id.startsWith('kp-pl-')) return s;
          const def = DEFAULT_STARS.find((d) => d.id === s.id);
          return def ? { ...s, audio: def.audio, spotify: def.spotify } : s;
        });
        const merged = [...refreshed, ...missing];
        if (missing.length > 0 || refreshed.some((s, i) => s !== fixed[i])) {
          writeJSON(KEPLER_KEY, merged);
          set({ stars: merged });
        }
        writeJSON(STAR_VER_KEY, STAR_VER);
      }
    } else {
      writeJSON(KEPLER_KEY, DEFAULT_STARS);
      writeJSON(STAR_VER_KEY, STAR_VER);
      set({ stars: DEFAULT_STARS, hydrated: true });
    }
  },

  addStar: (draft) => {
    const list = get().stars;
    const orbit = autoOrbit(list.length);
    const star: KeplerStar = {
      ...draft,
      id: draft.id ?? makeId('kp'),
      theta: draft.theta ?? orbit.theta,
      phi: draft.phi ?? orbit.phi,
      radius: draft.radius ?? orbit.radius,
    };
    const stars = [...list, star];
    writeJSON(KEPLER_KEY, stars);
    set({ stars });
    return star;
  },

  updateStar: (id, draft) => {
    const stars = get().stars.map((s) =>
      s.id === id ? { ...s, ...draft, id: s.id } : s,
    );
    writeJSON(KEPLER_KEY, stars);
    set({ stars });
  },

  removeStar: (id) => {
    const stars = get().stars.filter((s) => s.id !== id);
    writeJSON(KEPLER_KEY, stars);
    set({ stars });
  },

  resetStars: () => {
    writeJSON(KEPLER_KEY, DEFAULT_STARS);
    set({ stars: DEFAULT_STARS });
  },
}));

/* ---------------- 投稿 ---------------- */
export type SubmissionKind = 'music' | 'lyric' | 'story';

export const SUBMISSION_KIND_LABEL: Record<SubmissionKind, string> = {
  music: '🎵 音乐 / Demo 合作',
  lyric: '✍️ 歌词 / 灵感共创',
  story: '💌 树洞故事 / 听歌记忆',
};

export interface Submission {
  id: string;
  /** 署名 / 星星代号 */
  name: string;
  kind: SubmissionKind;
  /** 核心金句（≤ 30 字） */
  lyric: string;
  /** 故事正文或作品链接 */
  story: string;
  /** 微信 / 邮箱 / QQ */
  contact: string;
  createdAt: string;
  /** 管理员点亮后写入的星体 id */
  litStarId?: string;
}

interface SubmissionState {
  hydrated: boolean;
  list: Submission[];
  hydrate: () => void;
  add: (draft: Omit<Submission, 'id' | 'createdAt'>) => Submission;
  remove: (id: string) => void;
  markLit: (id: string, starId: string) => void;
}

export const useSubmissions = create<SubmissionState>((set, get) => ({
  hydrated: false,
  list: [],

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readJSON<Submission[]>(SUBMISSION_KEY);
    set({ list: Array.isArray(stored) ? stored : [], hydrated: true });
  },

  add: (draft) => {
    const item: Submission = {
      ...draft,
      id: makeId('sub'),
      createdAt: new Date().toISOString(),
    };
    const list = [item, ...get().list];
    writeJSON(SUBMISSION_KEY, list);
    set({ list });
    return item;
  },

  remove: (id) => {
    const list = get().list.filter((s) => s.id !== id);
    writeJSON(SUBMISSION_KEY, list);
    set({ list });
  },

  markLit: (id, starId) => {
    const list = get().list.map((s) => (s.id === id ? { ...s, litStarId: starId } : s));
    writeJSON(SUBMISSION_KEY, list);
    set({ list });
  },
}));

/** 把投稿变成一颗公开星星（后台「一键点亮」用） */
export function submissionToStarDraft(sub: Submission): StarDraft {
  return {
    name: sub.name || '匿名旅人',
    album: '访客星座',
    lyric: sub.lyric,
    story: sub.story || '（这位访客只留下了一颗星，没有写故事。）',
    cover: '',
    audio: '',
    kind: 'meteor',
    color: '#DCE9FF',
    year: new Date(sub.createdAt).getFullYear().toString(),
    roles: SUBMISSION_KIND_LABEL[sub.kind] ?? '投稿',
  };
}

/** 投稿推送：FormSubmit 直发邮箱，失败不阻断（本地已经存了一份） */
export async function pushSubmission(sub: Submission): Promise<'ok' | 'fail'> {
  const settings = readNotifySettings();
  if (!settings.enabled) return 'fail';
  const endpoint = FORM_TOKEN
    ? `https://formsubmit.co/ajax/${FORM_TOKEN}`
    : `https://formsubmit.co/ajax/${encodeURIComponent(settings.primaryEmail)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `【克卜勒星空新投稿】来自 ${sub.name || '匿名旅人'}`,
        _template: 'table',
        _captcha: 'false',
        署名: sub.name || '匿名旅人',
        类型: SUBMISSION_KIND_LABEL[sub.kind],
        金句: sub.lyric,
        故事或链接: sub.story,
        联系方式: sub.contact,
        时间: new Date(sub.createdAt).toLocaleString('zh-CN', { hour12: false }),
      }),
    });
    return res.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

/* ---------------- UI 相位（不进 localStorage，纯运行时） ---------------- */
export type KeplerPhase = 'idle' | 'ink-in' | 'space' | 'finale' | 'ink-out';

interface KeplerUI {
  open: boolean;
  phase: KeplerPhase;
  /** 当前聚焦星体 */
  selectedId: string | null;
  /** 星座筛选（album 名，null = 全部） */
  filter: string | null;
  /** 投稿舱 */
  submitOpen: boolean;
  openKepler: (id?: string | null) => void;
  setPhase: (p: KeplerPhase) => void;
  select: (id: string | null) => void;
  setFilter: (album: string | null) => void;
  setSubmitOpen: (v: boolean) => void;
  close: () => void;
}

export const useKeplerUI = create<KeplerUI>((set) => ({
  open: false,
  phase: 'idle',
  selectedId: null,
  filter: null,
  submitOpen: false,

  openKepler: (id = null) =>
    set({ open: true, phase: 'ink-in', selectedId: id, submitOpen: false }),

  setPhase: (phase) => set({ phase }),
  select: (selectedId) => set({ selectedId }),
  setFilter: (filter) => set({ filter }),
  setSubmitOpen: (submitOpen) => set({ submitOpen }),

  close: () =>
    set({
      open: false,
      phase: 'idle',
      selectedId: null,
      submitOpen: false,
      filter: null,
    }),
}));

export const openKepler = (id?: string | null) => useKeplerUI.getState().openKepler(id);

/**
 * 每帧共享的可变量：只有渲染循环里读写，绝不触发 React。
 *   ink       黑墨覆盖进度 0~1
 *   converge  谢幕坍缩 0~1
 *   focus     聚焦星体的镜头推近 0~1
 */
export const kpFX = {
  ink: 0,
  converge: 0,
  focus: 0,
  /** 视野缩放 1 ~ 2.2（罗盘滑块 / 双指捏合同步） */
  zoom: 1,
};

/** 侧边导航用的星座分组（去重，保序） */
export function groupStars(stars: KeplerStar[]): { album: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of stars) map.set(s.album, (map.get(s.album) ?? 0) + 1);
  return Array.from(map, ([album, count]) => ({ album, count }));
}
