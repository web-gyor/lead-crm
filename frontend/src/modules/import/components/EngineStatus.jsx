import React from 'react';
import { Shield, Zap, Activity, AlertTriangle } from 'lucide-react';

export function EngineStatus({ stats, pendingCount }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl shrink-0 animate-pulse">
          <Activity size={16} />
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Distribution Engine</span>
          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Engine Active</span>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl shrink-0">
          <Zap size={16} fill="currentColor" />
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Pending Queue</span>
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
            {pendingCount} Leads Waiting
          </span>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl shrink-0">
          <Shield size={16} />
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Security Layer</span>
          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Dedup Token Active</span>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl shrink-0">
          <AlertTriangle size={16} />
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Routing Health</span>
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
            {stats.invalid > 0 ? `${stats.invalid} Match Conflicts` : "100% Operational"}
          </span>
        </div>
      </div>
    </div>
  );
}