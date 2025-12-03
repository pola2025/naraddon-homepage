'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  isAdmin as checkIsAdmin,
  isExaminer as checkIsExaminer,
  isExpert as checkIsExpert,
  canWriteContent,
  getRoleLabel,
  getRoleBadgeColor,
  type RoleCheckUser,
} from '@/lib/auth/role-check';

interface User extends RoleCheckUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'examiner' | 'expert' | 'user';
  isAdmin?: boolean;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  // 기존 함수 (하위 호환성)
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  checkAccess: (resource: string, action: string) => boolean;
  // 새로운 역할 체크 함수 (role-check.ts 기반)
  isAdmin: boolean;
  isExaminer: boolean;
  isExpert: boolean;
  canWriteContent: boolean;
  roleLabel: string;
  roleBadgeColor: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: (session.user as any).id || '',
        email: session.user.email!,
        name: session.user.name || undefined,
        role: (session.user as any).role || 'user',
        isAdmin: (session.user as any).isAdmin || false,  // isAdmin 플래그 추가
        permissions: (session.user as any).permissions || [],
      });
    } else {
      setUser(null);
    }
  }, [session]);

  // 기존 함수 (하위 호환성 유지)
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (checkIsAdmin(user)) return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (role === 'admin') return checkIsAdmin(user);
    if (role === 'examiner') return checkIsExaminer(user);
    if (role === 'expert') return checkIsExpert(user);
    return user.role === role;
  };

  const checkAccess = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (checkIsAdmin(user)) return true;
    const permission = `${resource}:${action}`;
    return hasPermission(permission);
  };

  // 새로운 역할 체크 (role-check.ts 기반)
  const isAdminFlag = checkIsAdmin(user);
  const isExaminerFlag = checkIsExaminer(user);
  const isExpertFlag = checkIsExpert(user);
  const canWriteContentFlag = canWriteContent(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: status === 'loading',
        isAuthenticated: !!user,
        // 기존 함수
        hasPermission,
        hasRole,
        checkAccess,
        // 새로운 역할 체크
        isAdmin: isAdminFlag,
        isExaminer: isExaminerFlag,
        isExpert: isExpertFlag,
        canWriteContent: canWriteContentFlag,
        roleLabel: getRoleLabel(user),
        roleBadgeColor: getRoleBadgeColor(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
