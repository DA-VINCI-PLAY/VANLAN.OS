# FANLAN.OS 内容更新指南

这个目录（`content/`）是整站**唯一的内容事实源**。以后更新专辑、视觉作品、联系方式、关于我、站点信息，**只改这里对应的文件**，不需要动任何组件代码。

> 原则：**内容与代码分离**。改内容 → 动 `content/` + `public/`；改设计 / 动画 / 交互 → 才需要动 `lib/` 和 `components/`。

---

## 一、目录结构

```
content/
├── README.md          ← 本指南
├── albums/index.ts    ← 专辑（ALBUMS）
├── gallery/index.ts   ← 视觉作品（GALLERY）
├── social/index.ts    ← 联系方式 / 社交渠道（SOCIALS + QQ_UIN）
├── about/index.ts     ← 身份 / 座右铭 / 六欲（IDENTITY · MOTTO · BIO · DESIRES）
└── site/index.ts      ← 站点名 / 品牌 / 默认语言（SITE）

public/                ← 所有静态资源（图片、音频、模型、字体、二维码）
├── covers/            ← 专辑封面（content/albums 里 cover 字段引用 /covers/xxx.png）
├── audio/             ← 曲目音源（content/albums 里 tracks[].src 引用 /audio/xxx.mp3）
├── gallery/           ← 视觉作品本地封面 / 缩略图
├── models/            ← 3D 模型（vanlan.glb）
├── social/            ← 二维码图片（/social/<id>-qr.png）
└── fonts/             ← 自托管字体（勿动）
```

### 内容 ↔ 页面映射（改了哪能看到）

| 内容文件 | 影响的位置 |
|---|---|
| `albums` | ALBUM 面板正文、3D 唱片轮播、底部播放器、ALBUM 天空色（`accentColor`） |
| `gallery` | GALLERY 面板作品列表 |
| `social` | CONTACT 面板、3D 漂浮气泡、二维码弹窗 |
| `about` | HOME 展台告示牌（座右铭 / 六欲气泡）、ABOUT 面板身份卡 |
| `site` | 首页大标题 + brand 小字、右上角系统 HUD、默认语言 |

---

## 二、更新专辑（content/albums/index.ts）

一个专辑 = `ALBUMS` 数组里的一个对象。**加新专辑 = 往数组末尾 append 一个对象。**

```ts
export const ALBUMS: Album[] = [
  { /* 现有专辑 DIAGNOSIS DIARY */ },
  {
    vanlan: '新专辑罗马字主名',      // 必填，UI 唯一展示名（如 'SECOND ALBUM'）
    zhName: '新专辑中文名',          // 可选
    english: 'Second Album',         // 可选
    cover: '/covers/xxx.png',        // 封面放 public/covers/，空串 = 程序化封面
    preview: '',                     // 整专试听，空串 = 走每首 tracks[].src
    year: 2026,
    accentColor: '#84343e',          // 主题色（同时决定 ALBUM 天空渐变）
    description: '长描述，ALBUM 面板正文……',
    tracks: [
      { title: '曲名', duration: '01:23', src: '/audio/xxx.mp3' },
    ],
    streamingLinks: {                // 流媒体链接，key 可自由扩展
      netease: 'https://music.163.com/#/artist?id=xxx',
      spotify: 'https://open.spotify.com/...',
    },
  },
];
```

**改动曲目 / 时长 / 音源**：直接编辑对应专辑的 `tracks` 数组。
**换封面**：把新图放进 `public/covers/`，改 `cover` 字段。
**改流媒体链接**：编辑 `streamingLinks`（可加 `spotify` / `qqMusic` 等任意 key）。

> 专辑数 / 曲目数 / 平台数这些统计数字由组件从 `ALBUMS` 自动推导，加专辑后自动更新，不用手改。

---

## 三、更新视觉作品（content/gallery/index.ts）

```ts
export const GALLERY: GalleryEntry[] = [
  {
    id: '唯一英文短横线 id',        // 供缩略图/跳转引用，保持稳定
    title: '作品标题',
    type: 'Vlog',                    // MV / Vlog / Short / Interview / Analysis / Other
    year: 2026,
    description: '简介……',
    url: 'https://www.bilibili.com/video/BV...',   // 外链；'#' = 待补充
  },
];
```

**加作品 = append 一个对象**；**删作品 = 删掉对应对象**；**改链接 = 改 `url`**。

如需本地封面/缩略图：把图片放进 `public/gallery/`，再给 entry 加一个 `cover: '/gallery/xxx.png'` 字段（当前组件用外链，本地图字段为预留）。

---

## 四、更新联系方式（content/social/index.ts）

```ts
export const SOCIALS: SocialEntry[] = [
  {
    id: '平台英文 id',               // 如 'wechat' / 'bilibili'
    platform: '展示名',              // 如 'WECHAT' / 'BILIBILI'
    handle: '展示用账号名/昵称',
    action: 'link' | 'qr' | 'copy' | 'qq',   // 点击行为，见下
    value: '……',
  },
];
```

`action` 决定了 `value` 的含义：

