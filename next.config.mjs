/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 本地 .next 偶发被占用时，可用 NEXT_DIST_DIR=.nextbuild 换个产物目录
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
