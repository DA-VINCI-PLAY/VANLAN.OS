import dynamic from 'next/dynamic';
import Experience from '@/components/Experience';

/* RenderRoot 仅客户端：决定 3D Canvas 或 2D Fallback（SSR 不渲染，避免 WebGL 探测水合错位） */
const RenderRoot = dynamic(() => import('@/components/RenderRoot'), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-white">
      <RenderRoot />
      <Experience />
    </main>
  );
}
