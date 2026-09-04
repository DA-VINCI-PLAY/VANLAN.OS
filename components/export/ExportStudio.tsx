'use client';

/**
 * ExportStudio —— VANLAN.OS 3D 资产导出工作室（离线工具页，/export3d）
 *
 * 原理：站点 3D 场景由 React Three Fiber 程序化生成，无法直接「下载文件」。
 * 本页用与正式站完全相同的组件（Room / Character / Plinth / AlbumCarousel /
 * GlassWindow / DustField / LightingController）在浏览器内构建真实 three.js
 * 场景，再用 three 官方 GLTFExporter 把「场景树 + 几何 + 材质 + 程序化贴图 +
 * 灯光（KHR_lights_punctual）+ 摄像机」序列化成 .glb，POST 到
 * /api/export3d 落盘到 export-out/。
 *
 * 结构：
 *   FULL_SCENE          —— 完整房间（墙体/地面/穹顶/双玻璃窗/兽头/陈列台/
 *                          专辑轮播/微尘/灯光/各模式摄像机）→ 场景整包
 *     ├ room            —— 房间建筑（含两扇玻璃窗）
 *     ├ avatar_head     —— 石膏兽头（含雕塑三灯）
 *     ├ plinth          —— 博物馆陈列台
 *     ├ album_carousel  —— 3D 专辑封面轮播
 *     └ dust_field      —— 微尘 Points
 *   SPEC_glass_window   —— 单体玻璃窗样本（天空 plane 贴图随 glb 内嵌）
 *   SPEC_bubble         —— 单体气泡样本
 *   MATERIAL_SAMPLES    —— 运行时从 FULL_SCENE 收集全部材质做的样球
 *
 * 不修改任何站点组件的视觉与逻辑；本页不链接进站点 UI（robots noindex）。
 */

import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { useOS, type Mode } from '@/lib/store';
import { MODE_CONFIG } from '@/lib/modeConfig';
import { ALBUMS } from '@/content/albums';
import { exportBus, type ExportJobResult } from '@/lib/exportRunner';
import Room from '@/components/scene/Room';
import Character from '@/components/scene/Character';
import Plinth from '@/components/scene/Plinth';
import AlbumCarousel from '@/components/scene/AlbumCarousel';
import DustField from '@/components/scene/DustField';
import GlassWindow from '@/components/scene/GlassWindow';
import LightingController from '@/components/scene/LightingController';
import {
  getContactShadowTexture,
  getPlasterNormalMap,
  getPlasterRoughnessMap,
} from '@/lib/plasterTexture';
import { getSkyTexture } from '@/lib/skyGradient';

/* ---------------- helpers ---------------- */

function exportGlb(obj: THREE.Object3D): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      obj,
      (res) => resolve(res as ArrayBuffer),
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
      { binary: true, onlyVisible: false, embedImages: true },
    );
  });
}

async function upload(name: string, data: ArrayBuffer | Blob): Promise<number> {
  const body = data instanceof Blob ? data : new Blob([data]);
  const r = await fetch('/api/export3d', {
    method: 'POST',
    headers: { 'x-filename': encodeURIComponent(name) },
    body,
  });
  if (!r.ok) throw new Error(`upload failed: ${name} (${r.status})`);
  const j = (await r.json()) as { bytes: number };
  return j.bytes;
}

function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/png'),
  );
}

async function textureJob(name: string, tex: THREE.Texture | null) {
  if (!tex) throw new Error('texture unavailable');
  const canvas = tex.image as HTMLCanvasElement;
  if (!canvas || !canvas.toBlob) throw new Error('texture has no canvas source');
  return upload(name, await canvasToBlob(canvas));
}

/* ---------------- scene extras ---------------- */

/** 把 5 个模式的桌面机位作为真实 PerspectiveCamera 节点放进场景（可被 DCC 导入） */
function ModeCameras() {
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'cameras';
    (Object.keys(MODE_CONFIG) as Mode[]).forEach((m) => {
      const cfg = MODE_CONFIG[m];
      const cam = new THREE.PerspectiveCamera(cfg.fovDesktop, 16 / 9, 0.1, 60);
      cam.name = `CAM_${m}`;
      cam.position.set(...cfg.camera.pos);
      cam.lookAt(new THREE.Vector3(...cfg.camera.look));
      g.add(cam);
    });
    return g;
  }, []);
  return <primitive object={group} />;
}

