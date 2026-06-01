import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  Search, X, SlidersHorizontal, ChevronDown, CheckCircle2, RotateCcw,
} from 'lucide-react';

// ─── CONTAINER-WIDTH HOOK ─────────────────────────────────────────────────────
//
// THE CORE PROBLEM WITH THE PREVIOUS VERSION:
//   Tailwind breakpoints (lg:hidden, lg:block, etc.) react to VIEWPORT width,
//   not the component's own rendered width. If this component lives inside a
//   320px-wide sidebar on a 1440px desktop, `lg:hidden` never fires — so the
//   mobile drawer button is invisible and the desktop grid never shows either.
//
// THE FIX:
//   Measure the component's own container width with ResizeObserver.
//   All layout switches are derived from that number, not the viewport.
//   Breakpoints become simple numeric comparisons: width < 520 → compact mode.

function useContainerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState<number>(9999);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    // Read initial width synchronously
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface FilterSchema {
  search:      string;
  sourceId:    string | number;
  counselorId: string | number;
  leadQuality: string;
  city:        string;
}

interface Option { id: string | number; name: string }

export interface FilterDashboardProps {
  filters:       FilterSchema;
  setFilters:    React.Dispatch<React.SetStateAction<FilterSchema>>;
  showAdvanced:  boolean;
  sourceOptions: Option[];
  counselors:    Option[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EMPTY: FilterSchema = {
  search: '', sourceId: '', counselorId: '', leadQuality: '', city: '',
};

// Compact-mode threshold in px — switches to drawer + pill layout below this
const COMPACT_THRESHOLD = 520;

const QUALITY_LABELS: Record<string, string> = {
  hot:  '🔥 Hot',
  warm: '⚡ Warm',
  cold: '❄️ Cold',
};

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────

const INPUT_BASE = [
  'w-full h-9 bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700/80 rounded-xl',
  'text-xs font-medium text-slate-800 dark:text-slate-200',
  'outline-none transition-colors duration-150',
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10',
  'placeholder:text-slate-400 dark:placeholder:text-slate-600',
  'min-w-0',
].join(' ');

const SELECT_CLS = `${INPUT_BASE} appearance-none cursor-pointer pl-3 pr-8 truncate`;
const TEXT_CLS   = `${INPUT_BASE} px-3`;
const LABEL_CLS  = 'block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 select-none';

// ─── ATOMS ────────────────────────────────────────────────────────────────────

const FieldWrap: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col w-full min-w-0">
    <label className={LABEL_CLS}>{label}</label>
    <div className="relative w-full min-w-0">{children}</div>
  </div>
);

const Arrow = () => (
  <ChevronDown
    size={12}
    strokeWidth={2.5}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
  />
);

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 text-[10px] font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap select-none">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="p-0.5 rounded text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 cursor-pointer focus:outline-none"
      aria-label={`Remove ${label} filter`}
    >
      <X size={10} strokeWidth={2.5} />
    </button>
  </span>
);

// ─── FILTER FIELDS (shared by inline grid + drawer) ───────────────────────────

interface AdvancedFieldsProps {
  filters:       FilterSchema;
  update:        (p: Partial<FilterSchema>) => void;
  sourceOptions: Option[];
  counselors:    Option[];
  cols:          number; // 1 = stacked, 2 = 2-col, 4 = 4-col
}

