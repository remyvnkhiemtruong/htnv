import React, { useEffect, useState } from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileDrawer } from './MobileDrawer';
import { StudentBottomNav } from './StudentBottomNav';
import { CommandPalette } from './CommandPalette';
import { useAuthStore } from '../../app/store/useAuthStore';

interface MainLayoutProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentView, onNavigate, onLogout, children }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const immersive = currentView === 'editor' || currentView === 'teacher-review';

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => document.getElementById('main-content')?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [currentView]);

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-slate-50 font-sans text-slate-900" data-app-name="Học tốt Ngữ Văn">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-lg focus:bg-primary-700 focus:px-4 focus:py-2 focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-white">Chuyển thẳng đến nội dung chính</a>
      <AppHeader currentView={currentView} onNavigate={onNavigate} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)} onLogout={onLogout}/>
      <div className={`mx-auto flex w-full max-w-[100rem] flex-1 ${immersive ? 'pb-0' : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'} md:pb-0`}>
        <AppSidebar currentView={currentView} onNavigate={onNavigate} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}/>
        <main
          id="main-content"
          tabIndex={-1}
          className={`min-w-0 flex-1 overflow-y-auto overscroll-y-contain focus:outline-none ${immersive ? 'p-0' : 'px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10 xl:py-8'}`}
        >
          <div key={currentView} className="app-view-enter min-w-0">
            {children}
          </div>
        </main>
      </div>
      <MobileDrawer isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} currentView={currentView} onNavigate={onNavigate} onLogout={onLogout}/>
      {currentUser.role === 'student' && !immersive && <StudentBottomNav currentView={currentView} onNavigate={onNavigate} />}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={onNavigate}/>
    </div>
  );
};
