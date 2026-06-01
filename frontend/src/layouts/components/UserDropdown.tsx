import React, { useState, useRef, useEffect } from 'react';
import { UserCog, LogOut } from 'lucide-react';

interface UserProfile {
  id: string | number;
  name: string;
  role: string;
}

interface UserDropdownProps {
  user: UserProfile | null;
  avatarColor: string;
  navigate: (path: string) => void;
  handleLogout: () => void;
}

export const UserDropdown = React.memo(({
  user,
  avatarColor,
  navigate,
  handleLogout
}: UserDropdownProps) => {
  // SELF-CONTAINED REACTIVE USER EXPANSION HOOK
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [isOpen]);

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 pl-2.5 pr-1.5 py-1.5 rounded-xl border transition-all shadow-3xs cursor-pointer group
          ${isOpen 
            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60" 
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/80 hover:border-blue-500"}`}
      >
        <div className="hidden sm:flex flex-col items-end leading-none select-none">
          <span className="text-[11px] font-black text-gray-900 dark:text-white truncate max-w-[110px]">
            {user?.name || "Operator"}
          </span>
          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-1">
            {user?.role || "Member"}
          </span>
        </div>
        
        <div className={`w-7 h-7 ${avatarColor} rounded-lg flex items-center justify-center text-white text-[11px] font-black flex-shrink-0 select-none`}>
          {user?.name?.[0]?.toUpperCase() || "?"}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 select-none">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 ${avatarColor} rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate leading-none">{user?.name}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1 leading-none">ID #{user?.id || '0'}</p>
              </div>
            </div>
          </div>
          
          <div className="p-1.5">
            <button 
              type="button"
              onClick={() => { navigate("/settings"); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer text-left font-medium"
            >
              <UserCog size={14} className="text-blue-500 flex-shrink-0" />
              <span>Identity Profile</span>
            </button>
            
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
            
            <button 
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer text-left uppercase tracking-wider"
            >
              <LogOut size={14} className="flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

UserDropdown.displayName = 'UserDropdown';