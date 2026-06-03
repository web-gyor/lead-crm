import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../../../utils/api";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";

import { RoleSidebarPanel, INITIAL_ENTERPRISE_ROLES } from "./RoleSidebarPanel";
import { AccessControlMatrix } from "./AccessControlMatrix";
import { SafetyAuditPanel } from "./SafetyAuditPanel";

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
  const [selectedRoleId, setSelectedRoleId] = useState<string>("admin"); // Changed default from super-admin
  const [dbPermissions, setDbPermissions] = useState<any[]>([]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    const normalized = String(user.role || "").trim().toLowerCase().replace(/[\s_-]/g, "");
    const isSuper = user.is_super_admin === 1 || user.is_super_admin === true;
    return isSuper || ["superadmin", "admin", "branchadmin", "manager"].includes(normalized);
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

  // ==================== OPTIMISTIC UPDATE FIX ====================
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

    // Optimistic update with better matching
    setDbPermissions(prev => {
      const newPerms = [...prev];
      const existingIndex = newPerms.findIndex(p => 
        cleanStr(p.name || p.role) === cleanStr(roleName) && 
        cleanStr(p.slug) === cleanStr(featureKey)
      );

      if (existingIndex !== -1) {
        newPerms[existingIndex] = {
          ...newPerms[existingIndex],
          [`can_${actionKey}`]: newValue ? 1 : 0,
          updated_at: new Date().toISOString()
        };
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
        await fetchPermissionsMatrix(); // Final sync
        addToast("Permission updated successfully", "success");
      } else {
        throw new Error("Server rejected");
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setDbPermissions(prev => prev.map(p => 
        cleanStr(p.name) === cleanStr(roleName) && cleanStr(p.slug) === cleanStr(featureKey)
          ? { ...p, [`can_${actionKey}`]: currentState ? 1 : 0 }
          : p
      ));
      addToast("Update failed — reverted", "error");
    } finally {
      setUpdating(null);
    }
  }, [addToast, fetchPermissionsMatrix]);

  // ... (keep your existing handleBulkToggle, but update similarly with cleanStr)

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]">Loading Security Matrix...</div>;
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-sm font-black uppercase">Identity & Access Management</h1>
        </div>
        <button onClick={fetchPermissionsMatrix} disabled={!!updating}>
          <RefreshCw size={16} className={updating ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <RoleSidebarPanel selectedId={selectedRoleId} onSelect={setSelectedRoleId} />
        <div className="flex-1">
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

// Add this helper at bottom
const cleanStr = (s: string) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");