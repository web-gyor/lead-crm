import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Zap, Clock, Calendar, Globe, ChevronDown } from 'lucide-react';

interface Filters {
  search: string;
  sourceId: string;
  counselorId: string;
  quality: string;
  range: string;
  startDate: string;
  endDate: string;
}

interface LeadFiltersProps {
  filters: Filters;
  updateFilters: (patch: Partial<Filters>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  readonly statusOptions?: readonly any[]; 
  sourceOptions: { id: number | string; name: string }[];
  counselors: { id: number | string; name: string }[];
}

const RANGE_BUTTONS = [
  { id: 'today',      label: 'Today',      icon: <Zap      size={11} /> },
  { id: 'this_week',  label: 'This week',  icon: <Clock    size={11} /> },
  { id: 'this_month', label: 'This month', icon: <Calendar size={11} /> },
  { id: 'all',        label: 'All time',   icon: <Globe    size={11} /> },
] as const;

const QUALITY_OPTIONS = [
  { value: 'hot',  label: '🔥 Hot'  },
  { value: 'warm', label: '🌤 Warm' },
  { value: 'cold', label: '❄️ Cold' },
] as const;

// Helper to calculate raw YYYY-MM-DD streams instantly on user click
function calculateDateRange(rangeId: string): { startDate: string; endDate: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (rangeId === 'today') {
    const s = ymd(today);
    return { startDate: s, endDate: s };
  }
  if (rangeId === 'this_week') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Sets to Sunday of current week
    return { startDate: ymd(start), endDate: ymd(today) };
  }
  if (rangeId === 'this_month') {
    return {
      startDate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`,
      endDate: ymd(today),
    };
  }
  return { startDate: '', endDate: '' };
}

const SELECT_BASE =
  'w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ' +
  'rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none appearance-none ' +
  'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer ' +
  'transition-colors hover:border-slate-300 dark:hover:border-slate-600';

export const LeadFilters = React.memo(({
  filters,
  updateFilters,
  clearAllFilters,
  hasActiveFilters,
  sourceOptions = [], 
  counselors = [],    
}: LeadFiltersProps) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef   = useRef<HTMLDivElement>(null);
  const buttonRef  = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const activeRangeId = filters.range || 'all';

  const activeParamCount = [
    filters.sourceId,
    filters.counselorId,
    filters.quality,
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  // 🎯 FIXED QUICK SELECT DATE RANGES: Resolves names to raw database string parameters on the fly
  const handleRangeClick = useCallback((id: string) => {
    if (id === 'all') {
      updateFilters({ range: 'all', startDate: '', endDate: '' });
    } else {
      const resolved = calculateDateRange(id);
      updateFilters({ range: id, startDate: resolved.startDate, endDate: resolved.endDate });
    }
  }, [updateFilters]);

  const safeSourceOptions = useMemo(() => {
    return Array.isArray(sourceOptions) ? sourceOptions : [];
  }, [sourceOptions]);
  const safeCounselors = useMemo(() => {
  return Array.isArray(counselors) ? counselors : [];
}, [counselors]);

  return (
    <div className="flex items-center gap-2 w-full relative">
      {/* ── Search Bar ── */}
      <div className="relative w-1/4 min-w-[220px] shrink-0">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          size={13}
        />
        <input
          type="text"
          placeholder="Search name, ID, phone…"
          value={filters.search || ''}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
        />
        
        {filters.search && (
          <button
            type="button"
            onClick={() => updateFilters({ search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer focus:outline-none"
            title="Clear search"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Filter Icon Button ── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setPanelOpen(prev => !prev)}
        title="Toggle filters"
        className={[
          'relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all cursor-pointer shrink-0 focus:outline-none',
          panelOpen || activeParamCount > 0
            ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm font-bold'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700',
        ].join(' ')}
      >
        <SlidersHorizontal size={14} />
        {activeParamCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border border-white shadow-sm">
            {activeParamCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Filter Panel ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-2 z-50 w-[440px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xl shadow-slate-900/8 dark:shadow-slate-900/30 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Advanced Filters</span>
              {activeParamCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                  {activeParamCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer focus:outline-none"
                >
                  <X size={11} /> Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 text-slate-700 dark:text-slate-200">
            {/* Row 1: Source Channel + Lead Quality */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                  Channel source
                </label>
                <div className="relative w-full">
                  <select
                    value={filters.sourceId || ''}
                    onChange={(e) => updateFilters({ sourceId: e.target.value })}
                    className={SELECT_BASE}
                  >
                    <option value="">All channels</option>
                    {safeSourceOptions.map(s => (
                      <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                  Lead quality
                </label>
                <div className="relative w-full">
                  <select
                    value={filters.quality || ''}
                    onChange={(e) => updateFilters({ quality: e.target.value })}
                    className={SELECT_BASE}
                  >
                    <option value="">All quality levels</option>
                    {QUALITY_OPTIONS.map(q => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Personnel */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                Assigned personnel
              </label>
              <div className="relative w-full">
             <select
  value={filters.counselorId || ''}
  onChange={(e) => updateFilters({ counselorId: e.target.value })}
  className={SELECT_BASE}
>
  <option value="">All counselors & telecallers</option>
  <option value="unassigned">Unassigned</option>
  {safeCounselors.map(c => (
    <option key={String(c.id)} value={String(c.id)}>
      {c.name}
    </option>
  ))}
</select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Row 3: Date Range Quick-Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                Date range
              </label>
              <div className="grid grid-cols-4 gap-1.5 w-full">
                {RANGE_BUTTONS.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRangeClick(r.id)}
                    className={[
                      'flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer focus:outline-none w-full',
                      activeRangeId === r.id
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300',
                    ].join(' ')}
                  >
                    <span className="opacity-70">{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Custom Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                  From date
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => updateFilters({ startDate: e.target.value, range: 'custom' })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                  To date
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => updateFilters({ endDate: e.target.value, range: 'custom' })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 select-none">
              {activeParamCount === 0
                ? 'No filters active'
                : `${activeParamCount} filter${activeParamCount > 1 ? 's' : ''} active`}
            </p>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

LeadFilters.displayName = 'LeadFilters';