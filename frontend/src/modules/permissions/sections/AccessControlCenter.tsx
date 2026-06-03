import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../../../utils/api";
import { useToast } from "../../../hooks/useToast";

import { RoleSidebarPanel, INITIAL_ENTERPRISE_ROLES } from "../sections/RoleSidebarPanel";
import { AccessControlMatrix, PERMISSION_MODULE_GROUPS } from "../sections/AccessControlMatrix";
import { SafetyAuditPanel } from "../sections/SafetyAuditPanel";

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

  const [loading,        setLoading]        = useState(true);
  const [updating,       setUpdating]       = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("super-admin");
  const [matrixFilter,   setMatrixFilter]   = useState<string>("all");
  const [dbPermissions,  setDbPermissions]  = useState<any[]>([]);

  const selectedRole = useMemo(
    () => INITIAL_ENTERPRISE_ROLES.find(r => r.id === selectedRoleId) || INITIAL_ENTERPRISE_ROLES[0],
    [selectedRoleId],
  );

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

  useEffect(() => { fetchPermissionsMatrix(); }, [fetchPermissionsMatrix]);

  const handleToggleCell = useCallback(async (
    roleKey:      string,   // e.g. "admin", "manager", "counselor"
    featureKey:   string,   // DB slug row identifier
    actionKey:    string,   // e.g. "view", "create"
    currentState: boolean,
  ) => {
    if (!roleKey || roleKey === "super-admin") return;

    const updatingKey = `${roleKey}-${featureKey}-${actionKey}`;
    const newValue    = !currentState;
    
    // 🎯 FIX: Match backend role assignments using explicit IDs to prevent casing conflicts
    const targetedRoleObject = INITIAL_ENTERPRISE_ROLES.find(r => r.id === roleKey);
    const roleName = targetedRoleObject ? targetedRoleObject.name : roleKey;

    setUpdating(updatingKey);

    setDbPermissions(prev => {
      const exists = prev.some(
        p => p.slug?.toLowerCase() === featureKey.toLowerCase() &&
             p.name?.toLowerCase() === roleName.toLowerCase()
      );

      const updated = prev.map(p =>
        p.slug?.toLowerCase() === featureKey.toLowerCase() &&
        p.name?.toLowerCase() === roleName.toLowerCase()
          ? { ...p, [`can_${actionKey}`]: newValue ? 1 : 0 }
          : p
      );

      if (!exists) {
        updated.push({
          name:       roleName,
          slug:       featureKey,
          can_view:   0,
          can_create: 0,
          can_edit:   0,
          can_delete: 0,
          can_export: 0,
          [`can_${actionKey}`]: newValue ? 1 : 0,
        });
      }

      return updated;
    });

    try {
      const res = await apiPost("/api/permissions/update", {
        name:   roleName,
        slug:   featureKey,   
        action: actionKey,    
        value:  newValue,
      });

      if (!res?.success) throw new Error("Server rejected update");
      addToast("Permission updated", "success");

    } catch (err) {
      console.error("Single toggle failed:", err);
      setDbPermissions(prev =>
        prev.map(p =>
          p.slug?.toLowerCase() === featureKey.toLowerCase() &&
          p.name?.toLowerCase() === roleName.toLowerCase()
            ? { ...p, [`can_${actionKey}`]: currentState ? 1 : 0 }
            : p
        )
      );
      addToast("Update failed — change reverted", "error");
    } finally {
      setUpdating(null);
    }
  }, [addToast]);

  const handleBulkToggle = useCallback(async (roleKey: string, enableAll: boolean) => {
    if (roleKey === "super-admin") return;

    const targetedRoleObject = INITIAL_ENTERPRISE_ROLES.find(r => r.id === roleKey);
    // 🚀 FIXED: Enforce string mapping uniformity matching your exact DB rows
    const roleName = targetedRoleObject ? targetedRoleObject.name : roleKey;
    const slugActions = buildSlugActions();

    setUpdating(`bulk-${roleKey}`);

    setDbPermissions(prev => {
      const next = [...prev];
      Object.entries(slugActions).forEach(([slug, actions]) => {
        // Strict case-insensitive fallback loop mapping
        const idx = next.findIndex(
          p => String(p.slug).toLowerCase() === slug.toLowerCase() &&
               String(p.name || p.role).toLowerCase() === roleName.toLowerCase()
        );
        const patch: Record<string, number> = {};
        (actions as string[]).forEach(a => { patch[`can_${a}`] = enableAll ? 1 : 0; });

        if (idx !== -1) {
          next[idx] = { ...next[idx], ...patch };
        } else {
          next.push({
            name: roleName, 
            slug,
            can_view: 0, can_create: 0, can_edit: 0, can_delete: 0, can_export: 0,
            ...patch,
          });
        }
      });
      return next;
    });

    try {
      // 🚀 FIXED: Ensure data object keys align with backend router expected fields
      const res = await apiPost("/api/permissions/bulk-update", {
        name: roleName,       // Unified variable naming
        role: roleName,       // Fallback tracking naming
        slugActions,            
        is_enabled: enableAll ? 1 : 0, // Pass as a clean numeric binary parameter
      });

      if (!res?.success) throw new Error("Bulk update rejected");
      addToast(enableAll ? "All permissions granted" : "All permissions revoked", "success");

    } catch (err) {
      console.error("Bulk toggle failed:", err);
      addToast("Bulk update failed", "error");
      await fetchPermissionsMatrix(); // Sync state back instantly on error
    } finally {
      setUpdating(null);
    }
  }, [addToast, fetchPermissionsMatrix]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-bold uppercase tracking-wider text-[10px] animate-pulse">
        Loading Security Matrix…
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
          title="Refresh matrix"
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
            onToggleCell={handleToggleCell}
            onBulkToggle={handleBulkToggle}
            matrixFilter={matrixFilter}
            onFilterChange={setMatrixFilter}
          />
        </div>
        <SafetyAuditPanel selectedRole={selectedRole} dbPermissions={dbPermissions} />
      </div>
    </div>
  );
}