const AdvancedFields = React.memo(function AdvancedFields({
  filters, update, sourceOptions, counselors, cols,
}: AdvancedFieldsProps) {
  const gridCls =
    cols === 1 ? 'flex flex-col gap-4 w-full'
    : cols === 2 ? 'grid grid-cols-2 gap-3 w-full'
    : 'grid grid-cols-4 gap-3 w-full';

  return (
    <div className={gridCls}>
      <FieldWrap label="Channel source">
        <select
          value={filters.sourceId || ''}
          onChange={(e) => update({ sourceId: e.target.value })}
          className={SELECT_CLS}
          aria-label="Filter by channel source"
        >
          <option value="">All channels</option>
          {sourceOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Arrow />
      </FieldWrap>

      <FieldWrap label="Lead quality">
        <select
          value={filters.leadQuality || ''}
          onChange={(e) => update({ leadQuality: e.target.value })}
          className={SELECT_CLS}
          aria-label="Filter by lead quality"
        >
          <option value="">All quality levels</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">⚡ Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
        <Arrow />
      </FieldWrap>

      <FieldWrap label="Counselor">
        <select
          value={filters.counselorId || ''}
          onChange={(e) => update({ counselorId: e.target.value })}
          className={SELECT_CLS}
          aria-label="Filter by counselor"
        >
          <option value="">All counselors</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Arrow />
      </FieldWrap>

      <FieldWrap label="City / region">
        <input
          type="text"
          placeholder="e.g. Calicut, Dubai"
          value={filters.city || ''}
          onChange={(e) => update({ city: e.target.value })}
          className={TEXT_CLS}
          aria-label="Filter by city or region"
        />
      </FieldWrap>
    </div>
  );
});

// ─── BOTTOM-SHEET DRAWER (compact mode) ───────────────────────────────────────

interface DrawerProps {
  open:          boolean;
  onClose:       () => void;
  filters:       FilterSchema;
  update:        (p: Partial<FilterSchema>) => void;
  onClear:       () => void;
  activeCount:   number;
  sourceOptions: Option[];
  counselors:    Option[];
}

const MobileDrawer = React.memo(function MobileDrawer({
  open, onClose, filters, update, onClear, activeCount, sourceOptions, counselors,
}: DrawerProps) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Filter options"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85dvh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-blue-600" strokeWidth={2} />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Filters</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold leading-none">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
            aria-label="Close filters"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
          style={{ scrollbarWidth: 'none' }}
        >
          <AdvancedFields
            filters={filters}
            update={update}
            sourceOptions={sourceOptions}
            counselors={counselors}
            cols={1}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pt-3 pb-7 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => { onClear(); onClose(); }}
            disabled={activeCount === 0}
            className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <CheckCircle2 size={13} strokeWidth={2.5} />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── ACTIVE CHIPS STRIP ───────────────────────────────────────────────────────

const ActiveChips = React.memo(function ActiveChips({
  filters, update, onClear, sourceOptions, counselors,
}: {
  filters: FilterSchema;
  update: (p: Partial<FilterSchema>) => void;
  onClear: () => void;
  sourceOptions: Option[];
  counselors: Option[];
}) {
  const chips = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.sourceId) {
      const src = sourceOptions.find((s) => String(s.id) === String(filters.sourceId));
      list.push({ key: 'src',  label: src?.name || 'Source',   onRemove: () => update({ sourceId: '' }) });
    }
    if (filters.leadQuality) {
      list.push({ key: 'q',    label: QUALITY_LABELS[filters.leadQuality] || filters.leadQuality, onRemove: () => update({ leadQuality: '' }) });
    }
    if (filters.counselorId) {
      const c = counselors.find((x) => String(x.id) === String(filters.counselorId));
      list.push({ key: 'c',    label: c?.name || 'Counselor',  onRemove: () => update({ counselorId: '' }) });
    }
    if (filters.city) {
      list.push({ key: 'city', label: filters.city,             onRemove: () => update({ city: '' }) });
    }
    return list;
  }, [filters, sourceOptions, counselors, update]);

  if (!chips.length) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0 pt-0.5">
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer select-none"
        aria-label="Clear all filters"
      >
        <RotateCcw size={10} strokeWidth={2.5} /> Clear all
      </button>
    </div>
  );
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const LeadFilterDashboard = React.memo(function LeadFilterDashboard({
  filters,
  setFilters,
  showAdvanced,
  sourceOptions,
  counselors,
}: FilterDashboardProps) {
  const rootRef      = useRef<HTMLDivElement>(null);
  const containerW   = useContainerWidth(rootRef as React.RefObject<HTMLElement | null>);

  // Layout mode derived purely from the component's own width — not viewport
  const isCompact    = containerW < COMPACT_THRESHOLD;          // < 520px → drawer
  const isMedium     = !isCompact && containerW < 780;          // 520–780px → 2-col grid
  const gridCols     = isCompact ? 1 : isMedium ? 2 : 4;

  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent resets filters externally
  useEffect(() => { setLocalSearch(filters.search || ''); }, [filters.search]);

  // Debounce search → filter state
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((p) => p.search === localSearch ? p : { ...p, search: localSearch });
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch, setFilters]);

  const update = useCallback((patch: Partial<FilterSchema>) => {
    setFilters((p) => ({ ...p, ...patch }));
  }, [setFilters]);

  const handleClearAll = useCallback(() => {
    setFilters(EMPTY);
    setLocalSearch('');
  }, [setFilters]);

  const activeCount = useMemo(
    () => [filters.sourceId, filters.counselorId, filters.leadQuality, filters.city].filter(Boolean).length,
    [filters],
  );

  return (
    <div ref={rootRef} className="w-full min-w-0 space-y-2.5">

      {/* ── Row 1: search + filter trigger ───────────────────────────────── */}
      <div className="flex items-center gap-2 w-full min-w-0">

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={13}
          />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name or phone…"
            className={`${INPUT_BASE} pl-9 ${localSearch ? 'pr-8' : 'pr-3'}`}
            aria-label="Search leads"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer focus:outline-none"
              aria-label="Clear search"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/*
         * Filter icon button:
         * - COMPACT mode → always visible, opens the drawer
         * - WIDE mode    → shown only when showAdvanced is false (acts as a
         *                  secondary toggle the parent can wire up if needed)
         *
         * Visibility is controlled by the JS `isCompact` flag, NOT Tailwind
         * viewport classes, so it works correctly inside any container width.
         */}
        {(isCompact || !showAdvanced) && (
          <button
            type="button"
            onClick={() => isCompact ? setDrawerOpen(true) : undefined}
            className={[
              'flex items-center justify-center h-9 px-3 gap-1.5 shrink-0',
              'rounded-xl border text-xs font-semibold transition-colors cursor-pointer focus:outline-none select-none',
              activeCount > 0
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600',
            ].join(' ')}
            aria-label="Open filter options"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={14} strokeWidth={2} />
            {activeCount > 0 && (
              <span className="text-[10px] font-bold leading-none">{activeCount}</span>
            )}
          </button>
        )}
      </div>

      {/* ── Row 2: inline filter grid — only when wide + showAdvanced ─────── */}
      {showAdvanced && !isCompact && (
        <div className="w-full min-w-0 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <AdvancedFields
            filters={filters}
            update={update}
            sourceOptions={sourceOptions}
            counselors={counselors}
            cols={gridCols}
          />
        </div>
      )}

      {/* ── Row 3: active filter chips ─────────────────────────────────────── */}
      <ActiveChips
        filters={filters}
        update={update}
        onClear={handleClearAll}
        sourceOptions={sourceOptions}
        counselors={counselors}
      />

      {/* ── Bottom-sheet drawer — compact mode only ───────────────────────── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        update={update}
        onClear={handleClearAll}
        activeCount={activeCount}
        sourceOptions={sourceOptions}
        counselors={counselors}
      />
    </div>
  );
});

LeadFilterDashboard.displayName = 'LeadFilterDashboard';