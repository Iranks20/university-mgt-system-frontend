import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
  schoolId?: string | null;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, studentId?: string) => Promise<void>;
  logout: () => Promise<void>;
  userRole: string | null;
  updateRole: (role: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
            user: JSON.parse(savedUser),
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

  const login = async (email: string, password: string, studentId?: string) => {
    try {
      const payload = studentId ? { studentId, password } : { email, password };
      const response = await api.post<{ token: string; user: User; role: string }>('/auth/login', payload);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('kcu-token', response.token);
        localStorage.setItem('kcu-user', JSON.stringify(response.user));
        localStorage.setItem('kcu-role', response.role);
        localStorage.setItem('kcu-authenticated', 'true');
      }
      
      setIsAuthenticated(true);
      setUserRole(response.role);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kcu-token');
        localStorage.removeItem('kcu-user');
        localStorage.removeItem('kcu-role');
        localStorage.removeItem('kcu-authenticated');
      }
    }
  };

  const updateRole = (role: string) => {
    setUserRole(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kcu-role', role);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, userRole, updateRole }}>
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
