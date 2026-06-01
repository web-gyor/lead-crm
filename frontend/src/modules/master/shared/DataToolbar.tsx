import React, { useMemo } from 'react';
import { Search, X, SlidersHorizontal, Plus, UserPlus, GraduationCap, Globe } from 'lucide-react';

interface DataToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  filterComponent?: React.ReactNode;
  
  // Enterprise Action Link Context
  activeStatus: string; // "staff" | "courses" | "countries"
  onPrimaryAction: () => void;
}

export const DataToolbar: React.FC<DataToolbarProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  showAdvanced,
  onToggleAdvanced,
  filterComponent,
  activeStatus,
  onPrimaryAction
}) => {

  // Contextual configurations for the primary action button
  const actionConfig = useMemo(() => {
    switch (activeStatus) {
      case 'courses':
        return { label: 'Add Course', icon: GraduationCap, color: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' };
      case 'countries':
        return { label: 'Add Destination', icon: Globe, color: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600' };
      case 'staff':
    default:
        return { label: 'Add Member', icon: UserPlus, color: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600' };
    }
  }, [activeStatus]);

  const ActionIcon = actionConfig.icon;

  return (
    <div className="w-full space-y-4 select-none">
      
      {/* Primary Row Control Alignment Layer */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search Parameter Field */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 stroke-[2.5]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-400/5 transition-premium shadow-3xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={13} className="stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Action Panel Controllers Cluster */}
        <div className="flex items-center gap-2.5 self-end md:self-auto w-full md:w-auto">
          
          {/* Refine Filters Trigger Toggle */}
          <button
            type="button"
            onClick={onToggleAdvanced}
            className={`flex flex-1 md:flex-initial items-center justify-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-premium cursor-pointer shadow-3xs h-9 ${
              showAdvanced 
                ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-950 font-bold" 
                : "bg-white border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
            }`}
          >
            <SlidersHorizontal size={13} className="stroke-[2.5]" />
            <span>Filters</span>
          </button>

          {/* Unified Primary Context Action Button Anchor */}
          <button
            type="button"
            onClick={onPrimaryAction}
            className={`flex flex-1 md:flex-initial items-center justify-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-premium cursor-pointer shadow-xs active:scale-[0.98] h-9 shrink-0 ${actionConfig.color}`}
          >
            <ActionIcon size={14} className="stroke-[2.5]" />
            <span>{actionConfig.label}</span>
          </button>
          
        </div>
      </div>

      {/* Advanced Filter Criteria Ingestion Section */}
      {showAdvanced && filterComponent && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {filterComponent}
        </div>
      )}
      
    </div>
  );
};