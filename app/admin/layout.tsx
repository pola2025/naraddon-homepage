'use client';

import { useState, useEffect, useRef } from 'react';
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

  // useRef로 인증 완료 상태 추적 (리렌더링 트리거 안함)
  const authCheckedRef = useRef(false);
  const currentPathRef = useRef('');
  const retryCountRef = useRef(0);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // status가 loading이면 아직 체크하지 않음
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }

    const checkAuthorization = async () => {
      // 이미 인증 완료되었고 같은 경로면 스킵
      if (authCheckedRef.current && currentPathRef.current === pathname) {
        return;
      }

      // 무한 루프 방지: 5번 이상 재시도하면 에러 표시
      if (retryCountRef.current >= 5) {
        console.error('[AdminLayout] Too many retries, stopping');
        setIsLoading(false);
        setIsAuthorized(false);
        return;
      }

      retryCountRef.current += 1;

      // 로그인 페이지는 인증 불필요
      if (pathname === '/admin/login') {
        setIsLoading(false);
        setIsAuthorized(true);
        authCheckedRef.current = true;
        currentPathRef.current = pathname;
        retryCountRef.current = 0; // 성공 시 카운터 리셋
        return;
      }

      // 메인 admin 페이지는 자체 인증 로직 사용
      if (pathname === '/admin') {
        setIsLoading(false);
        setIsAuthorized(true);
        authCheckedRef.current = true;
        currentPathRef.current = pathname;
        retryCountRef.current = 0; // 성공 시 카운터 리셋
        return;
      }

      // NextAuth 세션 없으면 로그인 페이지로
      if (!session) {
        console.log('[AdminLayout] No session, redirecting to login');
        router.push('/admin/login');
        setIsLoading(false);
        authCheckedRef.current = true; // 리다이렉트 후 재시도 방지
        currentPathRef.current = pathname;
        retryCountRef.current = 0; // 리다이렉트 시 카운터 리셋
        return;
      }

      // 관리자 역할 확인 (MongoDB에서 role 직접 확인)
      try {
        console.log('[AdminLayout] Checking admin role... (attempt', retryCountRef.current, ')');
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
            authCheckedRef.current = true;
            currentPathRef.current = pathname;
            retryCountRef.current = 0; // 성공 시 카운터 리셋
          } else {
            console.log('[AdminLayout] Not authorized (role:', userRole, '), redirecting to login');
            router.push('/admin/login');
            setIsLoading(false);
            authCheckedRef.current = true; // 리다이렉트 후 재시도 방지
            currentPathRef.current = pathname;
            retryCountRef.current = 0; // 리다이렉트 시 카운터 리셋
          }
        } else {
          console.log('[AdminLayout] Check session failed, redirecting to login');
          router.push('/admin/login');
          setIsLoading(false);
          authCheckedRef.current = true; // 리다이렉트 후 재시도 방지
          currentPathRef.current = pathname;
          retryCountRef.current = 0; // 리다이렉트 시 카운터 리셋
        }
      } catch (error) {
        console.error('[AdminLayout] Authorization check error:', error);
        router.push('/admin/login');
        setIsLoading(false);
        authCheckedRef.current = true; // 리다이렉트 후 재시도 방지
        currentPathRef.current = pathname;
        retryCountRef.current = 0; // 리다이렉트 시 카운터 리셋
      }
    };

    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pathname]); // status와 pathname이 변경될 때 실행

  const handleLogout = async () => {
    try {
      // 인증 플래그 리셋
      authCheckedRef.current = false;
      currentPathRef.current = '';

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
        <main className="flex-1 p-6 pb-16 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
