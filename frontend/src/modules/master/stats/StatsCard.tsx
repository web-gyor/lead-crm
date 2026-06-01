import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'neutral' | 'success' | 'warning' | 'info' | 'purple';
}

const VARIANT_MAP = {
  neutral: "bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 icon-text-slate-500",
  success: "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
  warning: "bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
  info: "bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
  purple: "bg-purple-50/60 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30"
};

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, variant }) => {
  return (
    <div className={`flex items-center gap-3.5 px-4 py-4 rounded-2xl border transition-all duration-200 hover:shadow-3xs ${VARIANT_MAP[variant]}`}>
      <div className="p-2 rounded-xl bg-white dark:bg-slate-950/40 shadow-3xs border border-black/[0.02] dark:border-white/[0.02]">
        <Icon size={16} className="stroke-[2.5]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 truncate">{label}</p>
        <p className="text-xl font-bold tracking-tight mt-0.5 tabular-nums text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};