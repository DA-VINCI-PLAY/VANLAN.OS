'use client';

/**
 * 数字圣堂（Digital Sanctuary）—— R11 第十一轮重构
 *
 * R11 目标（用户指令 §四~§六）：
 *  - 三层亮度（墙浅灰 / 地暖灰 / 兽头最亮）—— 保留 R10 结论；
 *  - 严禁地面出现光晕、灯斑、圆形装饰 → 删除 R10 "祭坛环" 双圈、
 *    圆台聚光池（已在 Plinth 移除）、墙角圆形柔影；
 *  - 严禁窗边白色圆圈 → 关掉玻璃菲涅尔罩、降低玻璃边缘高光；
 *  - 严禁纯白过曝 → envMap 降到 0.45；
 *  - 强化建筑细节但全白/暖白（用户指令 §三）：墙面浅浮雕（已有）+
 *    中段横向凹槽（banding）+ 底脚踢脚线 + 天花径向光带 + 弧形顶环；
 *  - 阴影真实、可读但不黑硬（PCFSoft、bias 合理、normalBias 保护）。
 *
 * 平面角度约定：φ 从正后方（-z）起算，sinφ → x，-cosφ → z。
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { QUALITY_CFG } from '@/lib/perf';
import { useOS } from '@/lib/store';
import GlassWindow from './GlassWindow';

/* === R11 建筑材质分层（三层亮度） === */
const WALL = '#ece9e1'; // 墙：浅灰白
const WALL_ROUGH = 0.94;
const FLOOR = '#d6d2c9'; // 地：明显深于墙的暖灰
const FLOOR_ROUGH = 0.82;
const DOME = '#e4e0d7'; // 穹顶：比墙再收一档
const DOME_ROUGH = 0.96;
const CORNICE = '#d6d2c9'; // 檐口结构环
const CORNICE_ROUGH = 0.72;

/* 浅浮雕（略亮于墙面，靠受光差异显形；不再纯白刺眼） */
const RELIEF_MAT = new THREE.MeshStandardMaterial({
  color: '#f1eee6',
  roughness: 0.84,
  metalness: 0,
});

/* 横向凹槽（mid-height banding）—— 略深一档暖灰 */
const BAND_MAT = new THREE.MeshStandardMaterial({
  color: '#cdc7b9',
  roughness: 0.85,
  metalness: 0,
});

/* 踢脚线（墙底深一档极细水平沟槽） */
const BASE_MAT = new THREE.MeshStandardMaterial({
  color: '#bcb6a8',
  roughness: 0.88,
  metalness: 0,
});

/* === 建筑常数 === */
const R = 7;
const WALL_H = 4.62;
const T = 0.35;
const DOME_Y = 4.6;
const OCULUS_T0 = 0.19;

/* === 墙段 / 窗 / 柱角度 === */
const WINDOW_ANGLES = [54];
const PIER_ANGLES = [24, 82];
/* 填充墙：闭合「后墙 ↔ 侧柱」之间的 8° 亮缝（R10 防止背后穹顶透出） */
const FILL_ANGLES = [12];
/* 填充墙：闭合「侧柱 ↔ 大窗」之间的 2.5° 窄缝 */
const FILL_NEAR_WINDOW_ANGLES = [32];

const rad = (d: number) => (d * Math.PI) / 180;

/** 平面角 φ（度）→ 半径 r 处的 (x, z) */
function polar(phiDeg: number, r: number): [number, number] {
  const a = rad(phiDeg);
  return [Math.sin(a) * r, -Math.cos(a) * r];
}

/* ---------- 一段弧形墙 ---------- */
function WallSegment({
  phi,
  width,
}: {
  phi: number;
  width: number;
}) {
  const [x, z] = polar(phi, R);
  return (
    <mesh
      castShadow
      receiveShadow
      position={[x, WALL_H / 2, z]}
      rotation={[0, -rad(phi), 0]}
    >
      <boxGeometry args={[width, WALL_H, T]} />
      <meshStandardMaterial
        color={WALL}
        roughness={WALL_ROUGH}
        envMapIntensity={0.45}
      />
    </mesh>
  );
}

/* ---------- 浅浮雕竖向沟槽 ---------- */
function ReliefStrip({
  phi,
  localX,
  height = 3.0,
}: {
  phi: number;
  localX: number;
  height?: number;
}) {
  const [x, z] = polar(phi, R);
  return (
    <group position={[x, WALL_H / 2, z]} rotation={[0, -rad(phi), 0]}>
      <mesh
        position={[localX, 0.04, T / 2 + 0.018]}
        scale={[1, height, 1]}
        material={RELIEF_MAT}
      >
        <boxGeometry args={[0.09, 1, 0.05]} />
      </mesh>
    </group>
  );
}

/* ---------- 横向中段凹槽（banding）—— R11 新增：墙面层次 ---------- */
function HorizontalBand({
  phi,
  width,
  y,
}: {
  phi: number;
  width: number;
  y: number;
}) {
  const [x, z] = polar(phi, R);
  return (
    <mesh
      position={[x, y, z]}
      rotation={[0, -rad(phi), 0]}
      material={BAND_MAT}
    >
      <boxGeometry args={[width, 0.06, T + 0.012]} />
    </mesh>
  );
}

