import React from "react";
import { Users, Layers } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface EnterpriseRole {
  id: string;
  name: string;
  userCount: number;
  riskScore: number;
  badgeColor: string;
  description: string;
}

// 🎯 UPDATED: "Admin" role injected cleanly matching your dynamic permissions database mappings
export const INITIAL_ENTERPRISE_ROLES: EnterpriseRole[] = [
  {
    id: "super-admin",
    name: "Super Admin",
    userCount: 2,
    riskScore: 95,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    description: "Global system control with full operational pipeline clearance.",
  },
  {
    id: "admin",
    name: "Admin",
    userCount: 4,
    riskScore: 80,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    description: "Branch administration, user setups, and matrix configurations.",
  },
  {
    id: "manager",
    name: "Manager",
    userCount: 8,
    riskScore: 55,
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    description: "Team lead metrics oversight and track allocation records.",
  },
  {
    id: "counselor",
    name: "Counselor",
    userCount: 24,
    riskScore: 30,
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    description: "Assigned lead routing logs and profile file access.",
  },
  {
    id: "telecaller",
    name: "Telecaller",
    userCount: 42,
    riskScore: 15,
    badgeColor: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20",
    description: "Outbound communication dialer queues and tracking logs.",
  },
];

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface RoleSidebarPanelProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

// ─── COMPONENT IMPLEMENTATION ─────────────────────────────────────────────────

export const RoleSidebarPanel: React.FC<RoleSidebarPanelProps> = ({
  selectedId,
  onSelect,
}) => {
  return (
    <div className="w-full xl:w-72 shrink-0 space-y-4 xl:sticky xl:top-24">
      {/* ── Role hierarchy list ───────────────────────────────────────────── */}
      <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 rounded-2xl space-y-3 shadow-sm">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5 select-none">
          <Layers size={11} strokeWidth={2.2} />
          <span>Role hierarchy Matrix</span>
        </p>

        <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'none' }}>
          {INITIAL_ENTERPRISE_ROLES.map((role) => {
            const isSelected = selectedId === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelect(role.id)}
                className={[
                  'w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3',
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-white dark:text-slate-950 shadow-sm'
                    : 'bg-white border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/40',
                ].join(' ')}
              >
                <div className={[
                  'w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-colors',
                  isSelected
                    ? 'bg-white/10 border-white/10 dark:bg-slate-900/10'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800',
                ].join(' ')}>
                  <Users size={13} className={isSelected ? 'text-white dark:text-slate-900' : 'text-slate-400'} />
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-xs truncate font-bold uppercase tracking-tight">
                      {role.name}
                    </p>
                    <span className={[
                      'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0',
                      isSelected
                        ? 'bg-white/20 border-white/10 text-white dark:bg-slate-900/10 dark:text-slate-800'
                        : role.badgeColor,
                    ].join(' ')}>
                      {role.userCount}
                    </span>
                  </div>
                  <p className={`text-[10px] line-clamp-1 ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                    {role.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};