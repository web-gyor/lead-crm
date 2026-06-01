import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message: string;
  icon: LucideIcon;
}

export const EmptyState = React.memo(function EmptyState({ 
  title, 
  message, 
  icon: Icon 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 select-none animate-in fade-in duration-100">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Icon size={20} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      <p className="text-[9px] text-slate-300 dark:text-slate-600 text-center max-w-[180px]">{message}</p>
    </div>
  );
});