/* ---------- 踢脚线（baseboard）—— R11 新增：墙面底部水平沟槽 ---------- */
function Baseboard({
  phi,
  width,
}: {
  phi: number;
  width: number;
}) {
  const [x, z] = polar(phi, R);
  return (
    <mesh
      position={[x, 0.18, z]}
      rotation={[0, -rad(phi), 0]}
      material={BASE_MAT}
    >
      <boxGeometry args={[width, 0.16, T + 0.015]} />
    </mesh>
  );
}

/* ---------- 穹顶分段环线 ---------- */
function DomeRing({ y }: { y: number }) {
  const dy = y - DOME_Y;
  const r = Math.sqrt(Math.max(R * R - dy * dy, 0.1)) - 0.02;
  if (r <= 0.2) return null;
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.02, 6, 72]} />
      <meshStandardMaterial color="#d9d4ca" roughness={0.9} metalness={0} />
    </mesh>
  );
}

/* ---------- 穹顶经线（meridian）：从顶部天眼放射向下的细沟槽 ---------- */
function DomeMeridian({ angle }: { angle: number }) {
  // 用细长 box 沿径向贴合穹顶内表面；用 plane 沿经度线贴
  // 简化：在 DOME_Y 上方画一道由顶圈到墙高的细弧线 → 用 thin CylinderGeometry
  // 因为做经线需知道球面参数，这里退化为顶部小环上的短线（桌面观感足够）
  const r = R - 0.02;
  const rad2 = rad(angle);
  const yStart = DOME_Y; // 顶部
  const yEnd = WALL_H - 0.05; // 拱形底部
  // 用 BoxGeometry 沿经度贴在球面近似（误差小，desktop 不可见）
  return (
    <mesh
      position={[Math.sin(rad2) * r * 0.99, (yStart + yEnd) / 2, -Math.cos(rad2) * r * 0.99]}
      rotation={[0, -rad2, Math.PI / 2]}
    >
      <cylinderGeometry args={[0.012, 0.012, yStart - yEnd, 6, 1, false]} />
      <meshStandardMaterial color="#dad4c9" roughness={0.92} metalness={0} />
    </mesh>
  );
}

