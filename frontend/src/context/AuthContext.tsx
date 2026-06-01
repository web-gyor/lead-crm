import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { apiGet, apiPost } from '../utils/api';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Permission {
  slug:       string;
  can_view:   number | boolean;
  can_create: number | boolean;
  can_edit:   number | boolean;
  can_delete: number | boolean;
  can_export: number | boolean;
}

export interface User {
  id:             number;
  name:           string;
  email:          string;
  role:           string;
  is_super_admin: boolean;
}

type Action = 'view' | 'create' | 'edit' | 'delete' | 'export';

interface AuthContextValue {
  user:               User | null;
  token:              string | null;
  loading:            boolean;
  permissionsLoading: boolean;
  permissions:        Permission[];
  login:              (email: string, password: string) => Promise<any>;
  logout:             () => void;
  refreshPermissions: () => Promise<void>;
  can:                (slug: string, action?: Action) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const isTruthy = (val: any): boolean =>
  val === 1 || val === true || String(val) === '1';

const fetchPermsForRole = async (role: string): Promise<Permission[]> => {
  try {
    const res = await apiGet(`/api/permissions/role/${encodeURIComponent(role)}`);
    return Array.isArray(res) ? res : (res?.data || []);
  } catch (err) {
    console.error('fetchPermsForRole failed:', err);
    return [];
  }
};

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user,               setUser]               = useState<User | null>(null);
  const [token,              setToken]              = useState<string | null>(null);
  const [permissions,        setPermissions]        = useState<Permission[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // ── Permission checker ─────────────────────────────────────────────────────
  // Single source of truth — used by MainLayout, usePermission hook, everywhere.
 // 🎯 TARGET LOCATION: src/context/AuthContext.tsx -> can function definition

  const can = useCallback((slug: string, action: Action = 'view'): boolean => {
    if (!user) return false;

    const normalizedSlug = String(slug || '').trim().toLowerCase();
    
    // 🚀 THE ABSOLUTE GATEKEEPER:
    // Completely removed all branch strings. Now strictly handles hiding 
    // the unrequested automation features from the client workspace.
    if (normalizedSlug.includes('automation') || normalizedSlug.includes('workflow')) {
      return false;
    }

    // Super Admin only — full access always for active core features
    if (isTruthy(user.is_super_admin)) return true;

    // All other roles (Admin, Manager, Counselor, Telecaller): read from DB
    // Exact slug match only — no fallbacks, no wildcards
    const row = permissions.find(
      p => String(p.slug || '').trim().toLowerCase() === normalizedSlug
    );
    if (!row) return false;
    return isTruthy(row[`can_${action}` as keyof Permission]);
  }, [user, permissions]);

  // ── Login ──────────────────────────────────────────────────────────────────
// 🎯 TARGET LOCATION: Inside your AuthProvider Component -> login function block

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const res: any = await apiPost('/api/auth/login', { email, password });
    if (!res?.token || !res?.user) throw new Error('Invalid login response');

    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));

    // Use permissions from login response if available (fastest path)
    // Otherwise fetch by role (fallback for older login APIs)
    let perms: Permission[] = [];

    if (Array.isArray(res.permissions) && res.permissions.length > 0) {
      // 🚀 FIXED: Automatically filters old branch tags right out of the successful HTTP response stream
      perms = res.permissions.filter((p: Permission) => {
        const slug = String(p?.slug || '').toLowerCase().trim();
        return !slug.includes('branch') && slug !== 'settings/branch';
      });
    } else {
      setPermissionsLoading(true);
      try {
        perms = await fetchPermsForRole(res.user.role);
      } finally {
        setPermissionsLoading(false);
      }
    }

    setPermissions(perms);
    localStorage.setItem('permissions', JSON.stringify(perms));
    return res;
  };
  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.clear();
    window.location.href = '/login';
  };

  // ── Refresh (call after RBAC edits) ───────────────────────────────────────
const refreshPermissions = async () => {
    if (!user?.role) return;
    const perms = await fetchPermsForRole(user.role.toLowerCase().trim());
    setPermissions(perms);
    localStorage.setItem('permissions', JSON.stringify(perms));
  };

  // 🎯 HARDENED INITIALIZATION SESSION RESTORE
  useEffect(() => {
    const init = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        const savedPermissions = localStorage.getItem('permissions');

        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(savedToken);
          
          // If local storage handles empty states, fetch fresh permissions instantly
          if (savedPermissions && savedPermissions !== "[]") {
            setPermissions(JSON.parse(savedPermissions));
          } else {
            const freshPerms = await fetchPermsForRole(parsedUser.role.toLowerCase().trim());
            setPermissions(freshPerms);
            localStorage.setItem('permissions', JSON.stringify(freshPerms));
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading, permissionsLoading,
      permissions, login, logout, refreshPermissions, can,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};