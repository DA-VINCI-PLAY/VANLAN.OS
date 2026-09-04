import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 科技终端感：拉丁/数字优先自托管 JetBrains Mono（跨平台观感一致），
        // 中文走得意黑 Smiley Sans（斜切锋锐、宣言气质），兜底现代黑体防宋体回退。
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          // --- 中文：得意黑 → 现代黑体链（按平台优先级） ---
          '"Smiley Sans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '微软雅黑',
          '"Noto Sans CJK SC"',
          '"Source Han Sans SC"',
          'sans-serif',
        ],
      },
      colors: {
        ink: '#111111',
        paper: '#fafafa',
      },
    },
  },
  plugins: [],
};

export default config;
