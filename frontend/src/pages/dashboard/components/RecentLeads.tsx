import React from 'react';
import { Activity } from 'lucide-react';

interface RecentLeadsProps {
  loading: boolean;
  recentLeads: any[];
  navigate: (path: string) => void;
}

export const RecentLeads = React.memo(({ loading, recentLeads, navigate }: RecentLeadsProps) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-3xs overflow-hidden h-full flex flex-col justify-between select-none">
      <div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-blue-600" />
            <h2 className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Live Enquiry Streams</h2>
          </div>
          <button 
            type="button"
            onClick={() => navigate("/leads")} 
            className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-wider cursor-pointer"
          >
            All Matrix →
          </button>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800/60 max-h-[310px] overflow-y-auto">
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-50 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                  <div className="h-2 bg-gray-50 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))
          ) : (recentLeads && recentLeads.length > 0) ? (
            recentLeads.slice(0, 10).map((lead: any, i: number) => {
              const statusStr = (lead.lead_status || "").toLowerCase().trim();
              const statusStyle =
                statusStr === "converted" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                : statusStr === "interested" ? "bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400"
                : statusStr === "follow-up" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                : statusStr === "lost" ? "bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400"
                : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400";

              return (
                <div 
                  key={i} 
                  onClick={() => navigate("/leads")}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-[11px] shrink-0 border border-gray-200/40 dark:border-gray-700">
                      {lead.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">{lead.full_name}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold truncate mt-0.5">{lead.interested_course || "Unspecified Field Track"}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 font-mono ${statusStyle}`}>
                    {lead.lead_status || "New"}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">No activity matrices logged</div>
          )}
        </div>
      </div>
    </div>
  );
});

RecentLeads.displayName = 'RecentLeads';