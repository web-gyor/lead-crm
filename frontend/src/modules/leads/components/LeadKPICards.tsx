import React from 'react';
import { Users, Zap, Clock, UserX } from 'lucide-react';

interface LeadKPICardsProps {
  totalLeads:       number;
  newToday:         number;
  highIntentLeads:  number;
  pendingFollowUps: number;
  unassignedLeads:  number;  // ✅ replaces conversionRate
  loading:          boolean;
}

export const LeadKPICards = React.memo(({
  totalLeads,
  newToday,
  highIntentLeads,
  pendingFollowUps,
  unassignedLeads,
  loading,
}: LeadKPICardsProps) => {
  const metrics = [
    {
      label: "Total Leads",
      val:   totalLeads,
      sub:   `+${newToday} today`,
      icon:  <Users size={14} className="text-blue-600 dark:text-blue-400" />,
      bg:    "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "High Intent",
      val:   highIntentLeads,
      sub:   "Action required",
      icon:  <Zap size={14} className="text-orange-500" />,
      bg:    "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Follow-ups",
      val:   pendingFollowUps,
      sub:   "Scheduled",
      icon:  <Clock size={14} className="text-purple-500" />,
      bg:    "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Unassigned",
      val:   unassignedLeads,
      sub:   "Needs assignment",
      icon:  <UserX size={14} className="text-rose-500" />,
      bg:    "bg-rose-50 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 select-none">
      {metrics.map((item, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 rounded-xl p-3 shadow-3xs flex items-center gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg ${item.bg} flex items-center justify-center transition-transform hover:scale-105`}>
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none">
              {item.label}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-1.5 mt-1 leading-none">
              <h3 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white font-mono tracking-tight">
                {loading ? "—" : item.val}
              </h3>
              <span className="text-[8px] sm:text-[9px] font-bold text-gray-500 truncate lowercase tracking-tight">
                {item.sub}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

LeadKPICards.displayName = 'LeadKPICards';