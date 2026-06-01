import React from 'react';
import {
  LayoutGrid, Layers, RefreshCw, Flame, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, Archive,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

// ✅ FIXED: Separated raw system value tokens from customer presentation text strings
export type TabValue = 'all' | 'New' | 'Contacted' | 'Interested' | 'Follow-up' | 'Converted' | 'Lost' | 'Not Interested' | 'Cold Storage';

interface TabConfig {
  name: string;      // What displays to the end user
  value: TabValue;    // Exact match sent to API filters
  icon: React.ReactNode;
  badgeColor: string;
}

interface LeadStatusTabsProps {
  activeStatus: TabValue;
  setActiveStatus: (status: TabValue) => void;
  counts: Partial<Record<TabValue, number>>; // Synced directly with value keys
}

// ─── TAB DEFINITIONS ──────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  {
    name: 'All',
    value: 'all', // ✅ FIXED: Keeps database pipeline values synchronized in lowercase
    icon: <LayoutGrid size={13} />,
    badgeColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  {
    name: 'New',
    value: 'New',
    icon: <Layers size={13} />,
    badgeColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  {
    name: 'Contacted',
    value: 'Contacted',
    icon: <RefreshCw size={13} />,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
  },
  {
    name: 'Interested',
    value: 'Interested',
    icon: <Flame size={13} />,
    badgeColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  {
    name: 'Follow-up',
    value: 'Follow-up',
    icon: <AlertTriangle size={13} />,
    badgeColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  },
  {
    name: 'Converted',
    value: 'Converted',
    icon: <CheckCircle2 size={13} />,
    badgeColor: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  },
  {
    name: 'Lost',
    value: 'Lost',
    icon: <XCircle size={13} />,
    badgeColor: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  },
  {
    name: 'Not Interested',
    value: 'Not Interested',
    icon: <HelpCircle size={13} />,
    badgeColor: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  },
  {
    name: 'Cold Storage',
    value: 'Cold Storage',
    icon: <Archive size={13} />,
    badgeColor: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const LeadStatusTabs = React.memo(({
  activeStatus,
  setActiveStatus,
  counts,
}: LeadStatusTabsProps) => {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto w-full select-none pb-0.5"
      style={{ scrollbarWidth: 'none' }}
    >
      {TABS.map((tab) => {
        // ✅ FIXED: Evaluates states against the exact system token key strings
        const isActive = activeStatus === tab.value;
        const count = counts[tab.value] ?? 0;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium',
              'transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap focus:outline-none',
              isActive
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-sm font-bold'
                : [
                    'bg-white dark:bg-slate-900',
                    'border-slate-100 dark:border-slate-800',
                    'text-slate-500 dark:text-slate-400',
                    'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    'hover:border-slate-200 dark:hover:border-slate-700',
                  ].join(' '),
            ].join(' ')}
          >
            {/* Icon */}
            <span className={isActive ? 'opacity-80' : 'opacity-60'}>
              {tab.icon}
            </span>

            {/* Label */}
            <span>{tab.name}</span>

            {/* Count badge */}
            <span
              className={[
                'px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums',
                isActive
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : tab.badgeColor,
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
});

LeadStatusTabs.displayName = 'LeadStatusTabs';