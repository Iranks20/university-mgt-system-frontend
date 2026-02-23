import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type UserRole = 'QA' | 'Lecturer' | 'Student' | 'Staff' | 'Management' | 'Admin';

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
    if (userRole && ['QA', 'Lecturer', 'Student', 'Staff', 'Management', 'Admin'].includes(userRole)) {
      return userRole as UserRole;
    }
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kcu-role');
      if (saved && ['QA', 'Lecturer', 'Student', 'Staff', 'Management', 'Admin'].includes(saved)) {
        return saved as UserRole;
      }
    }
    return 'QA'; // Default fallback
  };

  const [role, setRoleState] = useState<UserRole>(() => getInitialRole());

  // Sync with AuthContext userRole whenever it changes
  useEffect(() => {
    if (userRole && ['QA', 'Lecturer', 'Student', 'Staff', 'Management', 'Admin'].includes(userRole)) {
      // Only update if different to avoid unnecessary re-renders
      if (userRole !== role) {
        setRoleState(userRole as UserRole);
      }
    } else if (!userRole && typeof window !== 'undefined') {
      // If userRole is null, check localStorage as fallback
      const saved = localStorage.getItem('kcu-role');
      if (saved && ['QA', 'Lecturer', 'Student', 'Staff', 'Management', 'Admin'].includes(saved)) {
        if (saved !== role) {
          setRoleState(saved as UserRole);
        }
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
