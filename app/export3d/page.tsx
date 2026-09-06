import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExportStudio from '@/components/export/ExportStudio';

export const metadata: Metadata = {
  title: 'VANLAN.OS — 3D Export Studio',
  robots: { index: false, follow: false },
};

/**
 * R40-A4：dev 本地 (next dev) 仍可用，导出 3D 资源到 <project>/export-out/；
 *         生产环境（Netlify 部署）整个页面 404，从入口拒绝。
 * R44：本地产出模式 —— `VANLAN_EXPORT=1 next start` 时放行（仅本地跑导出用，
 *         Netlify 上不会设这个变量，线上依旧 404）。
 */
export default function Export3dPage() {
  if (process.env.NODE_ENV === 'production' && process.env.VANLAN_EXPORT !== '1') {
    notFound();
  }
  return <ExportStudio />;
}
