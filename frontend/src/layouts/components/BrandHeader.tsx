// 🎯 TARGET FILE: src/layouts/components/BrandHeader.tsx

import React, { useMemo } from 'react';
import { Zap, Menu } from 'lucide-react';

interface BrandHeaderProps {
  logo:         string;
  companyName:  string;
  collapsed:    boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BrandHeader = React.memo(({
  logo, companyName, collapsed, setCollapsed,
}: BrandHeaderProps) => {

  // 🚀 FIXED: Dynamic Absolute URL Resolver (Prevents memory thread lock leaks)
  const resolvedLogoSrc = useMemo(() => {
    if (!logo || typeof logo !== 'string' || logo.trim() === '') return null;
    
    const trimmedLogo = logo.trim();
    
    // If it's already an absolute external link, base64 data string, or a local object blob pointer, pass it directly
    if (trimmedLogo.startsWith('http://') || trimmedLogo.startsWith('https://') || trimmedLogo.startsWith('data:') || trimmedLogo.startsWith('blob:')) {
      return trimmedLogo;
    }
    
    // Clears out any trailing '/api' paths safely from your environment variable configurations
    const BACKEND = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
    const cleanPath = trimmedLogo.startsWith('/') ? trimmedLogo : `/${trimmedLogo}`;
    
    return `${BACKEND}${cleanPath}`;
  }, [logo]);

  return (
    <div className={`h-14 flex items-center border-b border-gray-100 dark:border-gray-800 flex-shrink-0 select-none
      ${collapsed ? "justify-center px-2" : "px-4 gap-3"}`}>

      {/* Logo Wrapper Box Container Layout */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-white flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-800">
        {resolvedLogoSrc ? (
          <img
            src={resolvedLogoSrc}
            alt={companyName}
            // Forces standard cross-origin verification parameters on extensionless uploads
            crossOrigin="anonymous"
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              // Bypasses the element securely by dropping back to the default blue Zap vector token icon
              e.currentTarget.style.display = 'none';
              const fallbackEl = e.currentTarget.parentElement?.querySelector('.brand-fallback-node');
              if (fallbackEl) fallbackEl.classList.remove('hidden');
            }}
          />
        ) : null}

        {/* Dynamic Fallback Vector Badge Icon Layout */}
        <div className={`brand-fallback-node w-full h-full bg-blue-600 flex items-center justify-center text-white ${resolvedLogoSrc ? 'hidden' : ''}`}>
          <Zap size={14} fill="currentColor" />
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 min-w-0 animate-fade-in">
          <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white truncate">
            {companyName}
          </p>
          <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] leading-none mt-0.5">
            CRM Alpha
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setCollapsed(p => !p)}
        className="hidden md:flex p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-lg transition-all flex-shrink-0 cursor-pointer"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Menu size={14} />
      </button>
    </div>
  );
});

BrandHeader.displayName = 'BrandHeader';