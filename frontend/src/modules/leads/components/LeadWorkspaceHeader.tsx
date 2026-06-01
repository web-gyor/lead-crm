import React, { useMemo } from 'react';
import { Layers, Download, Plus, RefreshCw, ChevronRight } from 'lucide-react';

interface LeadWorkspaceHeaderProps {
  onAddLeadClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
  syncTimestamp: string;
}

export const LeadWorkspaceHeader = React.memo(({ 
  onAddLeadClick, 
  onRefreshClick, 
  loading,
  syncTimestamp 
}: LeadWorkspaceHeaderProps) => {

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full">
      {/* Left branding anchor */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
          <Layers size={14} className="text-white" fill="currentColor" />
        </div>
        <div>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
            <span>CRM Hub</span>
            <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
            <span className="text-slate-600 dark:text-slate-400">Workspace</span>
          </nav>
          <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
            Lead Operations Workspace
          </h1>
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
            <span>Admissions Pipeline</span>
            <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
            <span>Last synced · {syncTimestamp || "Syncing…"}</span>
          </p>
        </div>
      </div>

      {/* Right side standardized action triggers */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
      <button 
          type="button"
          onClick={() => {
            // 1. Run your standard local data page fetch routines
            onRefreshClick();
            
            // 2. 🚀 THE REAL-TIME SYNC ENGINE: 
            // Dispatches a global signal telling the notification panels 
            // to break their background cache and instantly reload their totals
            window.dispatchEvent(new CustomEvent('refreshDashboardStats'));
            window.dispatchEvent(new CustomEvent('crm:stats-update'));
          }}
          disabled={loading}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
          title="Refresh Ingestion Feeds"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>

        <button 
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <Download size={12} strokeWidth={3} />
          <span>Export</span>
        </button>

        <button 
          type="button"
          onClick={onAddLeadClick}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm shadow-blue-600/10 active:scale-98 transition-all cursor-pointer"
        >
          <Plus size={12} strokeWidth={3} />
          <span>Add Lead</span>
        </button>
      </div>
    </div>
  );
});

LeadWorkspaceHeader.displayName = 'LeadWorkspaceHeader';