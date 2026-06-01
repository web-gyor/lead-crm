import React from 'react';
import { BarChart2, AlertCircle } from 'lucide-react';

interface SourcePerformanceProps {
  sources: any[];
  sourceStats: any[];
  totalLeads: number;
  loading: boolean;
  newToday: number;
  navigate: (path: string) => void;
}

export const SourcePerformance = React.memo(({
  sources,
  sourceStats,
  totalLeads,
  loading,
  newToday,
  navigate
}: SourcePerformanceProps) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-3xs overflow-hidden h-full flex flex-col justify-between select-none">
      <div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <BarChart2 size={14} className="text-blue-600" />
          <h2 className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Channel Attribution Matrix</h2>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-12 text-[8px] font-black uppercase tracking-widest text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800 mb-2">
            <div className="col-span-4">Attribution Node</div>
            <div className="col-span-2 text-right">Enquiries</div>
            <div className="col-span-2 text-right">Admitted</div>
            <div className="col-span-2 text-right">Yield %</div>
            <div className="col-span-2 text-right">Volume Share</div>
          </div>

          <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
            {sources.map((src) => {
              const matchedNode = (sourceStats || []).find((s: any) =>
                Number(s.id) === src.id || s.name?.toLowerCase().includes(src.name.toLowerCase().split(" ")[0])
              ) || { value: 0, converted: 0, percentage: 0 };

              const grossCount = Number(matchedNode.value) || 0;
              const convertCount = Number(matchedNode.converted) || 0;
              const rateRatio = grossCount > 0 ? Math.round((convertCount / grossCount) * 100) : 0;
              const volumeSharePct = Math.round(matchedNode.percentage || (totalLeads > 0 ? (grossCount / totalLeads) * 100 : 0));

              if (grossCount === 0 && !loading) return null;

              return (
                <div key={src.id} className="grid grid-cols-12 items-center py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors font-mono">
                  <div className="col-span-4 flex items-center gap-2">
                    <span style={{ color: src.color }} className="shrink-0">{src.icon}</span>
                    <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 truncate font-sans">{src.name}</span>
                  </div>
                  <div className="col-span-2 text-right text-[11px] font-black text-gray-900 dark:text-white">{grossCount.toLocaleString()}</div>
                  <div className="col-span-2 text-right text-[11px] font-black text-emerald-600 dark:text-emerald-400">{convertCount.toLocaleString()}</div>
                  <div className="col-span-2 text-right text-[10px] font-black">
                    <span className={rateRatio >= 20 ? "text-emerald-600" : rateRatio >= 10 ? "text-amber-600" : "text-gray-400"}>
                      {rateRatio}%
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 justify-end">
                    <div className="w-10 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full" style={{ width: `${volumeSharePct}%`, backgroundColor: src.color }} />
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 w-5 text-right">{volumeSharePct}%</span>
                  </div>
                </div>
              );
            })}
            
            {loading && [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {!loading && newToday > 0 && (
        <div className="mx-4 mb-4 flex items-center gap-2.5 px-3 py-2 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
          <AlertCircle size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider flex-1">
            {newToday} unassigned incoming tracks registered today
          </p>
          <button 
            type="button"
            onClick={() => navigate("/leads/new")} 
            className="text-[10px] font-black text-blue-600 hover:underline shrink-0 uppercase tracking-tight cursor-pointer"
          >
            Dispatch →
          </button>
        </div>
      )}
    </div>
  );
});

SourcePerformance.displayName = 'SourcePerformance';