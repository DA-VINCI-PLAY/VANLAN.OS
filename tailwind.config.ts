import type { Config } from 'tailwindcss';

/**
 * VANLAN.OS —— 白橙视觉体系（R53）
 *
 * 色彩策略：语义 token 反转为浅色语义，
 * 全站 `text-ink/*`、`border-ink/*` 无需逐个改类名即可获得正确层级：
 *   ink   #E9EDF2（深底浅字）→ #1B1E23（白底墨字）
 *   paper #090A0C（深钛黑）  → #FAF8F4（暖白纸感）
 * 新增：
 *   accent  活力橙 #F35A17（关键按钮 / 激活项 / 时间轴播放头）
 *   panel   玻璃面板基色 #FFFFFF
 *   dim     次级文字 #7A8087
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
        ink: '#1B1E23',
        paper: '#FAF8F4',
        panel: '#FFFFFF',
        dim: '#7A8087',
        accent: '#F35A17',
        line: 'rgba(22,24,28,0.10)',
      },
      boxShadow: {
        os: '0 24px 64px rgba(46,36,24,0.16), inset 0 1px 0 rgba(255,255,255,0.6)',
        accent: '0 0 0 1px rgba(243,90,23,0.35), 0 8px 28px rgba(243,90,23,0.22)',
      },
      borderRadius: {
        os: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
