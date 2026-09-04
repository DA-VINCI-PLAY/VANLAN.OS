# VANLAN.OS

3D 个人数字空间 —— 极简白色虚拟房间 + 网格落地窗 + 白色角色雕塑。

技术栈：Next.js (App Router) · TypeScript · React Three Fiber · Three.js · Tailwind CSS · GSAP · Zustand

## 开发

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建
```

## 部署（GitHub → Netlify）

1. `git init && git add . && git commit -m "VANLAN.OS"`
2. 推送到 GitHub 仓库
3. Netlify → Add new site → Import from Git → 选择仓库
4. 构建命令与发布目录已由 `netlify.toml` 声明（含 `@netlify/plugin-nextjs`，兼容 App Router），直接 Deploy 即可

## 资产替换（后期无需改代码）

所有内容资产都走 data 层与 public 目录，替换文件即可生效：

| 资产 | 位置 | 说明 |
| --- | --- | --- |
| 3D 兽设白模 | `public/models/vanlan.glb` | 放入后自动替换占位雕塑（支持 Draco） |
| 专辑封面 | `public/covers/*.jpg` | 在 `data/albums.ts` 的 `cover` 字段填路径 |
| 试听音频 | `public/audio/*.mp3` | 在 `data/albums.ts` 的 `preview` 字段填路径 |
| 微信二维码 | `public/social/wechat-qr.png` | Social / Contact 弹窗自动读取 |
| 专辑 / 曲目 / 流媒体链接 | `data/albums.ts` | accentColor 会驱动场景灯光 |
| 社交平台 | `data/social.ts` | action: link / qr / copy |
| 视频 / 媒体 | `data/media.ts` | url 为 `#` 时显示 PENDING |
| 归档时间线 | `data/archive.ts` | — |
| 模式灯光 / 相机 / HUD 节点号 | `lib/modeConfig.ts` | — |

封面未提供时自动生成程序化封面（白底 + accent 渐变 + 标题），音频未提供时播放器显示 ASSET PENDING。

## 结构

```
app/                 Next.js App Router 入口
components/
  scene/             3D 层（Canvas 内）
    SceneCanvas      Canvas / DPR / shadow 配置
    Room             白色房间（地面/后墙/天花板/墙体）
    GridWindow       网格落地窗（castShadow → 真实网格光影）
    LightingController  模式灯光 + 专辑 accentColor + 雾
    Character        vanlan.glb 加载（失败回退占位雕塑）
    CameraController GSAP 相机转场
    BubbleSystem     气泡导航
    AlbumCarousel    3D 专辑轮播
    DustField        微尘粒子
  ui/                DOM overlay 层
    BottomNavigation / SystemHUD / ModePanels
    AudioPlayer / QrModal / LoadingScreen / HomeButton
data/                内容数据（albums / social / media / archive）
lib/                 store (zustand) / modeConfig / useIsMobile
```

## 性能

- 移动端：DPR ≤ 1.5，shadow map 512，右窗光不投影，粒子减半
- 桌面端：DPR ≤ 2，shadow map 1024，双窗光投影
- 无后处理，单一 ambient + 两盏 directional，材质全部低成本 standard
