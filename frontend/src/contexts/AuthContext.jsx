import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services';
import { ROLES, ACTION_PERMISSIONS } from '../constants/roles';

const AuthContext = createContext(null);

/**
 * AuthProvider — quản lý user + token tập trung.
 *
 * Thay thế việc lift state trong App.jsx và prop-drill `user`/`token` xuống các component con.
 * Sử dụng: const { user, token, login, logout, hasRole, canDo } = useAuth();
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || null);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Persist state changes
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');
  }, [refreshToken]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  // Fetch fresh profile nếu có token nhưng chưa có user
  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      api.auth.getProfile()
        .then(profile => setUser(profile))
        .catch(() => {
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, [token, user]);

  const login = useCallback(async (credentials) => {
    const result = await api.auth.login(credentials);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken || null);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  // Convenience helpers
  const isAuthenticated = Boolean(token && user);
  const role = user?.role || null;
  const hasRole = useCallback((...allowed) => {
    if (!role) return false;
    return allowed.includes(role);
  }, [role]);

  const canDo = useCallback((actionKey) => {
    if (!role) return false;
    const allowed = ACTION_PERMISSIONS[actionKey];
    if (!allowed) return false;
    return allowed.includes(role);
  }, [role]);

  const value = useMemo(() => ({
    user,
    token,
    refreshToken,
    role,
    isAuthenticated,
    loading,
    login,
    logout,
    hasRole,
    canDo,
  }), [user, token, refreshToken, role, isAuthenticated, loading, login, logout, hasRole, canDo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export { ROLES };
