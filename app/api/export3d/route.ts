import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/**
 * 3D 导出落盘 API（仅本地导出流程使用）
 * POST body = 文件二进制；header x-filename = 目标文件名。
 * 写入 <project>/export-out/，由组装脚本收进 VANLAN_OS_3D_ASSETS。
 *
 * R40-A4：生产环境直接 404。生产暴露写端点无意义（Netlify Functions 是 serverless
 *         实例，写盘无持久化，且任何人都能 POST 任意二进制进函数磁盘）。
 *         Dev 本地 (`next dev`) 仍可用，export-out/ 持久化于工作目录。
 */
export const runtime = 'nodejs';
const DISABLED_IN_PROD = process.env.NODE_ENV === 'production';

export async function POST(req: Request) {
  if (DISABLED_IN_PROD) {
    return new NextResponse('Not Found', { status: 404 });
  }
  const raw = req.headers.get('x-filename') ?? 'unnamed.bin';
  const safe = path
    .basename(decodeURIComponent(raw))
    .replace(/[^\w.\-]/g, '_');
  const dir = path.join(process.cwd(), 'export-out');
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await req.arrayBuffer());
  await writeFile(path.join(dir, safe), buf);
  return NextResponse.json({ ok: true, file: safe, bytes: buf.length });
}
