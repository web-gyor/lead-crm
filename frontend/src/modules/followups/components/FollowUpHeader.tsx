import React from "react";
import { CalendarCheck, RefreshCw, Filter, CheckCircle2, ChevronRight } from "lucide-react";
import { SECTIONS, SectionId } from "../../../constants/leadStatus";
import { FollowUpLead } from "../../../types/followup";

interface FollowUpHeaderProps {
  filteredLeads: FollowUpLead[];
  getBucketLeads: (sid: SectionId) => FollowUpLead[];
  refreshing: boolean;
  onRefresh: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasFilters: boolean;
  onOpenConfirm: () => void;
}

export const FollowUpHeader = React.memo(function FollowUpHeader({
  filteredLeads,
  getBucketLeads,
  refreshing,
  onRefresh,
  showFilters,
  onToggleFilters,
  hasFilters,
  onOpenConfirm,
}: FollowUpHeaderProps) {
  return (
    // ✅ Card-less flat strip wrapper context
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none w-full shrink-0">
      
   {/* Left side brand layout alignment */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
          <CalendarCheck size={14} className="text-white" />
        </div>
        <div>
          {/* Synchronized Breadcrumb System Trail */}
          <nav className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">
            <span>CRM Hub</span>
            <ChevronRight size={10} strokeWidth={3} className="text-slate-300" />
            <span className="text-slate-600 dark:text-slate-400">Follow-ups</span>
          </nav>
          
          {/* Aligned text-sm font scale heading signature */}
          <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide leading-none">
            Follow-up Manager
          </h1>
          
          <div className="flex items-center gap-2.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1.5 leading-none flex-wrap">
            <span>Daily Engagement Schedule</span>
            
            {/* Inline dynamic bucket badge arrays */}
            {SECTIONS.map((s) => {
              const count = getBucketLeads(s.id).length;
              return count > 0 ? (
                <span key={s.id} className={`inline-flex items-center gap-1 opacity-90 border-l border-slate-200 dark:border-slate-700/60 pl-2 ml-0.5 ${s.color}`}>
                  <span className={`w-1 h-1 rounded-full ${s.dot}`} /> 
                  <span>{count} {s.label.replace("Follow Up", "Up")}</span>
                </span>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Right side uniform design actions deck */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        
        {/* Synchronized Operations Sync Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
          title="Sync Engagement Array"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-500" : ""} />
        </button>

        {/* Filters Toggle matching Pipeline Header state triggers */}
        <button
          type="button"
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
            showFilters || hasFilters
              ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-xs"
              : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50"
          }`}
        >
          <Filter size={12} strokeWidth={3} />
          <span>Filters</span>
          {hasFilters && (
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] font-black flex items-center justify-center ml-0.5">!</span>
          )}
        </button>

        {/* Primary Action Button tailored to match layout geometry */}
        <button
          type="button"
          onClick={onOpenConfirm}
          disabled={filteredLeads.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm shadow-emerald-600/10 active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
        >
          <CheckCircle2 size={12} strokeWidth={3} />
          <span>Mark All</span>
          <span className="bg-emerald-500 dark:bg-emerald-500/30 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold ml-0.5">
            {filteredLeads.length}
          </span>
        </button>
      </div>
    </div>
  );
});

FollowUpHeader.displayName = "FollowUpHeader";