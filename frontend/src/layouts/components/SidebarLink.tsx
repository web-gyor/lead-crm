import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.ReactNode;
  disabled?: boolean;
  isComingSoon?: boolean; // 🚀 Aligned configuration signature with MainLayout metadata schemas
  end?: boolean;
  badge?: number;
}

interface SidebarLinkProps {
  item: NavItemConfig;
  collapsed: boolean;
  onClick: () => void;
}

export const SidebarLink = React.memo(({ item, collapsed, onClick }: SidebarLinkProps) => {
  // Catch both standard disabled attributes and explicit coming-soon mapping markers
  const isDisabled = item.disabled || item.isComingSoon || item.to === '#';

if (isDisabled) {
    return (
      <div 
        title={collapsed ? item.label : undefined}
        className="flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed rounded-lg select-none relative group"
      >
        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center opacity-50">{item.icon}</span>
        
        {/* 🚀 FIXED: Set to flex with items-start so 'Soon' sits inline naturally without getting cut off! */}
        {!collapsed && (
          <span className="flex items-start gap-1 text-xs min-w-0 flex-1">
            <span className="truncate">{item.label}</span>
            <sup className="text-[6.5px] font-black tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 px-1 py-0.5 rounded-sm uppercase select-none transform scale-90 mt-0.5 shrink-0">
              Soon
            </sup>
          </span>
        )}

        {/* Desktop Collapsed Sidebar Hover Tooltip fallback */}
        {collapsed && (
          <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[9px] font-black rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            {item.label} (Soon)
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end !== undefined ? item.end : item.to === "/dashboard"}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `
        flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-all group relative select-none text-xs
        ${isActive
          ? "bg-blue-50/80 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white"
        }
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-600 dark:bg-blue-500 rounded-r-md" />
          )}

          <span className={`w-4 h-4 flex-shrink-0 flex items-center justify-center transition-colors
            ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200"}`}
          >
            {item.icon}
          </span>
          
          {/* STANDARD SENTENCE CASING LABELS */}
          {!collapsed && (
            <span className="truncate flex-1 leading-none pt-0.5">{item.label}</span>
          )}

          {item.badge !== undefined && item.badge > 0 && !collapsed && (
            <span className="ml-auto bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-md text-[8px] tabular-nums min-w-[14px] text-center border-none">
              {item.badge}
            </span>
          )}

          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[9px] font-black rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
});

SidebarLink.displayName = 'SidebarLink';