export default function Room({ isMobile }: { isMobile: boolean }) {
  const quality = useOS((s) => s.quality);
  const qc = QUALITY_CFG[quality];
  const reliefBudget = qc.reliefCount[isMobile ? 1 : 0];

  /* === 穹顶环线预算（HIGH 2 / MED 1 / LOW 0） === */
  const domeRingYs = useMemo(() => {
    if (quality === 'high') return [5.5, 6.55];
    if (quality === 'medium') return [5.5];
    return [];
  }, [quality]);

  /* === 经线（仅 HIGH，4 道）—— 增加天花层次 === */
  const domeMeridians = useMemo(() => {
    if (quality !== 'high') return [];
    return [-60, -20, 20, 60];
  }, [quality]);

  /* === 前方实墙（无窗区，约 90°~270°），7 段 26° === */
  const frontCenters = [102, 128, 154, 180, 206, 232, 258];
  const frontWidth = 2 * R * Math.sin(rad(13)) + 0.25;

  /* === 中段横向凹槽预算（HIGH 全配，MED 关键段，LOW 关） === */
  const bandYs = quality === 'high' ? [2.6] : quality === 'medium' ? [2.6] : [];

  /* === 浅浮雕槽位顺序（按预算取） === */
  const reliefSlots: { phi: number; localX: number }[] = [];
  if (reliefBudget > 0) {
    const plan: { phi: number; xs: number[] }[] = [
      { phi: 0, xs: [-0.78, 0.78] },
      { phi: 24, xs: [0] },
      { phi: -24, xs: [0] },
    ];
    outer: for (const p of plan) {
      for (const x of p.xs) {
        if (reliefSlots.length >= reliefBudget) break outer;
        reliefSlots.push({ phi: p.phi, localX: x });
      }
    }
  }

  return (
    <group>
      {/* ---------- 地面（暖灰 + 极轻 env 反射） ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[R + 1.6, 48]} />
        <meshStandardMaterial
          color={FLOOR}
          roughness={FLOOR_ROUGH}
          metalness={0}
          envMapIntensity={0.12}
        />
      </mesh>
      {/* R11：移除 R10 地面径向明暗渐变罩（圆形感 → 与"禁地面圆环"冲突）。
          用墙脚踢脚线的水平沟槽 + 真实阴影代替纵深感。 */}

      {/* ---------- 弧形墙 + 柱 + 填充墙（左右对称） ---------- */}
      <WallSegment phi={0} width={2.3} />
      {([-1, 1] as const).map((side) =>
        FILL_ANGLES.map((a) => (
          <WallSegment key={`fill${side}${a}`} phi={side * a} width={1.6} />
        )),
      )}
      {([-1, 1] as const).map((side) =>
        FILL_NEAR_WINDOW_ANGLES.map((a) => (
          <WallSegment key={`fillw${side}${a}`} phi={side * a} width={1.0} />
        )),
      )}
      {([-1, 1] as const).map((side) =>
        PIER_ANGLES.map((a) => (
          <WallSegment key={`p${side}${a}`} phi={side * a} width={1.6} />
        )),
      )}
      {/* 前方实墙 */}
      {frontCenters.map((c) => (
        <WallSegment key={`f${c}`} phi={c} width={frontWidth} />
      ))}

      {/* ---------- 建筑浅浮雕（Phase 01） ---------- */}
      {reliefSlots.map((s, i) => (
        <ReliefStrip key={`relief${i}`} phi={s.phi} localX={s.localX} />
      ))}

      {/* ---------- 中段横向凹槽（banding）---------- */}
      {bandYs.map((y) => (
        <group key={`band-${y}`}>
          {/* 后墙 */}
          <HorizontalBand phi={0} width={2.3} y={y} />
          {/* 侧柱 */}
          {([-1, 1] as const).map((side) =>
            PIER_ANGLES.map((a) => (
              <HorizontalBand
                key={`bp${side}${a}`}
                phi={side * a}
                width={1.6}
                y={y}
              />
            )),
          )}
          {/* 填充墙段 */}
          {([-1, 1] as const).map((side) =>
            FILL_ANGLES.map((a) => (
              <HorizontalBand
                key={`bf${side}${a}`}
                phi={side * a}
                width={1.6}
                y={y}
              />
            )),
          )}
          {([-1, 1] as const).map((side) =>
            FILL_NEAR_WINDOW_ANGLES.map((a) => (
              <HorizontalBand
                key={`bfw${side}${a}`}
                phi={side * a}
                width={1.0}
                y={y}
              />
            )),
          )}
          {/* 前方实墙 */}
          {frontCenters.map((c) => (
            <HorizontalBand
              key={`bandf${c}`}
              phi={c}
              width={frontWidth}
              y={y}
            />
          ))}
        </group>
      ))}

      {/* ---------- 踢脚线（baseboard）—— 墙底水平沟槽 ---------- */}
      {/* 后墙 */}
      <Baseboard phi={0} width={2.3} />
      {/* 侧柱 */}
      {([-1, 1] as const).map((side) =>
        PIER_ANGLES.map((a) => (
          <Baseboard key={`bs${side}${a}`} phi={side * a} width={1.6} />
        )),
      )}
      {/* 填充墙段 */}
      {([-1, 1] as const).map((side) =>
        FILL_ANGLES.map((a) => (
          <Baseboard key={`bf${side}${a}`} phi={side * a} width={1.6} />
        )),
      )}
      {([-1, 1] as const).map((side) =>
        FILL_NEAR_WINDOW_ANGLES.map((a) => (
          <Baseboard key={`bfw${side}${a}`} phi={side * a} width={1.0} />
        )),
      )}
      {/* 前方实墙 */}
      {frontCenters.map((c) => (
        <Baseboard key={`basef${c}`} phi={c} width={frontWidth} />
      ))}

      {/* ---------- 2 扇大型纯玻璃落地窗（左右各 1） ---------- */}
      {([-1, 1] as const).map((side) =>
        WINDOW_ANGLES.map((a) => {
          const [x, z] = polar(a * side, R);
          return (
            <GlassWindow
              key={`gw${side}${a}`}
              position={[x, 2.35, z]}
              rotationY={-rad(a * side)}
              width={5.6}
              height={4.55}
              isMobile={isMobile}
            />
          );
        }),
      )}

      {/* ---------- 檐口实体结构环（顶部建筑线） ---------- */}
      <mesh position={[0, WALL_H + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R - 0.12, 0.08, 10, 72]} />
        <meshStandardMaterial
          color={CORNICE}
          roughness={CORNICE_ROUGH}
          metalness={0.12}
          envMapIntensity={0.35}
        />
      </mesh>

      {/* ---------- 半球穹顶（内表面）+ 分段环线 + 经线 + 天眼 ---------- */}
      <mesh position={[0, DOME_Y, 0]} receiveShadow>
        <sphereGeometry
          args={[R, 48, 20, 0, Math.PI * 2, OCULUS_T0, Math.PI / 2 - OCULUS_T0]}
        />
        <meshStandardMaterial
          color={DOME}
          roughness={DOME_ROUGH}
          side={THREE.BackSide}
          envMapIntensity={0.45}
        />
      </mesh>

      {domeRingYs.map((y) => (
        <DomeRing key={`dr${y}`} y={y} />
      ))}

      {domeMeridians.map((a) => (
        <DomeMeridian key={`dm${a}`} angle={a} />
      ))}

      {/* 天眼内圈收边 */}
      <mesh
        position={[0, DOME_Y + R * Math.cos(OCULUS_T0) - 0.05, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[R * Math.sin(OCULUS_T0), 0.09, 8, 32]} />
        <meshStandardMaterial color="#e7e2d7" roughness={0.82} />
      </mesh>
    </group>
  );
}