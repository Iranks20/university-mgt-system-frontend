import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
  schoolId?: string | null;
  permissions?: string[];
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, studentId?: string) => Promise<void>;
  logout: () => Promise<void>;
  userRole: string | null;
  updateRole: (role: string) => void;
  refreshUser: () => Promise<void>;
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

  const refreshUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kcu-token') : null;
    if (!token) return;
    const next = await api.get<User>('/auth/me');
    if (!next?.id) return;
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, userRole, updateRole, refreshUser }}>
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
