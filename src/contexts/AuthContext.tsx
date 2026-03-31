'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  checkAccess: (resource: string, action: string) => boolean;
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
  const prevSessionRef = useRef<string>('');

  useEffect(() => {
    if (session?.user) {
      // 세션 데이터가 실제로 변경된 경우만 setUser 호출
      const sessionKey = `${(session.user as any).id}|${session.user.email}|${(session.user as any).role}`;
      if (sessionKey === prevSessionRef.current) return;
      prevSessionRef.current = sessionKey;

      setUser({
        id: (session.user as any).id || '',
        email: session.user.email!,
        name: session.user.name || undefined,
        role: (session.user as any).role || 'user',
        isAdmin: (session.user as any).isAdmin || false,
        permissions: (session.user as any).permissions || [],
      });
    } else {
      if (prevSessionRef.current === '') return;
      prevSessionRef.current = '';
      setUser(null);
    }
  }, [session]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (checkIsAdmin(user)) return true;
      return user.permissions?.includes(permission) || false;
    },
    [user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      if (role === 'admin') return checkIsAdmin(user);
      if (role === 'examiner') return checkIsExaminer(user);
      if (role === 'expert') return checkIsExpert(user);
      return user.role === role;
    },
    [user]
  );

  const checkAccessFn = useCallback(
    (resource: string, action: string): boolean => {
      if (!user) return false;
      if (checkIsAdmin(user)) return true;
      return hasPermission(`${resource}:${action}`);
    },
    [user, hasPermission]
  );

  // context value를 useMemo로 안정화 — user/status 변경 시에만 새 객체 생성
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading: status === 'loading',
      isAuthenticated: !!user,
      hasPermission,
      hasRole,
      checkAccess: checkAccessFn,
      isAdmin: checkIsAdmin(user),
      isExaminer: checkIsExaminer(user),
      isExpert: checkIsExpert(user),
      canWriteContent: canWriteContent(user),
      roleLabel: getRoleLabel(user),
      roleBadgeColor: getRoleBadgeColor(user),
    }),
    [user, status, hasPermission, hasRole, checkAccessFn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
