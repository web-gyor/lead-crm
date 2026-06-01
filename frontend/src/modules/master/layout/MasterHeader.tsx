import React from 'react';
import { LucideIcon, ChevronRight, RefreshCw, Download } from 'lucide-react';

interface Breadcrumb {
  label: string;
  active?: boolean;
}

interface MasterHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColorClass: string;
  breadcrumbs: Breadcrumb[];
  countText: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onRefresh: () => void;
  onExport?: () => void;
  loading?: boolean;
}

export const MasterHeader: React.FC<MasterHeaderProps> = ({
  title,
  description,
  icon: Icon,
  iconColorClass,
  breadcrumbs,
  countText,
  primaryActionLabel,
  onPrimaryAction,
  onRefresh,
  onExport,
  loading = false
}) => {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 select-none">
      <div className="space-y-1.5">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
          {breadcrumbs.map((bc, i) => (
            <React.Fragment key={bc.label}>
              <span className={`${bc.active ? 'text-slate-600 dark:text-slate-400 font-semibold' : 'hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer'}`}>
                {bc.label}
              </span>
              {i < breadcrumbs.length - 1 && <ChevronRight size={12} className="text-slate-300 dark:text-slate-700" />}
            </React.Fragment>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${iconColorClass} text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/10 shrink-0`}>
            <Icon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 flex items-center gap-2">
              <span>{description}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{countText}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-start md:self-auto">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all shadow-3xs cursor-pointer disabled:opacity-50"
          title="Refresh Data Matrix"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:text-slate-900 dark:hover:text-white transition-all shadow-3xs cursor-pointer"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export Ledger</span>
          </button>
        )}
        <button
          type="button"
          onClick={onPrimaryAction}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          {primaryActionLabel}
        </button>
      </div>
    </header>
  );
};