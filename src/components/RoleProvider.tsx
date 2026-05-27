import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type UserRole =
  | 'QA'
  | 'QAClinicals'
  | 'ClinicalCoordinator'
  | 'Lecturer'
  | 'Student'
  | 'Staff'
  | 'Management'
  | 'Admin';

const VALID_ROLES: UserRole[] = [
  'QA',
  'QAClinicals',
  'ClinicalCoordinator',
  'Lecturer',
  'Student',
  'Staff',
  'Management',
  'Admin',
];

function isValidRole(value: string | null | undefined): value is UserRole {
  return !!value && VALID_ROLES.includes(value as UserRole);
}

type RoleContextType = {
  role: UserRole;
  setRole: (role: UserRole) => void;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { userRole, updateRole: updateAuthRole } = useAuth();
  
  // Get initial role - prioritize userRole from AuthContext, then localStorage
  const getInitialRole = (): UserRole => {
    // First check AuthContext userRole
    if (isValidRole(userRole)) {
      return userRole;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kcu-role');
      if (isValidRole(saved)) {
        return saved;
      }
    }
    return 'QA';
  };

  const [role, setRoleState] = useState<UserRole>(() => getInitialRole());

  // Sync with AuthContext userRole whenever it changes
  useEffect(() => {
    if (isValidRole(userRole)) {
      if (userRole !== role) {
        setRoleState(userRole);
      }
    } else if (!userRole && typeof window !== 'undefined') {
      const saved = localStorage.getItem('kcu-role');
      if (isValidRole(saved) && saved !== role) {
        setRoleState(saved);
      }
    }
  }, [userRole, role]);

  const setRole = (r: UserRole) => {
    setRoleState(r);
    // Update both localStorage and AuthContext to keep them in sync
    if (typeof window !== 'undefined') {
      localStorage.setItem('kcu-role', r);
    }
    // Sync with AuthContext so it persists across route changes
    updateAuthRole(r);
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export default RoleProvider;
