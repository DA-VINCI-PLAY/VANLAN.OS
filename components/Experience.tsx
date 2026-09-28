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
import BusinessCard from './ui/BusinessCard';
import PanelSwap from './ui/PanelSwap';
import SettingsToggle from './ui/SettingsToggle';
import PreloadAssets from './ui/PreloadAssets';

/** DOM UI 总装（Canvas / Fallback 之外的 overlay 层，两者共用） */
export default function Experience() {
  const mode = useOS((s) => s.mode);
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
      <PreloadAssets />
      <HomeContent />
      {/* R46 名片化：HomeSlab（展台告示牌）停止挂载 —— 身份/座右铭信息
          由 BusinessCard 承担，组件文件保留可复用。
          名片走 PanelSwap：进入上浮、离开缩小退出（与模式面板同一节奏）。 */}
      <PanelSwap show={mode === 'HOME'} z={20}>
        <BusinessCard />
      </PanelSwap>
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