/** 气泡样本（BubbleSystem 的交互/HTML 标签无法进 glb，几何与材质按原参数复刻） */
function BubbleSpecimen() {
  return (
    <group name="SPEC_bubble">
      <mesh name="bubble_sphere">
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.42}
          roughness={0.08}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

/* ---------------- Exporter（Canvas 内执行器） ---------------- */

interface NamedSample {
  name: string;
  mat: THREE.Material;
  from: string;
}

function collectMaterials(root: THREE.Object3D | null): NamedSample[] {
  if (!root) return [];
  const seen = new Set<THREE.Material>();
  const out: NamedSample[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      out.push({
        name: `MAT_${String(out.length).padStart(2, '0')}`,
        mat: m,
        from: o.name || o.parent?.name || 'unnamed_mesh',
      });
    }
  });
  return out;
}

function describeMaterials(samples: NamedSample[]) {
  return samples.map((s) => {
    const m = s.mat as THREE.MeshStandardMaterial;
    const anyMat = s.mat as unknown as Record<string, unknown>;
    return {
      name: s.name,
      sourceMesh: s.from,
      type: s.mat.type,
      color: m.color ? `#${m.color.getHexString()}` : undefined,
      roughness: m.roughness,
      metalness: m.metalness,
      transparent: m.transparent,
      opacity: m.opacity,
      side: m.side,
      hasMap: !!m.map,
      hasNormalMap: !!m.normalMap,
      hasRoughnessMap: !!m.roughnessMap,
      unlit: !!anyMat.isMeshBasicMaterial,
    };
  });
}

function Exporter() {
  const { scene } = useThree();

  useEffect(() => {
    let busy = false;

    exportBus.run = async (): Promise<ExportJobResult[]> => {
      if (busy) return [];
      busy = true;
      const results: ExportJobResult[] = [];

      const one = async (file: string, target: THREE.Object3D | null) => {
        try {
          if (!target) throw new Error('scene node not found');
          const buf = await exportGlb(target);
          const bytes = await upload(file, buf);
          results.push({ file, status: 'ok', bytes });
        } catch (e) {
          results.push({
            file,
            status: 'error',
            error: e instanceof Error ? e.message : String(e),
          });
        }
      };

      const full = scene.getObjectByName('FULL_SCENE') ?? null;

      /* ---- 模型 jobs ---- */
      await one('VANLAN_OS_SCENE.glb', full);
      await one('room.glb', scene.getObjectByName('room') ?? null);
      await one('avatar_head.glb', scene.getObjectByName('avatar_head') ?? null);
      await one('plinth.glb', scene.getObjectByName('plinth') ?? null);
      await one('album_carousel.glb', scene.getObjectByName('album_carousel') ?? null);
      await one('dust_field.glb', scene.getObjectByName('dust_field') ?? null);
      await one('glass_window.glb', scene.getObjectByName('SPEC_glass_window') ?? null);
      await one('bubble.glb', scene.getObjectByName('SPEC_bubble') ?? null);

      /* ---- 材质样本：运行时收集 FULL_SCENE 全部唯一材质 → 样球组 ---- */
      const samples = collectMaterials(full);
      let sampleGroup: THREE.Group | null = null;
      if (samples.length) {
        sampleGroup = new THREE.Group();
        sampleGroup.name = 'MATERIAL_SAMPLES';
        samples.forEach((s, i) => {
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 48, 32),
            s.mat,
          );
          mesh.name = s.name;
          mesh.position.set((i % 6) * 2.6, Math.floor(i / 6) * 2.6, 0);
          sampleGroup!.add(mesh);
        });
        scene.add(sampleGroup);
        await one('material_samples.glb', sampleGroup);
        try {
          const inv = JSON.stringify({ materials: describeMaterials(samples) }, null, 2);
          const bytes = await upload('materials_inventory.json', new Blob([inv]));
          results.push({ file: 'materials_inventory.json', status: 'ok', bytes });
        } catch (e) {
          results.push({
            file: 'materials_inventory.json',
            status: 'error',
            error: e instanceof Error ? e.message : String(e),
          });
        }
        if (sampleGroup) scene.remove(sampleGroup);
      }

      /* ---- 程序化贴图 PNG ---- */
      const accent = ALBUMS[0]?.accentColor ?? '#7eb5ff';
      const texJobs: Array<[string, () => THREE.Texture | null]> = [
        ['plaster_roughness.png', () => getPlasterRoughnessMap()],
        ['plaster_normal.png', () => getPlasterNormalMap()],
        ['contact_shadow.png', () => getContactShadowTexture()],
        ['sky_home.png', () => getSkyTexture('HOME')],
        ['sky_gallery.png', () => getSkyTexture('GALLERY')],
        ['sky_contact.png', () => getSkyTexture('CONTACT')],
        ['sky_about.png', () => getSkyTexture('ABOUT')],
        ['sky_album.png', () => getSkyTexture('ALBUM')],
      ];
      for (const [file, get] of texJobs) {
        try {
          const bytes = await textureJob(file, get());
          results.push({ file, status: 'ok', bytes });
        } catch (e) {
          results.push({
            file,
            status: 'error',
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      /* ---- 导出报告 ---- */
      try {
        const report = JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            project: 'VANLAN.OS',
            results,
          },
          null,
          2,
        );
        await upload('export_report.json', new Blob([report]));
      } catch {
        /* 报告失败不阻塞 */
      }

      busy = false;
      return results;
    };

    return () => {
      exportBus.run = undefined;
    };
  }, [scene]);

  return null;
}

