'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, pathname]);

  const checkAuthorization = async () => {
    console.log('[AdminLayout] checkAuthorization - pathname:', pathname, 'status:', status);

    // NextAuth 세션 로딩 중
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }

    // 로그인 페이지는 인증 불필요
    if (pathname === '/admin/login') {
      setIsLoading(false);
      setIsAuthorized(true);
      return;
    }

    // 메인 admin 페이지는 자체 인증 로직 사용
    if (pathname === '/admin') {
      setIsLoading(false);
      setIsAuthorized(true);
      return;
    }

    // NextAuth 세션 없으면 로그인 페이지로
    if (!session) {
      console.log('[AdminLayout] No session, redirecting to login');
      router.push('/admin/login');
      setIsLoading(false);
      return;
    }

    // 관리자 역할 확인 (MongoDB에서 role 확인)
    try {
      console.log('[AdminLayout] Checking admin role...');
      const res = await fetch('/api/admin/check-session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        const userRole = data.user?.role;
        console.log('[AdminLayout] User role:', userRole);

        if (userRole === 'admin' || userRole === 'super_admin') {
          setIsAuthorized(true);
          setIsLoading(false);
        } else {
          console.log('[AdminLayout] Not authorized, redirecting to login');
          router.push('/admin/login');
          setIsLoading(false);
        }
      } else {
        console.log('[AdminLayout] Check session failed, redirecting to login');
        router.push('/admin/login');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[AdminLayout] Authorization check error:', error);
      router.push('/admin/login');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // NextAuth 로그아웃
      const { signOut } = await import('next-auth/react');
      await signOut({ redirect: false });

      // Admin 세션 로그아웃
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });

      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 메인 admin 페이지, 로그인 페이지는 레이아웃 미적용
  // 나머지 admin 페이지들은 레이아웃 적용
  if (pathname === '/admin' || pathname === '/admin/login') {
    return <>{children}</>;
  }

  // 로딩 중
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthorized) {
    return null;
  }

  // 인증된 경우 - 관리자 레이아웃 적용
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {pathname !== '/admin/dashboard' && <AdminHeader />}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
