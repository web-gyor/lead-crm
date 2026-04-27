// src/utils/permissions.ts
export const hasPermission = (user: any, permissions: any[], permissionKey: string) => {
  if (!user) return false;
  const role = user.role?.toLowerCase();

  // 1. Admin Bypass
  if (role === 'admin' || role === 'superadmin') return true;

  // 2. Dynamic Toggle Check (Case-Insensitive)
  if (permissions && Array.isArray(permissions)) {
    return permissions.some(
      (p: any) => 
        p.feature_name?.toLowerCase() === permissionKey?.toLowerCase() && 
        p.is_enabled === 1
    );
  }

  return false;
};