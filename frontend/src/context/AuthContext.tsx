import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiGet, apiPost } from '../utils/api';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser]               = useState<any>(null);
  const [token, setToken]             = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  const fetchPermsForRole = async (role: string) => {
    const response: any = await apiGet(`/api/permissions/${role.toLowerCase()}`);
    const list = Array.isArray(response) ? response : (response?.data || []);
    //console.log(`[AuthContext] Permissions fetched for "${role}":`, list.length, 'rows');
    return list;
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedUser  = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedToken) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(savedToken);
          const permsList = await fetchPermsForRole(parsedUser.role);
          setPermissions(permsList);
          localStorage.setItem('permissions', JSON.stringify(permsList));
        } catch (e: any) {
          console.error("Auth hydration failed:", e);
          if (e.response?.status === 401) {
            localStorage.clear();
            setUser(null);
            setToken(null);
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res: any = await apiPost('auth/login', { email, password });
      if (res.token && res.user) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        const permsList = await fetchPermsForRole(res.user.role);
        setUser(res.user);
        setToken(res.token);
        setPermissions(permsList);
        localStorage.setItem('permissions', JSON.stringify(permsList));
        return res;
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.clear();
    window.location.href = '/login';
  };

  const refreshPermissions = async () => {
    if (!user) return;
    try {
      const permsList = await fetchPermsForRole(user.role);
      setPermissions(permsList);
      localStorage.setItem('permissions', JSON.stringify(permsList));
    } catch (e) {
      console.error("Failed to refresh permissions:", e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Initialising Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, permissions, login, logout, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};