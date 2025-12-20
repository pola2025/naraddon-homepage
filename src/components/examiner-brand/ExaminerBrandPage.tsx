'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ExaminerBrandPage.module.css';
import Breadcrumb from './Breadcrumb';
import HeroSection from './HeroSection';
import TabSection from './TabSection';
import ContactSection from './ContactSection';

/**
 * 심사관 브랜드 페이지 메인 컴포넌트
 * 
 * @purpose 개별 심사관의 브랜드 페이지 표시
 * @context brand-page-dark-gold.html 디자인 기반 (다크골드 테마)
 */

interface ExaminerData {
  _id: string;
  name: string;
  position: string;
  companyName?: string;
  imageUrl?: string;
  headline?: string;
  bio?: string;
  specialties: string[];
  views?: number;
  likes?: number;
  policyAnalysisCount?: number;
  brandPage?: {
    companyLogo?: string;
    companyIntro?: string;
    useDefaultIntro: boolean;
    infoImage?: string;
    careers: Array<{
      period: string;
      company: string;
      position: string;
      description?: string;
    }>;
    successCases: Array<{
      title: string;
      client?: string;
      content: string;
      date: Date;
    }>;
    contactInfo: {
      website?: string;
      consultationHours?: string;
      address?: string;
    };
  };
}

interface ExaminerBrandPageProps {
  examinerId: string;
}

export default function ExaminerBrandPage({ examinerId }: ExaminerBrandPageProps) {
  const [examiner, setExaminer] = useState<ExaminerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // URL에서 preview 파라미터 확인 (비공개 심사관 미리보기용)
    const params = new URLSearchParams(window.location.search);
    const previewMode = params.get('preview') === 'true';
    setIsPreview(previewMode);

    const fetchExaminer = async () => {
      try {
        // preview 모드면 allowPrivate=true 추가하여 비공개 심사관도 조회 가능
        const apiUrl = previewMode
          ? `/api/certified-examiners/${examinerId}?allowPrivate=true`
          : `/api/certified-examiners/${examinerId}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('심사관을 찾을 수 없습니다.');
          } else if (response.status === 403) {
            throw new Error('비공개 심사관입니다.');
          }
          throw new Error('심사관 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        if (data.success) {
          setExaminer(data.examiner);

          // 페이지 방문 활동 기록
          try {
            await fetch(`/api/admin/examiners/${examinerId}/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activityType: 'pageVisit', increment: 1 })
            });
            console.log('[ExaminerBrandPage] Page visit recorded');
          } catch (activityError) {
            console.error('[ExaminerBrandPage] Failed to record page visit:', activityError);
            // 활동 기록 실패해도 페이지는 계속 표시
          }
        } else {
          throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
        }
      } catch (err) {
        console.error('Failed to fetch examiner:', err);
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchExaminer();
  }, [examinerId]);

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderRing}></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error || !examiner) {
    return (
      <div className={styles.error}>
        <h2>오류가 발생했습니다</h2>
        <p>{error || '심사관 정보를 불러올 수 없습니다.'}</p>
        <button onClick={() => router.push('/certified-examiners')} className={styles.backBtn}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 브레드크럼 아이템 구성
  const breadcrumbItems = [
    { label: '홈', href: '/' },
    { label: '인증 기업심사관', href: '/certified-examiners' },
    { label: examiner.name }
  ];

  return (
    <div className={styles.brandPageWrapper}>
      <div className={styles.breadcrumbContainer}>
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <HeroSection examiner={examiner} />
      <TabSection examiner={examiner} />
      <ContactSection examiner={examiner} />
    </div>
  );
}
