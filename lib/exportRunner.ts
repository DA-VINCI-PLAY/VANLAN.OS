'use client';

/**
 * exportRunner —— 导出页与 R3F Canvas 之间的极简总线。
 * ExportStudio 页面在 Canvas 内挂一个 Exporter 组件，把真正的导出
 * 执行函数注册到这里；页面按钮 / 自动化流程调用 run()。
 */

export interface ExportJobResult {
  file: string;
  status: 'ok' | 'error';
  bytes?: number;
  error?: string;
}

export const exportBus: {
  run?: () => Promise<ExportJobResult[]>;
} = {};
