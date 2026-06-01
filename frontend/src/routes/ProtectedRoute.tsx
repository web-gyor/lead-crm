import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  permissionKey?: string;
}

const ProtectedRoute = ({ permissionKey }: ProtectedRouteProps) => {
  const { user, loading, permissionsLoading, token, can } = useAuth();

  const role = String(user?.role || "").trim().toLowerCase();

  // ── 1. Session rehydrating ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
        <div className="animate-pulse font-black text-blue-600 uppercase tracking-widest text-[10px]">
          Verifying access…
        </div>
      </div>
    );
  }

  // ── 2. Not logged in ───────────────────────────────────────────────────────
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // ── 3. Super Admin — full bypass, no DB check needed ──────────────────────
  // Only super admin gets the bypass. Admin, Manager, Counselor, Telecaller
  // all go through the permissions table like everyone else.
  if (user.is_super_admin === true || user.is_super_admin === (1 as any)) {
    return <Outlet />;
  }

  // ── 4. Permissions still loading — hold render, never redirect ────────────
  // This is the fix for the crash: without this guard, can() returns false
  // while permissions=[] and the user gets bounced to /dashboard immediately.
  if (permissionsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
        <div className="animate-pulse font-black text-blue-600 uppercase tracking-widest text-[10px]">
          Loading permissions…
        </div>
      </div>
    );
  }

  // ── 5. No permission key — unguarded route, let through ───────────────────
  if (!permissionKey) {
    return <Outlet />;
  }

  // ── 6. Check DB permission ────────────────────────────────────────────────
  const slug = permissionKey.trim().toLowerCase();

  if (can(slug, "view")) {
    return <Outlet />;
  }

  // ── 7. Access denied — redirect to dashboard ──────────────────────────────
  console.warn(`[RBAC] Denied: role="${role}" slug="${slug}"`);
  return <Navigate to="/dashboard" replace />;
};

export default ProtectedRoute;