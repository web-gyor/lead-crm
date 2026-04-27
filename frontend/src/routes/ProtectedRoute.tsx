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

    // Find permission entry
    const permissionEntry = (permissions || []).find(
      (p: any) => p.feature_name?.trim().toLowerCase() === key
    );

    // 🚫 Explicitly disabled
    if (
      permissionEntry &&
      (permissionEntry.is_enabled === 0 || permissionEntry.is_enabled === false)
    ) {
      return <Navigate to="/dashboard" replace />;
    }

    // ✅ Explicitly enabled
    if (
      permissionEntry &&
      (permissionEntry.is_enabled == 1 || permissionEntry.is_enabled === true)
    ) {
      return <Outlet />;
    }

    // 🔄 Default core access
    const isCorePage = [
      "dashboard",
      "view leads",
      "kanban pipeline",
      "status board trackers",
    ].includes(key);

    const isStaff = ["manager", "counselor"].includes(role);

    if (isCorePage && isStaff) {
      return <Outlet />;
    }

    // 🛑 Access denied fallback
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ 5. DEFAULT AUTHORIZED
  return <Outlet />;
};

export default ProtectedRoute;