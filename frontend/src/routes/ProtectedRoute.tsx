import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  permissionKey?: string;
}

const ProtectedRoute = ({ permissionKey }: ProtectedRouteProps) => {
  const { user, loading, token, permissions } = useAuth();
  const role = user?.role?.toLowerCase() || "";

  // ⏳ 1. AUTH LOADING STATE
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
        <div className="animate-pulse font-black text-blue-600 uppercase tracking-widest text-[10px]">
          Verifying HQ...
        </div>
      </div>
    );
  }

  // 🛑 2. NO SESSION → REDIRECT TO LOGIN
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 👑 3. ADMIN / SUPERADMIN → FULL ACCESS
  if (role === "admin" || role === "superadmin") {
    return <Outlet />;
  }

  // 🛡️ 4. PERMISSION-BASED ACCESS CONTROL
  if (permissionKey) {
    const key = permissionKey.toLowerCase();

    // 🔍 Find permission entry using the technical KEY column
    const permissionEntry = (permissions || []).find(
      (p: any) => p.permission_key === key
    );

    // 🚫 Explicitly disabled (check for number 0 or boolean false)
    if (
      permissionEntry &&
      (permissionEntry.is_enabled === 0 || permissionEntry.is_enabled === false)
    ) {
      console.warn(`Access blocked: ${key} is disabled for this role.`);
      return <Navigate to="/dashboard" replace />;
    }

    // ✅ Explicitly enabled (check for number 1 or boolean true)
    if (
      permissionEntry &&
      (permissionEntry.is_enabled === 1 || permissionEntry.is_enabled === true)
    ) {
      return <Outlet />;
    }

    // 🔄 Default core access (Using technical keys)
    const isCorePage = [
      "dashboard.view",
      "leads.view",
      "leads.kanban",
      "tracker.status",
    ].includes(key);

    const isStaff = ["manager", "counselor"].includes(role);

    if (isCorePage && isStaff) {
      return <Outlet />;
    }

    // 🛑 Access denied fallback (If no entry found and not a core page)
    console.warn(`Access denied: No valid permission entry found for key: ${key}`);
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ 5. DEFAULT AUTHORIZED (For routes without a specific permissionKey)
  return <Outlet />;
};

export default ProtectedRoute;