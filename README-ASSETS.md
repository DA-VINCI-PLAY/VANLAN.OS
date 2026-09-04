# VANLAN.OS —— 资产替换清单

所有资产（3D 模型 / 封面 / 音频 / 二维码）由 `data/*.ts` 驱动：放对路径即生效，**无需改组件代码**。

## 1. 3D 兽设模型

| 用途 | 路径 | 说明 |
| --- | --- | --- |
| 兽头 GLB | `public/models/vanlan.glb` | 三角面 < 30 万，中心在原点附近，无骨骼 |

探测方式：`Character.tsx` 用 `fetch(MODEL_URL, { method: 'HEAD' })` 探测；缺失即回退程序化占位兽头（不抛异常）。替换后下个 dev 编译周期自动接管。

GLB 适配（自动归一化）：
- `HEAD_Y = 2.0`（漂浮高度，米）
- `HEAD_YAW = -Math.PI/2`（GLB forward=+X → 绕 Y -π/2 朝相机）
- `TARGET_H = 2.1`（视觉高度，自动按 `size.y` 计算 scale）

> 如新 GLB 朝向不一致，只需调 `Character.tsx` 中的 `HEAD_YAW`（保持 ±π/2 区间试）。

## 2. 专辑封面

| 用途 | 路径 | 数据字段 |
| --- | --- | --- |
| 5 张专辑封面 | `public/covers/<album-slug>.jpg` | `data/albums.ts` 中 `cover: "/covers/<slug>.jpg"` |

封面试图失败 → 自动回退程序化封面（白底 + accent 渐变 + 标题 + 角标）。

建议尺寸 1024×1024，sRGB JPEG/PNG ≤ 300KB。

## 3. 试听音频

| 用途 | 路径 | 数据字段 |
| --- | --- | --- |
| 曲目音频 | `public/audio/<track-slug>.mp3` | `data/albums.ts` 中 `tracks[].src` |

未提供时 AudioPlayer 占位为 `--:--`（不报错）。

## 4. 社交二维码

| 用途 | 路径 | 数据字段 |
| --- | --- | --- |
| 微信二维码 | `public/social/wechat-qr.png` | `data/social.ts` 中 platform=='wechat' 的 qrImage 字段 |
| 其他社交 QR | `public/social/<id>-qr.png` | 同上 |

## 5. 其它可选

| 用途 | 路径 | 数据字段 |
| --- | --- | --- |
| 履历年份详情 | （内联） | `data/about.ts` 直接编辑 |
| 联系信息 | （内联） | `data/social.ts` 直接编辑 |
| 作品外链 | （内联） | `data/gallery.ts` 中 `url` 字段（占位 `'#'`） |

## 程序化资源（无需替换）

- 窗外天空渐变：`lib/skyGradient.ts` 5 模式 CanvasTexture
- 兽头石膏 roughness / normal：`lib/plasterTexture.ts`（值噪声生成）
- 兽头底部接触阴影：同文件 `getContactShadowTexture()`
- 窗外天光 / 室内漫反射环境：Three RoomEnvironment + PMREMGenerator（运行时生成，零网络）
- 专辑程序化封面：`components/scene/AlbumCarousel.tsx` makeCoverTexture
- 模式色板（halo / directional 强度）：`lib/modeConfig.ts` MODE_CONFIG
- 2D Fallback 兽头 SVG：`components/ui/Fallback2D.tsx`

## 素材审计

- ✅ 全部外链均在 `data/*.ts` 集中管理，无硬编码路径散落
- ✅ 占位 / 缺失资源走 GlbSafe / texture error / 程序化回退
- ✅ HEAD 探测 + Suspense + ErrorBoundary 三层保护
- ✅ 无 404 路径：未提供的资源直接进回退分支，不发请求
