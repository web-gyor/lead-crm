import React from 'react';
import { Settings as SettingsIcon, AlertCircle, ChevronRight } from 'lucide-react';

interface SettingsHeaderProps {
  breadcrumbs: string[];
  lastSaved: string;
  isDirty: boolean;
  onSave: () => void;
  onRevert: () => void;
  isSaving: boolean;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  breadcrumbs,
  lastSaved,
  isDirty,
  onSave,
  onRevert,
  isSaving
}) => {
  return (
    // ✅ Card-less flat strip layout wrapper context
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
      
      {/* Left Axis: Consistent Identity Branding Info Container */}
      <div className="flex items-center gap-3">
        {/* 🚀 FIXED BLUE DESIGN BRANDING ICON BOX */}
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
          <SettingsIcon size={14} className="text-white" />
        </div>
        <div>
          {/* Synchronized Micro Breadcrumbs */}
          <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc}>
                <span className={idx === breadcrumbs.length - 1 ? "text-slate-600 dark:text-slate-400 font-black" : ""}>
                  {bc}
                </span>
                {idx < breadcrumbs.length - 1 && (
                  <ChevronRight size={10} strokeWidth={3} className="text-slate-300 dark:text-slate-700" />
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Locked text-sm font scale heading definition */}
          <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
            Control Center Settings
          </h1>
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
            <span>Production Cluster</span>
            <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
            <span>Verified: {lastSaved || 'Synchronizing...'}</span>
          </p>
        </div>
      </div>

      {/* Right Axis: Contextual Floating Unsaved Changes Warning Banner */}
      {isDirty && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-right-2 duration-150 ease-out self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} strokeWidth={3} className="text-amber-500 animate-pulse" />
            <span>Unsaved Parameters</span>
          </div>
          <div className="flex items-center gap-2 border-l border-amber-500/20 dark:border-amber-500/30 pl-2.5">
            <button 
              type="button" 
              onClick={onRevert} 
              className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button 
              type="button" 
              onClick={onSave} 
              disabled={isSaving} 
              className="bg-slate-900 border border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 px-2.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-40"
            >
              {isSaving ? 'Saving...' : 'Commit Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};