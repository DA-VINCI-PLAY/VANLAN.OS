import { useEffect, useState } from 'react';

/** 移动端 / 低性能设备检测（粗略，仅用于降级参数）
 *  - 主规则：width<768（手机竖屏、平板触屏触屏宽等）→ mobile
 *  - 副规则：极矮横屏（h<500 且 w<1024，如手机横屏 / 矮窗）→ mobile
 *    桌面电脑 1440×900 等大屏宽高均不在此范围，不受影响。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const touch = window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(w < 768 || touch || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
