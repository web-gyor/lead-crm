import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../utils/api";
import { useToast } from "../hooks/useToast";
import {
  RefreshCw, Shield, LayoutDashboard, Target, Users,
  Activity, BarChart2, MessageCircle, Lock,
  UserCog, Settings, ShieldCheck, Download,
  Database, Kanban, ListTodo, BrainCircuit, GraduationCap,
  ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["Admin", "Manager", "Counselor"] as const;
type Role = (typeof ROLES)[number];

interface ModuleItem {
  name: string;
  icon: React.ReactNode;
}

interface ModuleGroup {
  group: string;
  items: ModuleItem[];
}

const MODULES: ModuleGroup[] = [
  {
    group: "Core Sales",
    items: [
      { name: "View Leads",         icon: <Users size={14} /> },
      { name: "Create Leads",       icon: <Target size={14} /> },
      { name: "Edit Leads",         icon: <Activity size={14} /> },
      { name: "Delete Leads",       icon: <Lock size={14} /> },
      { name: "Assign Leads",       icon: <UserCog size={14} /> },
      { name: "View All Leads",     icon: <Shield size={14} /> },
      
    ],
  },
  {
    group: "Engagement & Tracking",
    items: [
      { name: "Kanban Pipeline",       icon: <Kanban size={14} /> },
      { name: "Activity Task",         icon: <ListTodo size={14} /> },
      { name: "Communication Log",     icon: <MessageCircle size={14} /> },
      { name: "Status Board Trackers", icon: <LayoutDashboard size={14} /> },
    ],
  },
  {
    group: "Intelligence & Growth",
    items: [
      { name: "Revenue Analytics", icon: <BarChart2 size={14} /> },
      { name: "Staff Performance",  icon: <Activity size={14} /> },
      { name: "Intelligence AI",    icon: <BrainCircuit size={14} /> },
    ],
  },
  {
    group: "Administration",
    items: [
      { name: "Export Data",     icon: <Download size={14} /> },
      { name: "Bulk Import",     icon: <Database size={14} /> },
      { name: "Staff Master",    icon: <UserCog size={14} /> },
      { name: "Course Master",   icon: <GraduationCap size={14} /> },
      { name: "System Settings", icon: <Settings size={14} /> },
      { name: "Role Permission", icon: <ShieldCheck size={14} /> },
    ],
  },
];

const ALL_FEATURES = MODULES.flatMap((g) => g.items.map((i) => i.name));

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  role: string;
  feature_name: string;
  is_enabled: boolean | 0 | 1;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  enabled: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: () => void;
}

function ToggleSwitch({ enabled, disabled, loading, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        enabled
          ? "bg-blue-600 shadow-md shadow-blue-600/25"
          : "bg-gray-200 dark:bg-gray-700",
        disabled && !loading ? "cursor-default opacity-50" : "cursor-pointer",
        loading ? "animate-pulse opacity-60" : "",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-[18px]" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  manager:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  counselor:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ROLE_STYLES[role.toLowerCase()] ?? ""}`}>
      {role}
    </span>
  );
}

// ─── Mobile: Accordion card per group ────────────────────────────────────────

interface MobileGroupCardProps {
  group: ModuleGroup;
  activeRole: Role;
  permissions: Permission[];
  updating: string | null;
  onToggle: (role: string, feature: string, current: boolean) => void;
}

