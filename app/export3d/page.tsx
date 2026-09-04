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
 */
export default function Export3dPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <ExportStudio />;
}
