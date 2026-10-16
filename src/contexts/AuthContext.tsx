import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import api from '@/lib/api';
import { PASSWORD_CHANGE_REQUIRED_EVENT } from '@/lib/auth-events';
import { hasAnyPermission } from '@/lib/nav-permissions';

export type AccessScope = {
  unrestricted: boolean;
  schoolIds: string[];
  departmentIds: string[];
  programIds: string[];
  orgUnitIds: string[];
};

export type AccessGrant = {
  source: 'Role' | 'AdditionalRole' | 'Position' | 'HeadOfDepartment';
  name: string;
  code: string | null;
  positionTitle: string | null;
  unitName: string | null;
  isActing: boolean;
  endDate: string | null;
  scopeLabel: string;
  permissions: string[];
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
  schoolId?: string | null;
  permissions?: string[];
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  access?: { scope: AccessScope; grants: AccessGrant[] };
};

export type SessionPayload = { token: string; user: User };

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, studentId?: string) => Promise<void>;
  logout: () => Promise<void>;
  userRole: string | null;
  updateRole: (role: string) => void;
  refreshUser: () => Promise<void>;
  applySession: (session: SessionPayload) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(token: string, user: User, role: string) {
  localStorage.setItem('kcu-token', token);
  localStorage.setItem('kcu-user', JSON.stringify(user));
  localStorage.setItem('kcu-role', role);
  localStorage.setItem('kcu-authenticated', 'true');
}

function clearSession() {
  localStorage.removeItem('kcu-token');
  localStorage.removeItem('kcu-user');
  localStorage.removeItem('kcu-role');
  localStorage.removeItem('kcu-authenticated');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const getInitialAuth = () => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('kcu-token');
      const savedUser = localStorage.getItem('kcu-user');
      const savedRole = localStorage.getItem('kcu-role');

      if (savedToken && savedUser && savedRole) {
        try {
          return {
            isAuthenticated: true,
            userRole: savedRole,
            user: JSON.parse(savedUser) as User,
          };
        } catch {
          return { isAuthenticated: false, userRole: null, user: null };
        }
      }
    }
    return { isAuthenticated: false, userRole: null, user: null };
  };

  const initialState = getInitialAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialState.isAuthenticated);
  const [userRole, setUserRole] = useState<string | null>(initialState.userRole);
  const [user, setUser] = useState<User | null>(initialState.user);
  const lastRefreshAtRef = useRef<number>(0);

  const refreshUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kcu-token') : null;
    if (!token) return;
    const next = await api.get<User>('/auth/me');
    if (!next?.id) return;
    lastRefreshAtRef.current = Date.now();
    setIsAuthenticated(true);
    setUserRole(next.role);
    setUser(next);
    persistSession(token, next, next.role);
  };

  useEffect(() => {
    if (!initialState.isAuthenticated) return;
    refreshUser().catch(() => {
      setIsAuthenticated(false);
      setUserRole(null);
      setUser(null);
      clearSession();
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const REFRESH_INTERVAL_MS = 3 * 60 * 1000;
    const MIN_GAP_MS = 30 * 1000;

    const tick = () => {
      refreshUser().catch(() => {});
    };

    const interval = window.setInterval(tick, REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshAtRef.current < MIN_GAP_MS) return;
      tick();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [isAuthenticated]);

  const login = async (email: string, password: string, studentId?: string) => {
    const payload = studentId ? { studentId, password } : { email, password };
    const response = await api.post<{ token: string; user: User; role: string }>('/auth/login', payload);
    persistSession(response.token, response.user, response.role);
    setIsAuthenticated(true);
    setUserRole(response.role);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
      setUser(null);
      clearSession();
    }
  };

  const updateRole = (role: string) => {
    setUserRole(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kcu-role', role);
    }
  };

  const applySession = useCallback((session: SessionPayload) => {
    persistSession(session.token, session.user, session.user.role);
    lastRefreshAtRef.current = Date.now();
    setIsAuthenticated(true);
    setUserRole(session.user.role);
    setUser(session.user);
  }, []);

  useEffect(() => {
    const onPasswordChangeRequired = () => {
      setUser((current) => {
        if (!current || current.mustChangePassword) return current;
        const next = { ...current, mustChangePassword: true };
        localStorage.setItem('kcu-user', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, onPasswordChangeRequired);
    return () => window.removeEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, onPasswordChangeRequired);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, logout, userRole, updateRole, refreshUser, applySession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const can = useCallback(
    (...codes: string[]) => hasAnyPermission(permissions, codes),
    [permissions]
  );
  return { permissions, can, scope: user?.access?.scope ?? null, grants: user?.access?.grants ?? [] };
}
