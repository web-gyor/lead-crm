import React from 'react';
import { Users, FileDown, CheckCircle, Percent } from 'lucide-react';

export function AnalyticsHub({ stats, rules }) {
  const totalAssignedToday = React.useMemo(() => 
    rules.reduce((acc, curr) => acc + (curr.assigned_today || 0), 0), [rules]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs">
          <Users size={16} className="text-blue-600 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total Loaded Batch</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs">
          <CheckCircle size={16} className="text-emerald-600 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Today</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{totalAssignedToday}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs">
          <FileDown size={16} className="text-amber-600 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Valid Core Leads</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{stats.valid}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs">
          <Percent size={16} className="text-indigo-600 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Distribution Yield</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            {stats.total > 0 ? `${Math.round((stats.valid / stats.total) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Counselor Operational Burden Mapping</h3>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Live index comparison of assigned load distributions against limits</p>
        </div>
        <div className="space-y-3.5">
          {rules.map((counselor) => {
            const limit = counselor.daily_limit || 50;
            const filled = counselor.assigned_today || 0;
            const percent = Math.min(Math.round((filled / limit) * 100), 100);

            return (
              <div key={counselor.user_id} className="space-y-1 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300">
                  <span>{counselor.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {filled} / {limit} Assigned
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      percent >= 90 ? 'bg-rose-500' : percent >= 60 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}