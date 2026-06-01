import React from 'react';
import { SidebarLink } from './SidebarLink';
import { SidebarGroup } from './SidebarGroup';

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.ReactNode;
  slug?: string;          // ✅ Added slug signature parameter
  permission?: string;
  disabled?: boolean;
  isComingSoon?: boolean; // 🚀 FIXED: Added coming-soon tracking signature to prevent drop-off cuts
  badge?: number;
  children?: NavItemConfig[];
}

interface SidebarSectionProps {
  title: string;
  items: NavItemConfig[];
  collapsed: boolean;
  openGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  closeSidebar: () => void;
}

export const SidebarSection = React.memo(({ title, items, collapsed, openGroups, onToggleGroup, closeSidebar }: SidebarSectionProps) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {!collapsed ? (
        <p className="px-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.18em] mb-2 pt-2 select-none">
          {title}
        </p>
      ) : (
        <div className="h-px bg-gray-100 dark:bg-gray-800/80 mx-2 my-2 select-none" />
      )}

      {items.map(item => 
        item.children?.length ? (
          <SidebarGroup
            key={item.to}
            item={item}
            collapsed={collapsed}
            open={!!openGroups[item.to]}
            onToggle={() => onToggleGroup(item.to)}
            closeSidebar={closeSidebar}
          />
        ) : (
          <SidebarLink
            key={item.to}
            // 🚀 ABSOLUTE BACKUP CHECK: Hard enforce flag mapping inline right inside the loop pass
            item={{
              ...item,
              isComingSoon: item.isComingSoon || item.slug === 'automation' || item.to === '#'
            }}
            collapsed={collapsed}
            onClick={closeSidebar}
          />
        )
      )}
    </div>
  );
});

SidebarSection.displayName = 'SidebarSection';