/* ---------------- 页面 ---------------- */

export default function ExportStudio() {
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>(['idle — waiting for scene…']);

  // 固定导出参数：HIGH 档 + ALBUM 模式（房间/轮播/灯光全挂载）+ 动效关闭
  useEffect(() => {
    const os = useOS.getState();
    os.setQuality('high');
    os.setMode('ALBUM');
    os.setThreeD(true);
    os.setWebglOK(true);
    os.setReducedMotion(false);
    setReady(true);
  }, []);

  // 自动化入口：/export3d?auto=1 → 场景就绪后自动跑全部导出
  useEffect(() => {
    if (!ready) return;
    if (!window.location.search.includes('auto=1')) return;
    const t = window.setTimeout(async () => {
      setLog((l) => [...l, 'auto export started…']);
      try {
        const results = (await exportBus.run?.()) ?? [];
        setLog(results.map((r) => `${r.status === 'ok' ? 'OK ' : 'ERR'} ${r.file}${r.error ? ' — ' + r.error : ''}`));
      } catch (e) {
        setLog((l) => [...l, `FATAL ${e instanceof Error ? e.message : String(e)}`]);
      } finally {
        document.title = 'EXPORT_DONE';
      }
    }, 4500); // 等待 GLB 兽头 + 全部组件挂载完成
    return () => window.clearTimeout(t);
  }, [ready]);

  const manualRun = async () => {
    setLog(['manual export started…']);
    const results = (await exportBus.run?.()) ?? [];
    setLog(results.map((r) => `${r.status === 'ok' ? 'OK ' : 'ERR'} ${r.file}${r.error ? ' — ' + r.error : ''}`));
    document.title = 'EXPORT_DONE';
  };

  if (!ready) return null;

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#111' }}>
      <Canvas
        dpr={[1, 1]}
        camera={{ fov: 42, near: 0.1, far: 2000, position: [0, 1.72, 4.6] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <group name="FULL_SCENE">
            <group name="room">
              <Room isMobile={false} />
            </group>
            <group name="avatar_head">
              <Character />
            </group>
            <group name="plinth">
              <Plinth />
            </group>
            <group name="album_carousel">
              <AlbumCarousel />
            </group>
            <group name="dust_field">
              <DustField isMobile={false} />
            </group>
            <LightingController isMobile={false} />
            <ModeCameras />
          </group>

          {/* 样本区（远在主场景下方，互不干扰） */}
          <group position={[0, -500, 0]}>
            <group name="SPEC_glass_window">
              <GlassWindow
                position={[0, 0, 0]}
                rotationY={0}
                width={5.6}
                height={4.55}
                isMobile={false}
              />
            </group>
            <BubbleSpecimen />
          </group>

          <Exporter />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 10,
          color: '#7fff9e',
          font: '12px/1.5 Consolas, monospace',
          whiteSpace: 'pre-wrap',
          maxHeight: '40vh',
          overflow: 'auto',
        }}
      >
        {log.join('\n')}
      </div>
      <button
        type="button"
        onClick={manualRun}
        style={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 10,
          padding: '8px 14px',
        }}
      >
        EXPORT NOW
      </button>
    </main>
  );
}
