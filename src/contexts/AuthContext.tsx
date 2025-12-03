'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'examiner' | 'user';
  isAdmin?: boolean;  // 관리자 권한 플래그 (role과 별도)
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  checkAccess: (resource: string, action: string) => boolean;
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

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.isAdmin) return true;  // isAdmin도 체크
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    // isAdmin 플래그가 있으면 admin 역할로 간주
    if (role === 'admin' && user.isAdmin) return true;
    return user.role === role || (user.role === 'admin' && role !== 'admin');
  };

  const checkAccess = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.isAdmin) return true;  // isAdmin도 체크

    const permission = `${resource}:${action}`;
    return hasPermission(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: status === 'loading',
        isAuthenticated: !!user,
        hasPermission,
        hasRole,
        checkAccess,
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
