'use client';

/**
 * PreloadAssets —— 空闲时段资源预热（R50 §4）
 *
 * 用户指令：应用初始化或空闲时（requestIdleCallback / useEffect）预加载
 * ALBUM 专辑封面（new Image().src）与音频元数据，消除切到 ALBUM 时
 * 封面闪现 / 播放器元数据延迟。
 *
 * 策略：
 *  - 首屏关键路径（GLB 模型、头像）已在 LoadingScreen 阶段加载，不重复；
 *  - 封面图：Image() 异步解码拉取，切 ALBUM 时浏览器缓存直出；
 *  - 音频：new Audio() + preload='metadata' —— 只拉元数据（时长等），
 *    不下载整段音源（8 首 mp3 全量 ~20MB，绝不能在空闲期偷偷吃完流量）；
 *  - 背景材质 / 展台渐变纹理为程序化 Canvas 生成（零网络延迟），无需预热；
 *  - 整体挂在 requestIdleCallback（超时 3s 兜底），不与首屏渲染抢主线程。
 */

import { useEffect } from 'react';
import { ALBUMS } from '@/content/albums';

export default function PreloadAssets() {
  useEffect(() => {
    let cancelled = false;

    const idle = (cb: () => void) => {
      if (typeof window === 'undefined') return;
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(cb, { timeout: 3000 });
      } else {
        window.setTimeout(cb, 1200);
      }
    };

    idle(() => {
      if (cancelled) return;

      // ① 专辑封面图（ALBUM 面板 + 3D 封面轮播共用同一路径 → 命中同一缓存）
      for (const album of ALBUMS) {
        if (!album.cover) continue;
        const img = new Image();
        img.decoding = 'async';
        img.src = album.cover;
      }

      // ② 音频元数据（时长 / 码率），preload='metadata' 不拉音频本体
      for (const album of ALBUMS) {
        const srcs = album.tracks
          .map((t) => t.src)
          .filter((s): s is string => Boolean(s));
        if (album.preview) srcs.push(album.preview);
        for (const s of srcs) {
          const el = new Audio();
          el.preload = 'metadata';
          el.src = s;
          void el; // 仅借元素触发 range 请求，引用即弃
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
