import React from 'react';
import { BarChart2, UserPlus, Phone, Target, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { RingProgress } from './widgets/RingProgress';

interface PipelineFunnelProps {
  statusStats: any;
  totalLeads: number;
  conversionRate: number;
}

function FunnelBar({ label, val, total, color, icon }: { label: string; val: number; total: number; color: string; icon: React.ReactNode }) {
  const ratio = total > 0 ? Math.round((val / total) * 100) : 0;
  const hexBgResolve = color.includes("blue") ? "#2563eb" : color.includes("indigo") ? "#4f46e5" : color.includes("violet") ? "#7c3aed" : color.includes("amber") ? "#d97706" : color.includes("emerald") ? "#059669" : "#dc2626";

  return (
    <div className="flex items-center gap-3 font-mono">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-tight">{label}</span>
          <span className="text-[11px] font-black text-gray-900 dark:text-white">{val.toLocaleString()}</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-700" 
            style={{ width: `${ratio}%`, backgroundColor: hexBgResolve }}
          />
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{ratio}%</span>
    </div>
  );
}

export const PipelineFunnel = React.memo(({ statusStats: ss, totalLeads, conversionRate }: PipelineFunnelProps) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-3xs flex flex-col justify-between select-none h-full">
      <div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-600" />
            <h2 className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Conversion Funnel</h2>
          </div>
          <span className="text-[10px] font-mono font-black text-gray-400 uppercase">{totalLeads.toLocaleString()} Gross</span>
        </div>
        
        <div className="p-4 space-y-3">
          <FunnelBar label="New" val={ss.new || 0} total={totalLeads} color="bg-blue-50 dark:bg-blue-950/20" icon={<UserPlus size={13} className="text-blue-600" />} />
          <FunnelBar label="Contacted" val={ss.contacted || 0} total={totalLeads} color="bg-indigo-50 dark:bg-indigo-950/20" icon={<Phone size={13} className="text-indigo-600" />} />
          <FunnelBar label="Interested" val={ss.interested || 0} total={totalLeads} color="bg-violet-50 dark:bg-violet-950/20" icon={<Target size={13} className="text-violet-600" />} />
          <FunnelBar label="Follow-up" val={ss.followup || 0} total={totalLeads} color="bg-amber-50 dark:bg-amber-950/20" icon={<Clock size={13} className="text-amber-600" />} />
          <FunnelBar label="Converted" val={ss.converted || 0} total={totalLeads} color="bg-emerald-50 dark:bg-emerald-950/20" icon={<CheckCircle2 size={13} className="text-emerald-600" />} />
          <FunnelBar label="Lost" val={ss.lost || 0} total={totalLeads} color="bg-rose-50 dark:bg-rose-950/20" icon={<XCircle size={13} className="text-rose-500" />} />
        </div>
      </div>

      <div className="mx-4 mb-4 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/60 rounded-xl flex items-center gap-3">
        <div className="relative shrink-0 flex items-center justify-center">
          <RingProgress pct={conversionRate} size={48} stroke={4} color="#059669" />
          <span className="absolute text-[10px] font-black font-mono text-emerald-600">{conversionRate}%</span>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Yield Coefficient</p>
          <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">
            {ss.converted || 0} <span className="text-gray-400 font-bold">Admitted Nodes</span>
          </p>
          <p className="text-[9px] text-gray-400 font-bold mt-0.5">{(ss.lost || 0) + (ss.rejected || 0)} Operational dropouts</p>
        </div>
      </div>
    </div>
  );
});

PipelineFunnel.displayName = 'PipelineFunnel';