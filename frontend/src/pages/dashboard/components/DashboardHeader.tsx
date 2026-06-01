import React, { useMemo } from 'react';
import { Activity, Clock, Zap, RefreshCw, ChevronRight } from 'lucide-react';

interface DashboardHeaderProps {
  onFollowupsClick: () => void;
  onNewLeadsClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const DashboardHeader = React.memo(({ onFollowupsClick, onNewLeadsClick, onRefreshClick, loading }: DashboardHeaderProps) => {
  const currentSyncTime = useMemo(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }, [loading]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full">
      {/* Left side brand alignment section */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
          <Activity size={14} className="text-white" />
        </div>
        <div>
          {/* ✅ FIXED: Synchronized breadcrumb layout trail added to match LeadWorkspaceHeader */}
          <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
            <span>CRM Hub</span>
            <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
            <span className="text-slate-600 dark:text-slate-400">Intelligence</span>
          </nav>
          
         <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
  Admissions Intelligence
</h1>
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
            <span>Real-time Pipeline Telemetry</span>
            <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
            <span>Last synced · {currentSyncTime}</span>
          </p>
        </div>
      </div>

      {/* Right side uniform action buttons block */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        <button type="button" onClick={onRefreshClick} disabled={loading} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
        <button type="button" onClick={onFollowupsClick} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-100 transition-all cursor-pointer"><Clock size={12} strokeWidth={3} /><span>Follow-ups</span></button>
        <button type="button" onClick={onNewLeadsClick} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm shadow-blue-600/10 transition-all cursor-pointer"><Zap size={12} strokeWidth={3} /><span>New Leads</span></button>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';