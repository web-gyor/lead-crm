import React, { useEffect, useMemo } from "react";
import {
  LayoutDashboard, Users, Layers, Calendar, MessageCircle,
  Upload, Bot, FileText, Activity, Database, Settings,
  ShieldCheck, BarChart3, ShieldAlert,
} from "lucide-react";
import { EnterpriseRole } from "./RoleSidebarPanel";

type ActionKey = "view" | "create" | "edit" | "delete" | "export";

interface MatrixItem {
  name:             string;
  key:              string; 
  icon:             React.ReactNode;
  supportedActions: ActionKey[];
}

export interface PermissionGroup {
  group: string;
  items: MatrixItem[];
}

export const PERMISSION_MODULE_GROUPS: PermissionGroup[] = [
  {
    group: "1. Overview Section",
    items: [
      { name: "Dashboard Analytics", key: "dashboard", icon: <LayoutDashboard size={13} />, supportedActions: ["view", "export"] },
      { name: "Lead Workspace",      key: "leads",     icon: <Users size={13} />,           supportedActions: ["view", "create", "edit", "delete", "export"] },
    ],
  },
  {
    group: "2. Operations Section",
    items: [
      { name: "Pipeline Board",      key: "pipeline",  icon: <Layers size={13} />,          supportedActions: ["view", "create", "edit", "delete", "export"] },
      { name: "Follow-up Tasks",     key: "tasks",     icon: <Calendar size={13} />,        supportedActions: ["view", "create", "edit", "delete"] },
      { name: "Communication Logs",  key: "communication", icon: <MessageCircle size={13} />, supportedActions: ["view", "create", "delete", "export"] },
      { name: "Import Data Hub",     key: "import",    icon: <Upload size={13} />,          supportedActions: ["view", "create", "export"] },
      { name: "AI Automation Engine",key: "automation",icon: <Bot size={13} />,          supportedActions: ["view", "create", "edit"] },
    ],
  },
  {
    group: "3. Admin Section",
    items: [
      { name: "Analytics Intel",     key: "analytics", icon: <BarChart3 size={13} />,       supportedActions: ["view", "export"] },
      { name: "Lead Reports",        key: "reports",   icon: <FileText size={13} />,        supportedActions: ["view", "export"] },
      { name: "Audit & Logs",        key: "audit",     icon: <Activity size={13} />,        supportedActions: ["view", "export"] },
      { name: "System Masters",      key: "masters",   icon: <Database size={13} />,        supportedActions: ["view", "create", "edit", "delete"] },
    ],
  },
  {
    group: "4. System Section",
    items: [
      { name: "Settings Panel",      key: "settings",  icon: <Settings size={13} />,        supportedActions: ["view", "edit"] },
      { name: "Access Control Matrix",key: "rbac",      icon: <ShieldCheck size={13} />,     supportedActions: ["view", "edit"] },
    ],
  },
];

const ACTION_COLUMNS: { key: ActionKey; label: string }[] = [
  { key: "view",   label: "View"   },
  { key: "create", label: "Create" },
  { key: "edit",   label: "Edit"   },
  { key: "delete", label: "Delete" },
  { key: "export", label: "Export" },
];

interface AccessControlMatrixProps {
  selectedRole:    EnterpriseRole;
  dbPermissions:   any[];
  updating:        string | null;
  onToggleCell:    (roleKey: string, featureKey: string, actionType: string, current: boolean) => void;
  onBulkToggle:    (roleKey: string, enableAll: boolean) => void;
  matrixFilter?:   string;
  onFilterChange?: (val: string) => void;
}

const normalize = (s: string) => s ? s.toLowerCase().replace(/[\s_-]/g, "") : "";

