// 🎯 TARGET FILE: src/layouts/components/MobileSidebar.tsx

import React, { useMemo } from 'react';
import { X, Zap } from 'lucide-react';
import { SidebarSection } from './SidebarSection';

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.ReactNode;
  slug: string;             
  isComingSoon?: boolean;   
  badge?: number;
  skeleton?: boolean;
  end?: boolean;
}

interface SectionConfig {
  title: string;
  items: NavItemConfig[];
}

interface MobileSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  logo: string;
  companyName: string;
  sections: SectionConfig[];
  openGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
}

export const MobileSidebar = React.memo(({
  sidebarOpen,
  setSidebarOpen,
  logo,
  companyName,
  sections,
  openGroups,
  onToggleGroup
}: MobileSidebarProps) => {

  // 🚀 FIXED: Integrated our standard API URL formatting strategy for extensionless mobile image streams
  const resolvedLogoSrc = useMemo(() => {
    if (!logo || typeof logo !== 'string' || logo.trim() === '') return null;
    
    const trimmedLogo = logo.trim();
    
    // If it's already an absolute external path or data payload base64 string, bypass formatting
    if (trimmedLogo.startsWith('http://') || trimmedLogo.startsWith('https://') || trimmedLogo.startsWith('data:image/')) {
      return trimmedLogo;
    }
    
    // Dynamically query your environment variables to parse port definitions cleanly
    const BACKEND = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
    const cleanPath = trimmedLogo.startsWith('/') ? trimmedLogo : `/${trimmedLogo}`;
    
    return `${BACKEND}${cleanPath}`;
  }, [logo]);

  return (
    <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300
      ${sidebarOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}
    >
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
        onClick={() => setSidebarOpen(false)} 
      />

      <div className={`absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out transform
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            
            {/* Logo Container Box layout */}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-white flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-800">
              {resolvedLogoSrc ? (
                <img 
                  src={resolvedLogoSrc} 
                  alt="Company Mobile Logo" 
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain p-0.5" 
                  onError={(e) => {
                    // Fail-safe: Try the fallback string path natively before falling completely back to the fallback icon
                    if (logo && e.currentTarget.src !== logo) {
                      e.currentTarget.src = logo;
                      return;
                    }
                    
                    // Hide the image tag completely and reveal your standard fallback blue div icon structure
                    e.currentTarget.style.display = 'none';
                    const fallbackEl = e.currentTarget.parentElement?.querySelector('.mobile-logo-fallback');
                    if (fallbackEl) fallbackEl.classList.remove('hidden');
                  }}
                />
              ) : null}

              {/* Default dynamic branding placeholder box wrapper */}
              <div className={`mobile-logo-fallback w-full h-full bg-blue-600 flex items-center justify-center text-white ${resolvedLogoSrc ? 'hidden' : ''}`}>
                <Zap size={14} fill="currentColor" />
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white truncate max-w-[130px]">
                {companyName}
              </p>
              <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] leading-none mt-0.5">CRM Alpha</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
          {sections.map(section => (
            <SidebarSection
              key={section.title}
              title={section.title}
              items={section.items}
              collapsed={false}
              openGroups={openGroups}
              onToggleGroup={onToggleGroup}
              closeSidebar={() => setSidebarOpen(false)}
            />
          ))}
        </nav>
      </div>
    </div>
  );
});

MobileSidebar.displayName = 'MobileSidebar';