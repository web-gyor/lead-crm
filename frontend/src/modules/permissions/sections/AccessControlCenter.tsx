import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../../../utils/api";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";

import { RoleSidebarPanel, INITIAL_ENTERPRISE_ROLES } from "./RoleSidebarPanel";
import { AccessControlMatrix, PERMISSION_MODULE_GROUPS } from "./AccessControlMatrix";
import { SafetyAuditPanel } from "./SafetyAuditPanel";

const cleanStr = (s: string) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

const buildSlugActions = (): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  PERMISSION_MODULE_GROUPS.forEach(g =>
    g.items.forEach(item => {
      map[item.key] = item.supportedActions as unknown as string[];
    })
  );
  return map;
};

export default function AccessControlCenter() {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("admin");
  const [dbPermissions, setDbPermissions] = useState<any[]>([]);

  // 🚀 FIXED: Now securely checks both super_admin AND branch_admin numerical table flags cleanly!
  const canEdit = useMemo(() => {
    if (!user) return false;
    const normalized = String(user.role || "").trim().toLowerCase().replace(/[\s_-]/g, "");
    
    const isSuper = user.is_super_admin === 1 || user.is_super_admin === true;
    const isBranch = user.is_branch_admin === 1 || user.is_branch_admin === true;
    
    return isSuper || isBranch || ["superadmin", "admin", "branchadmin", "manager"].includes(normalized);
  }, [user]);

  const selectedRole = useMemo(() => 
    INITIAL_ENTERPRISE_ROLES.find(r => r.id === selectedRoleId) || INITIAL_ENTERPRISE_ROLES[1],
  [selectedRoleId]);

  const fetchPermissionsMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/api/permissions?t=${Date.now()}`);
      setDbPermissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
      addToast("Failed to load permission matrix", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPermissionsMatrix();
  }, [fetchPermissionsMatrix]);

  // ===================== SINGLE TOGGLE =====================
  const handleToggleCell = useCallback(async (
    roleKey: string,
    featureKey: string,
    actionKey: string,
    currentState: boolean,
  ) => {
    if (!roleKey || roleKey === "super-admin") return;

    const updatingKey = `${roleKey}-${featureKey}-${actionKey}`;
    const newValue = !currentState;
    const targetedRole = INITIAL_ENTERPRISE_ROLES.find(r => r.id === roleKey);
    const roleName = targetedRole?.name || roleKey;

    setUpdating(updatingKey);

    // Optimistic Update
    setDbPermissions(prev => {
      const newPerms = [...prev];
      const idx = newPerms.findIndex(p =>
        cleanStr(p.name || p.role) === cleanStr(roleName) &&
        cleanStr(p.slug) === cleanStr(featureKey)
      );

      if (idx !== -1) {
        newPerms[idx] = { ...newPerms[idx], [`can_${actionKey}`]: newValue ? 1 : 0 };
      } else {
        newPerms.push({
          name: roleName,
          slug: featureKey,
          can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_export: 0,
          [`can_${actionKey}`]: newValue ? 1 : 0,
        });
      }
      return newPerms;
    });

    try {
      const res = await apiPost("/api/permissions/update", {
        name: roleName,
        slug: featureKey,
        action: actionKey,
        value: newValue,
      });

      if (res?.success) {
        await fetchPermissionsMatrix();
        addToast("Permission updated", "success");
      } else {
        throw new Error("Server rejected update");
      }
    } catch (err) {
      console.error("Toggle failed:", err);
      // Revert
      setDbPermissions(prev =>
        prev.map(p =>
          cleanStr(p.name || p.role) === cleanStr(roleName) && cleanStr(p.slug) === cleanStr(featureKey)
            ? { ...p, [`can_${actionKey}`]: currentState ? 1 : 0 }
            : p
        )
      );
      addToast("Update failed — reverted", "error");
    } finally {
      setUpdating(null);
    }
  }, [addToast, fetchPermissionsMatrix]);

  // ===================== BULK TOGGLE =====================
  const handleBulkToggle = useCallback(async (roleKey: string, enableAll: boolean) => {
    if (roleKey === "super-admin") return;

    const targetedRole = INITIAL_ENTERPRISE_ROLES.find(r => r.id === roleKey);
    const roleName = targetedRole?.name || roleKey;
    const slugActions = buildSlugActions();

    setUpdating(`bulk-${roleKey}`);

    // Optimistic Bulk Update
    setDbPermissions(prev => {
      const newPerms = [...prev];
      Object.entries(slugActions).forEach(([slug, actions]) => {
        const idx = newPerms.findIndex(p =>
          cleanStr(p.name || p.role) === cleanStr(roleName) &&
          cleanStr(p.slug) === cleanStr(slug)
        );

        const patch: any = {};
        (actions as string[]).forEach(a => {
          patch[`can_${a}`] = enableAll ? 1 : 0;
        });

        if (idx !== -1) {
          newPerms[idx] = { ...newPerms[idx], ...patch };
        } else {
          newPerms.push({
            name: roleName,
            slug,
            can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_export: 0,
            ...patch,
          });
        }
      });
      return newPerms;
    });

    try {
      const res = await apiPost("/api/permissions/bulk-update", {
        name: roleName,
        role: roleName,
        slugActions,
        is_enabled: enableAll ? 1 : 0,
      });

      if (res?.success) {
        await fetchPermissionsMatrix();
        addToast(enableAll ? "All permissions granted" : "All permissions revoked", "success");
      } else {
        throw new Error("Bulk update rejected");
      }
    } catch (err) {
      console.error("Bulk toggle failed:", err);
      addToast("Bulk update failed", "error");
      await fetchPermissionsMatrix(); // Re-sync from server
    } finally {
      setUpdating(null);
    }
  }, [addToast, fetchPermissionsMatrix]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-bold uppercase tracking-wider text-[10px] animate-pulse">
        Loading Security Matrix...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 text-sm text-slate-900 dark:text-slate-100 font-normal antialiased">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 select-none">
        <div>
          <h1 className="text-sm font-black uppercase tracking-wide">Identity & Access Management</h1>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">
            RBAC Guard Operational Deck
          </p>
        </div>
        <button
          onClick={fetchPermissionsMatrix}
          disabled={updating !== null}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={updating?.startsWith("bulk-") ? "animate-spin text-blue-500" : ""} />
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        <RoleSidebarPanel selectedId={selectedRoleId} onSelect={setSelectedRoleId} />
        <div className="flex-1 w-full min-w-0">
          <AccessControlMatrix
            selectedRole={selectedRole}
            dbPermissions={dbPermissions}
            updating={updating}
            canEdit={canEdit}
            onToggleCell={handleToggleCell}
            onBulkToggle={handleBulkToggle}
          />
        </div>
        <SafetyAuditPanel selectedRole={selectedRole} dbPermissions={dbPermissions} />
      </div>
    </div>
  );
}