export const AccessControlMatrix: React.FC<AccessControlMatrixProps> = ({
  selectedRole,
  dbPermissions,
  updating,
  onToggleCell,
  onBulkToggle,
}) => {
  const isSuperAdmin = selectedRole.id === "super-admin";

  const permMap = useMemo(() => {
    const map = new Map<string, any>();
    const roleName = normalize(selectedRole.name);
    dbPermissions.forEach((p) => {
      if (normalize(String(p.name || "")) === roleName) {
        map.set(normalize(String(p.slug || "")), p);
      }
    });
    return map;
  }, [dbPermissions, selectedRole.name]);

  const getCellStatus = (featureKey: string, actionKey: ActionKey): boolean => {
    if (isSuperAdmin) return true;
    const row = permMap.get(normalize(featureKey));
    if (!row) return false;
    const val = row[`can_${actionKey}`];
    return val === 1 || val === true || String(val) === "1";
  };

  const totalEnabled = useMemo(() => {
    if (isSuperAdmin) {
      return PERMISSION_MODULE_GROUPS.flatMap((g) => g.items)
        .reduce((sum, item) => sum + item.supportedActions.length, 0);
    }
    let count = 0;
    permMap.forEach((row) => {
      ACTION_COLUMNS.forEach((c) => {
        const val = row[`can_${c.key}`];
        if (val === 1 || val === true || String(val) === "1") count++;
      });
    });
    return count;
  }, [isSuperAdmin, permMap]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[RBAC] Role:", selectedRole.name, "| Active caps:", totalEnabled);
    }
  }, [selectedRole.id, totalEnabled]);

  return (
    <div className="border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/30 dark:border-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ShieldAlert size={15} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Access Control Matrix
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              <span className="font-black text-slate-600 dark:text-slate-300">{totalEnabled}</span> capabilities active
            </p>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-xl text-[9px] font-black border uppercase tracking-wider ${selectedRole.badgeColor}`}>
            {selectedRole.name}
          </span>
        </div>

        {!isSuperAdmin && (
          <div className="flex gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onBulkToggle(selectedRole.id, true)}
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              Grant all
            </button>
            <button
              type="button"
              onClick={() => onBulkToggle(selectedRole.id, false)}
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-95 transition-all cursor-pointer"
            >
              Revoke all
            </button>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
              <th className="px-5 py-3 w-[240px]">Module</th>
              {ACTION_COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-3 text-center">{c.label}</th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
            {PERMISSION_MODULE_GROUPS.map((group) => (
              <React.Fragment key={group.group}>
                <tr className="bg-slate-50/60 dark:bg-slate-900/20 select-none">
                  <td
                    colSpan={ACTION_COLUMNS.length + 1}
                    className="px-5 py-2 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-800/60"
                  >
                    {group.group}
                  </td>
                </tr>

                {group.items.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-400 dark:text-slate-500 shrink-0">{item.icon}</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {ACTION_COLUMNS.map((col) => {
                      const supported   = item.supportedActions.includes(col.key);
                      const isActive    = getCellStatus(item.key, col.key);
                      const updatingKey = `${selectedRole.id}-${item.key}-${col.key}`;
                      const isUpdating  = updating === updatingKey;

                      if (!supported) {
                        return (
                          <td key={col.key} className="px-3 py-3.5 text-center text-slate-300 dark:text-slate-700 select-none font-normal">—</td>
                        );
                      }

                      return (
                        <td key={col.key} className="px-3 py-3.5 text-center">
                          <button
                            type="button"
                            disabled={isSuperAdmin || isUpdating}
                            onClick={() => onToggleCell(selectedRole.id, item.key, col.key, isActive)}
                            title={`${isActive ? "Revoke" : "Grant"} ${col.label} — ${item.name}`}
                            aria-pressed={isActive}
                            className={[
                              "relative inline-flex h-4 w-7 rounded-full transition-colors duration-200 focus:outline-none",
                              isSuperAdmin ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:opacity-90",
                              isUpdating ? "opacity-40 animate-pulse pointer-events-none" : "",
                              isActive ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700",
                            ].filter(Boolean).join(" ")}
                          >
                            <span
                              className={[
                                "inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 my-auto",
                                isActive ? "translate-x-[14px]" : "translate-x-[2px]",
                              ].join(' ')}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 flex items-center justify-between select-none">
        <p className="text-[10px] text-slate-400">
          {isSuperAdmin ? "Super Admin has unrestricted access to all modules." : "Toggles persist immediately to the database."}
        </p>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {PERMISSION_MODULE_GROUPS.flatMap((g) => g.items).length} modules · {ACTION_COLUMNS.length} actions
        </span>
      </div>
    </div>
  );
};