| action | 行为 | `value` 填什么 |
|---|---|---|
| `link` | 打开网址 | 完整 URL（B站 / 抖音 / 小红书 / X / IG / Threads / YouTube 主页链接） |
| `qr` | 弹二维码 | 二维码图片路径 `/social/<id>-qr.png`（图片放 `public/social/`） |
| `copy` | 复制文本 | 要复制的内容（如微信号 `VANLAN_PLAY`） |
| `qq` | 唤起 QQ 加好友 | QQ 号（`value` 直接写号，建议用 `QQ_UIN` 常量） |

**QQ 号是单一事实源**：`content/social/index.ts` 顶部的 `QQ_UIN` 常量同时被「联系方式列表」和「QQ 加好友协议」（`lib/qq.ts`）引用。改 QQ 号**只需改 `QQ_UIN` 一处**，列表与加好友功能同步更新。

**新增平台**：append 一个对象（`link` 类型最常用，贴主页 URL 即可）。

---

## 五、更新关于我（content/about/index.ts）

```ts
export const IDENTITY = {
  name: SITE.name,                                    // 主名（跟站点名一致，勿单独改）
  role: 'COMPOSER · MUSICIAN · CREATOR',              // 身份副标题
  tags: ['DEVELOPER', 'INDIE MUSIC', 'GUANGDONG', 'CN'],  // 标签 chips
};

export const MOTTO = {   // 座右铭（HOME 展台告示牌）
  main: { zh: '……', en: '……' },
  sub:  { zh: '……', en: '……' },
};

export const BIO = {     // 身份短句（告示牌 role 下方一行）
  zh: '作曲 · 音乐人 · 创作者 · 广东',
  en: 'Composer · Musician · Creator · Guangdong CN',
};

export const DESIRES = [  // 6 欲气泡（HOME 展台 hover/focus 时围圆浮出）
  { key: 'd1', zh: '食欲', en: 'APPETITE' },
  // ……
];
```

改座右铭、身份标签、六欲文案，都在这一个文件里完成，中英两版都要改。

---

## 六、更新站点信息（content/site/index.ts）

```ts
export const SITE = {
  name: 'VANLAN',        // 主展示名（首页大标题 + 关于页名片，单一事实源）
  brand: 'VANLAN.OS',    // 品牌全名（首页 brand 小字 + 右上角 HUD）
  defaultLang: 'en',     // 默认语言 'en' | 'zh'
} as const;
```

改名只改 `name` 一处（`about` 的 `IDENTITY.name` 会自动跟随，因为它是 `SITE.name` 的引用）。

---

## 七、更新后怎么做

1. **改完保存**。
2. **本地验证**（在 `fanlan-os/` 下）：
   ```bash
   env -u NODE_OPTIONS npx tsc --noEmit      # 类型检查，0 错误即通过
   env -u NODE_OPTIONS npx next build        # 生产构建
   ```
   构建成功、浏览器里对应页面显示正确 → 完成。
3. **提交**：`git add content/ public/ && git commit -m "content: 更新……"`。

> 本机沙箱运行限制：`next dev` 会因批量删除 `.next` 静态资源被安全删除拦截，请用 `next start -p 3000` 跑生产模式。改完 `content/` 后需要重新 build 再 start。

---

## 八、不要动的东西（动了会影响设计 / 动画 / 逻辑）

| 文件 | 为什么别动 |
|---|---|
| `lib/modeConfig.ts` | 每个模式的相机位 / 灯光 / 雾 / FOV（视觉设计） |
| `lib/skyGradient.ts` | 窗外天空渐变调色板（视觉设计） |
| `lib/glowColor.ts` / `plasterTexture.ts` | 石膏材质基色（视觉设计） |
| `lib/store.ts` | 全局状态（mode / lang / 播放意图等运行时逻辑） |
| `lib/modeEntries.ts` | 首页 4 个入口卡的名称/副标题/强调色（导航结构，改动需配合代码） |
| `components/**` | 渲染与动画实现 |
| `app/**` | 路由 / 布局 / 全局样式 |

**判断标准**：如果你只是想「换文字 / 换图 / 换链接 / 换颜色主题」，动 `content/` + `public/` 就够了；如果你要「改布局、改动画、增删板块」，那才需要动组件。

---

## 九、常见更新速查

| 想做什么 | 去哪改 |
|---|---|
| 加一张新专辑 | `content/albums/index.ts` 里 append 一个对象 + 音源放 `public/audio/` |
| 换某首曲子的 mp3 | 替换 `public/audio/` 里对应文件（保持文件名），或改 `tracks[].src` |
| 换专辑封面 | 新图放 `public/covers/`，改 `cover` 字段 |
| 改专辑主题色 / 天空色 | 改该专辑的 `accentColor` |
| 加一条 B 站视频到 Gallery | `content/gallery/index.ts` append 一个对象 |
| 改微信号 / 加新社交平台 | `content/social/index.ts` |
| 换 QQ 号 | `content/social/index.ts` 里的 `QQ_UIN` |
| 改座右铭 / 身份标签 | `content/about/index.ts` |
| 改站点名 / 品牌名 | `content/site/index.ts` 里的 `SITE.name` / `SITE.brand` |
| 换默认语言 | `content/site/index.ts` 里的 `SITE.defaultLang` |
