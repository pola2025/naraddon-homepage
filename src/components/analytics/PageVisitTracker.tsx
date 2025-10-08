'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 페이지 방문 추적 컴포넌트
 *
 * @purpose 모든 페이지 방문을 자동으로 MongoDB에 기록
 * @context 관리자 대시보드의 방문 통계를 위해 사용
 * @decision
 * - 클라이언트 컴포넌트로 usePathname 훅 사용
 * - 페이지 이동시마다 자동 추적
 * - 실패해도 사용자 경험에 영향 없도록 에러 무시
 */
export default function PageVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // 관리자 페이지나 API 경로는 추적하지 않음
    if (pathname.startsWith('/api/') ||
        pathname.startsWith('/admin/') ||
        pathname.startsWith('/_next/')) {
      return;
    }

    // 방문 기록 전송 (비동기, 에러 무시)
    const trackVisit = async () => {
      try {
        await fetch('/api/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pathname }),
        });
      } catch (error) {
        // 추적 실패해도 사용자 경험에 영향 없도록 에러 무시
        // console.error('[PageVisitTracker] Failed to track visit:', error);
      }
    };

    trackVisit();
  }, [pathname]); // pathname이 변경될 때마다 실행

  // UI를 렌더링하지 않음
  return null;
}
