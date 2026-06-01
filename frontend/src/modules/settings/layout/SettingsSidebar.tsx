import React from 'react';
import { 
  Building2, Link2, Zap, LayoutList, Phone, Database, LayoutGrid, LucideIcon
} from 'lucide-react';

export type SettingsGroup = 'overview' | 'company' | 'lead-capture' | 'lead-automation' | 'templates' | 'call-recording' | 'backup';

interface SidebarItem {
  id: SettingsGroup;
  label: string;
  icon: LucideIcon;
  activeColor: string;
  isComingSoon?: boolean; // 🚀 ADDED: Matches your main navigation strategy flags
}

interface SettingsSidebarProps {
  activeGroup: SettingsGroup;
  onGroupChange: (group: SettingsGroup) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeGroup, onGroupChange }) => {
  
  const SECTIONS: { groupTitle: string; items: SidebarItem[] }[] = [
    {
      groupTitle: "Operational Core",
      items: [
        { id: 'overview', label: "Control Dashboard", icon: LayoutGrid, activeColor: "bg-slate-900/5 dark:bg-white/10 text-slate-900 dark:text-white border-slate-200/40 dark:border-slate-800/40 shadow-3xs" },
        { id: 'company', label: "Company Settings", icon: Building2, activeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10" },
      ]
    },
    {
      groupTitle: "Lead Optimization",
      items: [
        { id: 'lead-capture', label: "Lead Capture", icon: Link2, activeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10" },
        // 🚀 UPDATED: Flagged as true to visually freeze customization changes
        { id: 'lead-automation', label: "Lead Automation", icon: Zap, activeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10", isComingSoon: true },
        { id: 'templates', label: "Template Library", icon: LayoutList, activeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10" },
        { id: 'call-recording', label: "Call Recording", icon: Phone, activeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10" },
      ]
    },
    {
      groupTitle: "Infrastructure",
      items: [
        { id: 'backup', label: "Backup", icon: Database, activeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10" },
      ]
    }
  ];

  return (
    <aside className="w-full md:w-60 shrink-0 space-y-5 select-none md:sticky md:top-24 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/60 pb-4 md:pb-0 md:pr-5">
      {SECTIONS.map((section) => (
        <div key={section.groupTitle} className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2.5">
            {section.groupTitle}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = activeGroup === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.isComingSoon}
                  onClick={() => !item.isComingSoon && onGroupChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left border border-transparent group ${
                    item.isComingSoon
                      ? "text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed"
                      : isActive 
                        ? `${item.activeColor} font-bold` 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-950/30 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon 
                      size={14} 
                      className={`stroke-[2.2] transition-colors duration-200 ${
                        item.isComingSoon
                          ? 'text-slate-300 dark:text-slate-700'
                          : isActive ? '' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`} 
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* 🚀 FLAT TEXT BADGE MATCH: Seamlessly mirrors your main sidebar style tokens */}
                  {item.isComingSoon && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[7.5px] font-black tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 rounded-md uppercase select-none">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
};