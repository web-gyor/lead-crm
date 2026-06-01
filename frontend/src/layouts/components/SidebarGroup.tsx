import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SidebarLink } from './SidebarLink';

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.ReactNode;
  slug?: string;
  isComingSoon?: boolean; // 🚀 FIXED: Type-aligned configuration context
  children?: NavItemConfig[];
}

interface SidebarGroupProps {
  item: NavItemConfig;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  closeSidebar: () => void;
}

export const SidebarGroup = React.memo(({ item, collapsed, open, onToggle, closeSidebar }: SidebarGroupProps) => {
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? item.label : undefined}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white transition-all text-xs cursor-pointer group relative"
      >
        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-400">
          {item.icon}
        </span>
        
        {!collapsed && <span className="flex-1 text-left leading-none pt-0.5">{item.label}</span>}
        
        {!collapsed && (
          <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}

        {collapsed && (
          <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[9px] font-black rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            {item.label}
          </div>
        )}
      </button>

      {!collapsed && open && item.children && (
        <div className="ml-4 mt-0.5 pl-2.5 border-l border-gray-100 dark:border-gray-800 space-y-0.5">
          {item.children.map(child => (
            <SidebarLink key={child.to} item={child} collapsed={false} onClick={closeSidebar} />
          ))}
        </div>
      )}
    </div>
  );
});

SidebarGroup.displayName = 'SidebarGroup';