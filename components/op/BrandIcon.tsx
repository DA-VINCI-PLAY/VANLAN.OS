'use client';

/**
 * BrandIcon —— 社交平台极简图标（R55）
 *
 * 统一 24 viewBox 线性风格，currentColor 着色；
 * 追求「一眼可认」而非官方复刻，配合 title/aria-label 提供文字兜底。
 */

interface Props {
  id: string;
  size?: number;
  className?: string;
}

export default function BrandIcon({ id, size = 18, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'douyin': // 音符
      return (
        <svg {...common}>
          <circle cx="6.8" cy="17.2" r="2.9" />
          <path d="M9.7 17.2V5.6L19 4v10.4" />
          <circle cx="16.1" cy="14.4" r="2.9" />
        </svg>
      );
    case 'bilibili': // 电视机
      return (
        <svg {...common}>
          <rect x="3.2" y="7.4" width="17.6" height="12.2" rx="3.2" />
          <path d="M7.6 3.4 10.6 7M16.4 3.4 13.4 7" />
          <path d="M8.6 12v2.4M15.4 12v2.4" />
        </svg>
      );
    case 'xiaohongshu': // 小红书 · 本子
      return (
        <svg {...common}>
          <path d="M4.5 5.6A2.6 2.6 0 0 1 7.1 3H19.5v18H7.1a2.6 2.6 0 0 1-2.6-2.6Z" />
          <path d="M4.5 18.4a2.6 2.6 0 0 1 2.6-2.6h12.4" />
          <path d="M8.6 8.4h6.8" />
        </svg>
      );
    case 'x': // X
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M4.5 4.5 19.5 19.5M19.5 4.5l-15 15" />
        </svg>
      );
    case 'instagram': // 相机
      return (
        <svg {...common}>
          <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6" />
          <circle cx="12" cy="12" r="3.9" />
          <circle cx="17.1" cy="6.9" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'threads': // @
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.4" />
          <circle cx="12" cy="12" r="3.4" />
          <path d="M15.4 12v1.6a2.4 2.4 0 0 0 4.8 0V12" />
        </svg>
      );
    case 'youtube': // 播放
      return (
        <svg {...common}>
          <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="4.2" />
          <path d="m10.2 9.4 4.9 2.6-4.9 2.6Z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.4" />
        </svg>
      );
  }
}
