import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VANLAN.OS',
  description: 'A 3D personal digital space.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 不锁 maximumScale=1：允许用户双指/无障碍缩放
  themeColor: '#FAF8F4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#FAF8F4] text-ink antialiased overflow-hidden">{children}</body>
    </html>
  );
}
