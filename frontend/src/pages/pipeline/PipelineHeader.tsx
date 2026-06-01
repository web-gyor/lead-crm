import React from "react";
import { Zap, RefreshCw, Filter, ChevronRight } from "lucide-react";


interface PipelineHeaderProps {
  totalFiltered: number;
  onRefreshClick: () => void;
  refreshing: boolean;
  onFilterToggle: () => void;
  showFilters: boolean;
  hasActiveFilters: boolean;
  timeRange: string;
  setTimeRange: (range: string) => void;
}

export const PipelineHeader = React.memo(({
  totalFiltered,
  onRefreshClick,
  refreshing,
  onFilterToggle,
  showFilters,
  hasActiveFilters,
  timeRange,
  setTimeRange,
}: PipelineHeaderProps) => {





  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
      {/* Left side brand layout alignment */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
          <Zap size={14} className="text-white" fill="currentColor" />
        </div>
        <div>
          {/* Synchronized Breadcrumb System Trail */}
          <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
            <span>CRM Hub</span>
            <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
            <span className="text-slate-600 dark:text-slate-400">Pipeline</span>
          </nav>
          
          {/* Aligned text-sm font scale signature */}
          <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
            Sales Pipeline Workspace
          </h1>
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex items-center gap-1.5">
            <span>Core Funnel Matrix</span>
            <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
            <span>{totalFiltered} Active Inquiries</span>
          </p>
        </div>
      </div>

      {/* Right side uniform action triggers block */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        {/* Sync trigger button */}
        <button
          type="button"
          onClick={onRefreshClick}
          disabled={refreshing}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
          title="Refresh Operational Funnels"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-500" : ""} />
        </button>

        {/* Integrated Segmented Time Range Picker */}
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200/20 rounded-xl select-none mr-1">
        {/* Update this array to include 'All' */}
{["Today", "Week", "Month", "Year", "All"].map((r) => (
  <button
    key={r}
    type="button"
    onClick={() => setTimeRange(r.toLowerCase())}
    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
      timeRange === r.toLowerCase()
        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-xs"
        : "text-slate-400 hover:text-slate-600"
    }`}
  >
    {r}
  </button>
))}
        </div>

        {/* Action Toggle Filter deck */}
        <button
          type="button"
          onClick={onFilterToggle}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
            showFilters || hasActiveFilters
              ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-xs"
              : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50"
          }`}
        >
          <Filter size={12} strokeWidth={3} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] font-black flex items-center justify-center ml-0.5">!</span>
          )}
        </button>
      </div>
    </div>
  );
});

PipelineHeader.displayName = "PipelineHeader";