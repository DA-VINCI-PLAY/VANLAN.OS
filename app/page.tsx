import OpShell from '@/components/op/OpShell';

/**
 * VANLAN.OS · R52
 *
 * 结构：2D 动漫 OP 分镜背景（底层） + 透明 3D 兽头（中层） +
 *       时间轴驱动的四段前景（上层）。
 * 所有交互与状态都在客户端组件内，服务端只输出外壳。
 */
export default function Page() {
  return <OpShell />;
}
