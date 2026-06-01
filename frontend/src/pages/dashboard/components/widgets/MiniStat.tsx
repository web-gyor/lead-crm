import React from 'react';

interface MiniStatProps {
  label: string;
  value: string | number;
  subValue?: string;
  isPositive?: boolean;
}

export const MiniStat = React.memo(({ label, value, subValue, isPositive = true }: MiniStatProps) => {
  return (
    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-xl font-mono flex items-center justify-between select-none">
      <div>
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 font-sans">{label}</p>
        <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{value}</p>
      </div>
      {subValue && (
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
          isPositive 
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" 
            : "text-rose-600 bg-rose-50 dark:bg-rose-950/20"
        }`}>
          {subValue}
        </span>
      )}
    </div>
  );
});

MiniStat.displayName = 'MiniStat';