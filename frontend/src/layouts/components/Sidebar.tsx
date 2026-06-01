import React from 'react';
import { BrandHeader } from './BrandHeader';
import { SidebarSection } from './SidebarSection';
import { useAuth } from "../../context/AuthContext";
import { Globe } from "lucide-react";

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.ReactNode;
  slug: string;             
  isComingSoon?: boolean;   
  badge?: number;
  skeleton?: boolean;
  end?: boolean;
  children?: NavItemConfig[];
}

interface SectionConfig {
  title: string;
  items: NavItemConfig[];
}

interface SidebarProps {
  logo: string;
  companyName: string;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  sections: SectionConfig[];
  openGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  closeSidebar: () => void;
  sidebarWidth: string;
}

export const Sidebar = React.memo(({
  logo,
  companyName,
  collapsed,
  setCollapsed,
  sections,
  openGroups,
  onToggleGroup,
  closeSidebar,
  sidebarWidth
}: SidebarProps) => {
  
  const { user } = useAuth();

  return (
    <aside className={`
      fixed z-50 inset-y-0 left-0 ${sidebarWidth}
      -translate-x-full md:translate-x-0 md:static
      bg-white dark:bg-gray-900
      border-r border-gray-100 dark:border-gray-800/80
      flex flex-col transition-all duration-300 ease-in-out
      shadow-xl md:shadow-none h-full sticky top-0
    `}>
      <BrandHeader 
        logo={logo} 
        companyName={companyName} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />

      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-5 
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
        {sections.map(section => (
          <SidebarSection
            key={section.title}
            title={section.title}
            // 🚀 FIXED: Explicitly reconstructs the item mapping payload right here 
            // to force the 'isComingSoon' property down into SidebarSection components!
            items={section.items.map(item => ({
              ...item,
              isComingSoon: item.isComingSoon || item.slug === 'automation'
            }))}
            collapsed={collapsed}
            openGroups={openGroups}
            onToggleGroup={onToggleGroup}
            closeSidebar={closeSidebar}
          />
        ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/40 dark:bg-gray-900/20 flex-shrink-0 select-none animate-fade-in space-y-2">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              System Online
            </div>
          </div>

          {/* Global Enterprise Indicator */}
          <div className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm">
            <Globe size={10} className="text-blue-500 shrink-0" />
            <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">
              Global Enterprise
            </span>
          </div>

          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">© 2026 CRM Alpha</p>
        </div>
      )}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';