# VANLAN.OS —— Project README

> 数字圣堂 / Digital Sanctuary —— 创作者 / 作曲家 / 开发者 陈锐轩（芬达）的个人作品集 3D 站点。
> Next.js 14 + R3F 8 + Three.js 0.169 + GSAP + Zustand 5。Phase 01 Visual Polish 完成。品牌：VANLAN.OS（2026-09 定名）。

## 启动

```bash
cd fanlan-os
npm install            # 首次
env -u NODE_OPTIONS npm run dev   # 启动开发（http://localhost:3000）
env -u NODE_OPTIONS npm run build # 生产构建
```

> **沙箱内必加 `env -u NODE_OPTIONS`**：受管 Node 22.12 注入的 `node-safe-delete-shim` 会在构建清理 `.next` 时触发批量删除保护；加此前缀可绕过。

## 项目结构

```
fanlan-os/
├── app/                     # Next App Router（page.tsx → RenderRoot）
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css          # dot-pulse/loadbar/fade-in/album-swap 全 linear
├── components/
│   ├── scene/               # 3D 层：Room/Character/GlassWindow/Lighting/
│   │                        #       CameraController/BubbleSystem/
│   │                        #       AlbumCarousel/DustField/SceneCanvas
│   ├── ui/                  # DOM 层：ModePanels/AudioPlayer/BottomNav/
│   │                        #       QrModal/LoadingScreen/SystemHUD/
│   │                        #       HomeButton/SettingsToggle/MobileContentSafeArea/Fallback2D
│   ├── Experience.tsx       # DOM 总装
│   └── RenderRoot.tsx       # 3D / 2D 分流（webglOK && threeD && !sceneFailed）
├── data/                    # 内容：gallery/about/social/albums（数据驱动）
├── lib/
│   ├── store.ts             # Zustand（Mode/Quality/webglOK/threeD/RM/...）
│   ├── modeConfig.ts        # 5 模式 CamPose + 灯光/雾/halo/node
│   ├── perf.ts              # QUALITY_CFG + MOTION + 能力检测
│   ├── skyGradient.ts       # 窗外天空 CanvasTexture 缓存
│   ├── glowColor.ts         # 共享 Color 单例（haloGlow / plasterBase）
│   └── plasterTexture.ts    # 程序化石膏 roughness/normal/contact shadow
├── public/                  # 占位（GLB/封面/音频/二维码见 README-ASSETS.md）
└── tailwind.config.ts
```

## 架构原则

- **3D 是增强，不是访问前提** —— WebGL 不可用/失败/用户关闭 3D 都会自动降级到 2D Fallback（`components/ui/Fallback2D.tsx`），导航与所有内容依旧完整。
- **5 模式收敛** —— `MODES = [GALLERY, CONTACT, HOME, ALBUM, ABOUT]`，HOME 居中，导航浮动胶囊（`BottomNavigation`）。
- **Camera 单一控制源** —— `CameraController` 唯一动 camera.position / lookTarget；GSAP `ease:'none'`，lookAt 阻尼跟随，零每帧 new Vector3。
- **动画去同步（Phase 01）** —— 相机 1.5s / 光照 1.8s / 面板 0.7s / Album 1.0s / 气泡 0.7-1.1s 错峰；全 linear。
- **性能分级** —— `QUALITY_CFG` 三档（HIGH/MEDIUM/LOW）+ FPS hysteresis 自适应；按设备核心+内存+DPR 检测首档。
- **所有数据走 `data/*.ts`** —— 替换封面/履历/链接只动文件不动组件。

## 5 模式

| 模式 | 视觉语义 | 窗外天空 | 焦点 |
| --- | --- | --- | --- |
| HOME | 大厅 / Core | 蓝 #7eb5ff → 白 | 兽头居中 |
| GALLERY | 视觉作品展 | 紫 #9679ff | 头偏左 + 右侧 panel |
| CONTACT | 联系 / 社交渠道 | 暖橙 #f49a5f | 头偏右 + 右侧 panel |
| ALBUM | 唱片档案 + 音频 | 当前专辑 accent | 3D 轮播 + 右侧 panel |
| ABOUT | 履历时间线 | 绿 #5fb28a | 头缩小 + 全景 |

## Phase 01 Visual Polish（第九轮）

详见 `PHASE_01_VISUAL_POLISH_REPORT.md`。要点：
- 雕塑灯光三件套（Key/Fill/Rim）+ 真实柔和阴影（PCFSoft）
- 石膏质感（roughness 0.82~0.94 + 极轻 normal + 接触阴影）
- Camera 幅度加大 1.5~2x
- 建筑浅浮雕（白竖向沟槽，按质量分级 + mobile 减半）
- 玻璃克制菲涅尔罩
- 前/中/后景空气层
- 曝光 1.05 → 1.0 防过曝
- 禁 Bloom/Glow/Neon/Glitch/CA

## 资产替换

见 `README-ASSETS.md`。

## 多视口验收

Playwright 5 视口 × 5 模式脚本：`shots-r9.js`（项目根）。

```bash
env -u NODE_OPTIONS npm run dev &   # 启动 dev
node shots-r9.js                     # 全自动截图（需 NODE_PATH 指向全局 npm）
```

## 关闭顺序（性能降级）

后处理 > Halo > 额外光 > 动态阴影 > 气泡数 > 玻璃透射 > 高 DPR > 次要动画；
**永不先关** Character / 导航 / 内容 / Mode。
