import type { Config } from 'tailwindcss';

/**
 * VANLAN.OS —— Tesla In-Car OS 视觉体系（R51）
 *
 * 色彩策略：把既有语义 token 直接反转为深色语义，
 * 使全站 `text-ink/*`、`border-ink/*` 无需逐个改类名即可获得
 * 正确的层级对比：
 *   ink   原 #111（浅底黑字） → #E9EDF2（钛黑底浅字）
 *   paper 原 #fafafa           → #090A0C（深钛黑）
 * 新增：
 *   accent  特斯拉警戒红 #E82127（关键按钮 / 录音态 / 激活项）
 *   panel   玻璃面板基色 #12141A
 *   dim     次级文字 #8B929B
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 工业无衬线优先（Inter / SF Pro / DIN 观感），
        // 中文走现代黑体链；等宽仅用于数据/编号等窄场景
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Noto Sans CJK SC"',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        ink: '#E9EDF2',
        paper: '#090A0C',
        panel: '#12141A',
        dim: '#8B929B',
        accent: '#E82127',
        line: 'rgba(255,255,255,0.08)',
      },
      boxShadow: {
        os: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        accent: '0 0 0 1px rgba(232,33,39,0.35), 0 8px 28px rgba(232,33,39,0.22)',
      },
      borderRadius: {
        os: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
