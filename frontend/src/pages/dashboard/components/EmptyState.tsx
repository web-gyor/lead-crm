import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onActionTrigger?: () => void;
}

export const EmptyState = React.memo(({ 
  title = "No Operational Data Mapped", 
  description = "The pipeline log system could not pinpoint matching records for the designated criteria filters.",
  onActionTrigger
}: EmptyStateProps) => {
  return (
    <div className="py-12 px-4 text-center border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl max-w-md mx-auto flex flex-col items-center justify-center select-none animate-fade-in">
      <div className="p-3 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-slate-500 rounded-full mb-3 shadow-3xs">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wide">{title}</h3>
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-1 leading-normal max-w-xs">{description}</p>
      
      {onActionTrigger && (
        <button
          type="button"
          onClick={onActionTrigger}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg border border-blue-100 dark:border-blue-900/40 transition-all cursor-pointer"
        >
          <RefreshCw size={11} />
          <span>Sync Pipeline</span>
        </button>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';