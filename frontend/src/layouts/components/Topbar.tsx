import React, { useEffect } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import AttendanceWidget from "../../components/AttendanceWidget";
import { NotificationDropdown } from './NotificationDropdown';
import { UserDropdown } from './UserDropdown';

interface NotifData {
  overdue: number;
  today: number;
  newLeads: number;
  new_leads?: number; 
}

interface TopbarProps {
  setSidebarOpen: (open: boolean) => void;
  pageTitle: string;
  dark: boolean;
  setDark: React.Dispatch<React.SetStateAction<boolean>>;
  notifData: NotifData;
  totalNotif: number;
  navigate: (path: string) => void;
  clearNotifs: () => void;
  user: any;
  avatarColor: string;
  handleLogout: () => void;
  showNotif: boolean;
  setShowNotif: (show: boolean) => void;
  showUser: boolean;
  setShowUser: (show: boolean) => void;
}

export const Topbar = React.memo(({
  setSidebarOpen,
  pageTitle,
  dark,
  setDark,
  notifData,
  totalNotif,
  navigate,
  clearNotifs,
  user,
  avatarColor,
  handleLogout,
  showNotif,
  setShowNotif,
  showUser,
  setShowUser
}: TopbarProps) => {

  // 🚀 FIXED: Synchronize HTML DOM document token classes with state theme updates instantly
  useEffect(() => {
    const root = window.document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <header className="h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60 flex items-center px-4 justify-between sticky top-0 z-40 flex-shrink-0 select-none">
      
      {/* Left Core: Clean Mobile Toggle & Breadcrumbs Only */}
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex-shrink-0 cursor-pointer"
        >
          <Menu size={16} />
        </button>
        
        <div className="hidden sm:flex items-center gap-2 font-medium text-xs">
          <span className="text-gray-400 font-medium">Workspace</span>
          <span className="text-gray-300 dark:text-gray-700 font-light">/</span>
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 pt-0.5">
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* Right Core: Action Tools & Profiles */}
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 scale-95 origin-right">
          <AttendanceWidget />
        </div>

        {/* 🚀 UPGRADED: Core Theme Switcher Interceptor Button */}
       <button 
  type="button"
  onClick={() => setDark(d => !d)}
  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 hover:border-blue-500 transition-all flex-shrink-0 cursor-pointer shadow-3xs"
  title={dark ? "Switch to light mode" : "Switch to dark mode"}
>
  {dark ? (
    <Moon size={15} className="text-yellow-400 fill-yellow-400/10 animate-in fade-in zoom-in-75 duration-200" />
  ) : (
    <Sun size={15} className="text-gray-400 fill-gray-100/50 animate-in fade-in zoom-in-75 duration-200" />
  )}
</button>

        <NotificationDropdown
          notifData={notifData}
          totalNotif={totalNotif}
          navigate={navigate}
          clearNotifs={clearNotifs}
        />

        <UserDropdown
          showUser={showUser}
          setShowUser={setShowUser}
          user={user}
          avatarColor={avatarColor}
          navigate={navigate}
          handleLogout={handleLogout}
        />
      </div>
    </header>
  );
});

Topbar.displayName = 'Topbar';