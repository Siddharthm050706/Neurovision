import React, { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MedicalDisclaimer } from '../common/MedicalDisclaimer';
import { GlobalBrainWatermark } from './GlobalBrainWatermark';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div
      className="relative flex h-dvh w-full overflow-hidden bg-[#f4f7f9] text-slate-800"
      style={{ '--watermark-offset': sidebarCollapsed ? '38px' : '128px' } as React.CSSProperties}
    >
      <GlobalBrainWatermark />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onCloseMobile={closeMobileNav}
      />
      <div className={`relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200 ${
        sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64'
      }`}>
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 sm:p-6">
          <Outlet />
          <div className="mx-auto mt-6 w-full max-w-[1440px]">
            <MedicalDisclaimer variant="light" />
          </div>
        </main>
      </div>
    </div>
  );
};