function MobileGroupCard({ group, activeRole, permissions, updating, onToggle }: MobileGroupCardProps) {
  const [open, setOpen] = useState(true);

  const isEnabled = (role: string, feature: string): boolean => {
    if (role.toLowerCase() === "admin") return true;
    const entry = permissions.find(
      (p) =>
        p.role.toLowerCase() === role.toLowerCase() &&
        p.feature_name === feature
    );
    if (!entry) return false;
    return entry.is_enabled === 1 || entry.is_enabled === true;
  };

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/70 dark:bg-gray-800/60"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
          {group.group}
        </span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {group.items.map((item) => {
            const enabled = isEnabled(activeRole, item.name);
            const isAdmin = activeRole.toLowerCase() === "admin";
            const isUpdating =
              updating === `${activeRole}-${item.name}` ||
              updating === `all-${activeRole}`;

            return (
              <li key={item.name} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0 text-gray-400">{item.icon}</span>
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                    {item.name}
                  </span>
                </div>
                <ToggleSwitch
                  enabled={enabled}
                  disabled={isAdmin || !!updating}
                  loading={isUpdating}
                  onChange={() => onToggle(activeRole, item.name, enabled)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Mobile: which role tab is active
  const [activeRole, setActiveRole] = useState<Role>("Manager");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/permissions");
      setPermissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isEnabled = (role: string, feature: string): boolean => {
    if (role.toLowerCase() === "admin") return true;
    const entry = permissions.find(
      (p) =>
        p.role.toLowerCase() === role.toLowerCase() &&
        p.feature_name === feature
    );
    if (!entry) return false;
    return entry.is_enabled === 1 || entry.is_enabled === true;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggle = async (role: string, feature: string, currentEnabled: boolean) => {
    const normalizedRole = role.toLowerCase();
    const newValue = currentEnabled ? 0 : 1;

    // Optimistic update
    setPermissions((prev) =>
      prev.map((p) =>
        p.role.toLowerCase() === normalizedRole && p.feature_name === feature
          ? { ...p, is_enabled: newValue }
          : p
      )
    );

    try {
      await apiPost("/api/permissions/update", {
        role: normalizedRole,
        feature_name: feature,
        is_enabled: newValue,
      });
    } catch (err) {
      console.error(err);
      toast.error("Toggle failed — reverting");
      // Revert
      setPermissions((prev) =>
        prev.map((p) =>
          p.role.toLowerCase() === normalizedRole && p.feature_name === feature
            ? { ...p, is_enabled: currentEnabled ? 1 : 0 }
            : p
        )
      );
    }
  };

  const handleToggleAll = async (role: string, enable: boolean) => {
    if (role.toLowerCase() === "admin") return;
    const normalizedRole = role.toLowerCase();

    try {
      setUpdating(`all-${role}`);
      await Promise.all(
        ALL_FEATURES.map((feature) =>
          apiPost("/api/permissions/update", {
            role: normalizedRole,
            feature_name: feature,
            is_enabled: enable ? 1 : 0,
          })
        )
      );
      await fetchPermissions();
      toast.success(`Permissions updated for ${role}`);
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setUpdating(null);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading Permissions…
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 px-2 sm:px-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Shield size={16} className="text-white" />
            </span>
            Role Permissions
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
            {ALL_FEATURES.length} Access Points · {ROLES.length} Roles
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPermissions}
          aria-label="Refresh permissions"
          className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on md+)
      ══════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">

        {/* Role tab selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={[
                "shrink-0 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeRole === role
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
              ].join(" ")}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Bulk actions for non-admin roles */}
        {activeRole.toLowerCase() !== "admin" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleToggleAll(activeRole, true)}
              disabled={!!updating}
              className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(activeRole, false)}
              disabled={!!updating}
              className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-40"
            >
              Disable All
            </button>
          </div>
        )}

        {/* Accordion groups */}
        {MODULES.map((group) => (
          <MobileGroupCard
            key={group.group}
            group={group}
            activeRole={activeRole}
            permissions={permissions}
            updating={updating}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden below md)
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:block rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 w-64">
                  Feature / Module
                </th>
                {ROLES.map((role) => (
                  <th key={role} className="px-4 py-4 text-center min-w-[130px]">
                    <div className="flex flex-col items-center gap-2">
                      <RoleBadge role={role} />
                      {role.toLowerCase() !== "admin" && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleAll(role, true)}
                            disabled={!!updating}
                            className="text-[8px] font-black text-emerald-600 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
                          >
                            ALL
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAll(role, false)}
                            disabled={!!updating}
                            className="text-[8px] font-black text-rose-500 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-40"
                          >
                            NONE
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((group) => (
                <React.Fragment key={group.group}>
                  {/* Group header row */}
                  <tr className="bg-gray-50/40 dark:bg-gray-800/40 border-y border-gray-100 dark:border-gray-800">
                    <td colSpan={ROLES.length + 1} className="px-6 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
                        {group.group}
                      </span>
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {group.items.map((item) => (
                    <tr
                      key={item.name}
                      className="group border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0">
                            {item.icon}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {ROLES.map((role) => {
                        const enabled = isEnabled(role, item.name);
                        const isAdmin = role.toLowerCase() === "admin";
                        const isUpdating =
                          updating === `${role}-${item.name}` ||
                          updating === `all-${role}`;

                        return (
                          <td key={`${role}-${item.name}`} className="px-4 py-3 text-center">
                            <ToggleSwitch
                              enabled={enabled}
                              disabled={isAdmin || !!updating}
                              loading={isUpdating}
                              onChange={() => handleToggle(role, item.name, enabled)}
                            />
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
      </div>

      {/* ── Footer note ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/60 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/60">
        <Lock size={14} className="text-blue-600 shrink-0" />
        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">
          Admin role has full, immutable system access.
        </p>
      </div>
    </div>
  );
}