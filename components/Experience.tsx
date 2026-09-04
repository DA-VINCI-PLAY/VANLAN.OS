'use client';

import { useEffect } from 'react';
import { useOS } from '@/lib/store';
import LoadingScreen from './ui/LoadingScreen';
import SystemHUD from './ui/SystemHUD';
import ModePanels from './ui/ModePanels';
import AudioPlayer from './ui/AudioPlayer';
import QrModal from './ui/QrModal';
import BottomNavigation from './ui/BottomNavigation';
import HomeButton from './ui/HomeButton';
import HomeContent from './ui/HomeContent';
import HomeSlab from './ui/HomeSlab';
import SettingsToggle from './ui/SettingsToggle';

/** DOM UI 总装（Canvas / Fallback 之外的 overlay 层，两者共用） */
export default function Experience() {
  const setMode = useOS((s) => s.setMode);

  // ESC 返回 HOME；QR Modal 打开时由 Modal 自己接管 Esc（此处让行）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const os = useOS.getState();
        if (os.qrPlatform) return; // QrModal 处理：关闭弹窗 + 焦点归还
        if (os.mode !== 'HOME') setMode('HOME');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMode]);

  return (
    <>
      <LoadingScreen />
      <HomeContent />
      <HomeSlab />
      <SystemHUD />
      <SettingsToggle />
      <HomeButton />
      <ModePanels />
      <AudioPlayer />
      <QrModal />
      <BottomNavigation />
    </>
  );
}
