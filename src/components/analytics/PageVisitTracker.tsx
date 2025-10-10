'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 세션 ID 생성 함수
 *
 * @purpose 방문자별 고유 세션 식별
 * @returns 고유한 세션 ID (UUID 형식)
 */
function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 페이지 방문 추적 컴포넌트
 *
 * @purpose 모든 페이지 방문을 자동으로 MongoDB에 기록
 * @context 관리자 대시보드의 방문 통계를 위해 사용
 * @decision
 * - 클라이언트 컴포넌트로 usePathname 훅 사용
 * - 페이지 이동시마다 자동 추적
 * - document.referrer로 실제 유입 경로 추적
 * - UTM 파라미터로 마케팅 캠페인 추적
 * - 세션 기반 첫 방문 유입 경로 저장
 * - 세션 ID로 방문자별 페이지뷰 추적
 * - 체류시간 측정 (페이지 진입/이탈 시간)
 * - 실패해도 사용자 경험에 영향 없도록 에러 무시
 * - window.location을 사용해 Suspense boundary 문제 회피
 */
export default function PageVisitTracker() {
  const pathname = usePathname();
  const pageEnterTimeRef = useRef<number>(Date.now());
  const visitIdRef = useRef<string>('');

  useEffect(() => {
    // 관리자 페이지나 API 경로는 추적하지 않음
    if (pathname.startsWith('/api/') ||
        pathname.startsWith('/admin/') ||
        pathname.startsWith('/_next/')) {
      return;
    }

    // 페이지 진입 시간 기록
    pageEnterTimeRef.current = Date.now();

    // 세션 ID 가져오기 또는 생성
    let sessionId = sessionStorage.getItem('naraddon_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('naraddon_session_id', sessionId);
    }

    // 세션 페이지뷰 카운트 증가
    const pageViewCount = parseInt(sessionStorage.getItem('naraddon_pageview_count') || '0', 10);
    const newPageViewCount = pageViewCount + 1;
    sessionStorage.setItem('naraddon_pageview_count', newPageViewCount.toString());

    // 방문 기록 전송 (비동기, 에러 무시)
    const trackVisit = async () => {
      try {
        // 실제 유입 경로 (document.referrer)
        const referrer = document.referrer || '';

        // UTM 파라미터 추출 (window.location 사용)
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source') || '';
        const utmMedium = urlParams.get('utm_medium') || '';
        const utmCampaign = urlParams.get('utm_campaign') || '';

        // 세션 기반 첫 방문 유입 경로 저장
        const firstReferrerKey = 'naraddon_first_referrer';
        let firstReferrer = sessionStorage.getItem(firstReferrerKey);

        if (!firstReferrer && referrer) {
          // 첫 방문 시 유입 경로 저장
          firstReferrer = referrer;
          sessionStorage.setItem(firstReferrerKey, referrer);
        }

        const response = await fetch('/api/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pathname,
            referrer,
            firstReferrer: firstReferrer || '',
            sessionId,
            pageViewCount: newPageViewCount,
            utmParams: {
              source: utmSource,
              medium: utmMedium,
              campaign: utmCampaign,
            },
          }),
        });

        const data = await response.json();
        // 서버에서 반환된 visit ID 저장
        if (data.visitId) {
          visitIdRef.current = data.visitId;
        }
      } catch (error) {
        // 추적 실패해도 사용자 경험에 영향 없도록 에러 무시
        // console.error('[PageVisitTracker] Failed to track visit:', error);
      }
    };

    trackVisit();

    // 페이지 이탈 시 체류시간 전송
    const handleBeforeUnload = () => {
      if (!visitIdRef.current) return;

      const timeSpent = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000); // 초 단위

      // sendBeacon은 비동기로 전송하며 페이지 언로드 시에도 작동
      const data = JSON.stringify({
        visitId: visitIdRef.current,
        timeSpent,
      });

      navigator.sendBeacon('/api/track-visit/time-spent', data);
    };

    // 페이지 이탈 이벤트 리스너
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 페이지 변경 시에도 체류시간 전송 (SPA 라우팅)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // 페이지 변경 시 체류시간 전송
      if (visitIdRef.current) {
        const timeSpent = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000);

        fetch('/api/track-visit/time-spent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitId: visitIdRef.current,
            timeSpent,
          }),
          keepalive: true, // 페이지 언로드 시에도 요청 완료
        }).catch(() => {
          // 에러 무시
        });
      }
    };
  }, [pathname]); // pathname 변경될 때마다 실행

  // UI를 렌더링하지 않음
  return null;
}
