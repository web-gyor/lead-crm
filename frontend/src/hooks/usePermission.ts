import { useAuth } from '../context/AuthContext';

type Action = 'view' | 'create' | 'edit' | 'delete' | 'export';

interface PermissionResult {
  canView:   boolean;
  canCreate: boolean;
  canEdit:   boolean;
  canDelete: boolean;
  canExport: boolean;
  loading:   boolean; // true while permissions are being fetched
}

const isTruthy = (val: any): boolean =>
  val === 1 || val === true || String(val) === '1';

export function usePermission(slug: string): PermissionResult {
  const { user, permissions, permissionsLoading } = useAuth();

  // While loading, return all false — sidebar will show skeleton instead of
  // hiding items, then reveal them once permissions arrive
  if (permissionsLoading) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false, loading: true };
  }

  // Super Admin — full access
  if (user?.is_super_admin) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true, loading: false };
  }

  if (!user) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false, loading: false };
  }

  const row = permissions.find(
    p => String(p.slug || '').trim().toLowerCase() === slug.trim().toLowerCase()
  );

  if (!row) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false, loading: false };
  }

  return {
    canView:   isTruthy(row.can_view),
    canCreate: isTruthy(row.can_create),
    canEdit:   isTruthy(row.can_edit),
    canDelete: isTruthy(row.can_delete),
    canExport: isTruthy(row.can_export),
    loading:   false,
  };
}

// Convenience hook — check one specific action on a slug
// Usage: const canDelete = useCanDo('leads', 'delete')
export function useCanDo(slug: string, action: Action): boolean {
  const { canView, canCreate, canEdit, canDelete, canExport } = usePermission(slug);
  const map: Record<Action, boolean> = { view: canView, create: canCreate, edit: canEdit, delete: canDelete, export: canExport };
  return map[action];
}