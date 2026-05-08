// src/utils/permissions.ts
export const hasPermission = (user: any, permissions: any[], permissionKey: string) => {
  if (!user) return false;
  
  const role = user.role?.toLowerCase();
  if (role === 'admin') return true;

  if (!permissions || !Array.isArray(permissions)) {
    console.error("Permissions array is missing or invalid");
    return false;
  }

  // Find by the technical KEY (e.g., 'master.course')
  return permissions.some(p => 
    p.permission_key === permissionKey && 
    Number(p.is_enabled) === 1
  );
};