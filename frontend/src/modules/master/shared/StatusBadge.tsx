import React from 'react';

interface StatusBadgeProps {
  isActive: boolean | number;
  activeLabel?: string;
  inactiveLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isActive,
  activeLabel = "Active",
  inactiveLabel = "Inactive"
}) => {
  const isTrue = isActive === true || isActive === 1;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
      isTrue
        ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
        : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isTrue ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {isTrue ? activeLabel : inactiveLabel}
    </span>
  );
};