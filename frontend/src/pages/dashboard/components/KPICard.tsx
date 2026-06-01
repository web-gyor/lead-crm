import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SparkBars } from './widgets/SparkBars';

interface KPICardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  trend?: number;
  spark?: number[];
  accent: string;
  loading: boolean;
}

export const KPICard = React.memo(({ label, value, sub, icon, trend, spark, accent, loading }: KPICardProps) => {
  const up = (trend ?? 0) >= 0;
  const resolveColor = accent.includes("blue") ? "#2563eb" : accent.includes("emerald") ? "#059669" : accent.includes("amber") ? "#d97706" : accent.includes("violet") ? "#7c3aed" : "#64748b";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col justify-between gap-3 shadow-3xs transition-all duration-200 hover:shadow-2xs select-none">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        {trend !== undefined && !loading && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono ${up ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" : "text-rose-600 bg-rose-50 dark:bg-rose-950/20"}`}>
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
        <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight font-mono leading-none">
          {loading ? <div className="w-16 h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /> : value}
        </div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">{sub}</p>
      </div>

      {spark && spark.length > 0 && !loading && (
        <div className="pt-1 border-t border-gray-50 dark:border-gray-800/40">
          <SparkBars data={spark} color={resolveColor} />
        </div>
      )}
    </div>
  );
});

KPICard.displayName = 'KPICard';