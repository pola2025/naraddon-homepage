'use client';

import React, { useEffect, lazy, Suspense } from 'react';
import './Home.css';
import HeroSection from './components/HeroSection/index';
import { prefetchPolicyNews } from '../../utils/prefetch';
import PopupBanner from '../common/PopupBanner';
import { MotionLoader, ScrollReveal } from '@/components/loading';

// 동적 임포트로 초기 로딩 속도 개선
const TrustSection = lazy(() => import('../TrustSection'));
const ShortsSection = lazy(() => import('../ShortsSection'));
const PolicyThumbnails = lazy(() => import('../PolicyThumbnails'));
const NaraddonTube = lazy(() => import('../NaraddonTube/NaraddonTubeSimple'));

// 섹션별 모션 로더
const SectionLoaderDefault = () => <MotionLoader variant="ring" size="sm" />;
const SectionLoaderPolicy = () => (
  <MotionLoader variant="scan" message="정책소식 준비중" size="sm" />
);
const SectionLoaderTube = () => <MotionLoader variant="wave" message="인터뷰 준비중" size="sm" />;

/**
 * Home 컴포넌트
 *
 * @param {Array} initialPolicyNews - 서버에서 미리 가져온 정책소식 데이터
 * @param {Array} initialTubeVideos - 서버에서 미리 가져온 나라똔튜브 데이터
 */
function Home({ initialPolicyNews = [], initialTubeVideos = [] }) {
  // 2026-09-30 인덱스(/) 신설로 인트로(로딩영상)를 제거했다.
  // 인덱스의 "나라똔 바로가기"(/home)를 누르면 배경 영상이 깔린 메인 화면이 바로 나온다.
  useEffect(() => {
    document.body.classList.add('page-home');

    // 정책소식 데이터 미리 로드
    prefetchPolicyNews();

    return () => document.body.classList.remove('page-home');
  }, []);

  return (
    <>
        <div className="home-main-content">
          {/* 프로모션 팝업 배너 - 인트로 후 표시 (다중 팝업) */}
          <PopupBanner
            items={[
              {
                imageSrc:
                  'https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev/popup/popup-banner-fee-3percent.webp',
                href: '/consultation-request',
                alt: '정책자금 컨설팅 업계 최저 수수료 3%',
              },
              {
                imageSrc:
                  'https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev/popup/popup-broker-warning.webp',
                href: '/consultation-request',
                alt: '정책자금 불법 브로커 주의',
              },
            ]}
            popupId="promo-202601"
          />
          {/* 영상 배경 래퍼 */}
          <div className="home-hero-section">
            {/* 배경 영상 */}
            <div className="home-hero-section__background">
              <video
                autoPlay
                muted
                loop
                playsInline
                onError={(e) => {
                  console.error('메인 페이지 배경 영상 로드 실패:', e);
                  // 영상 로드 실패 시 대체 배경
                  const videoElement = e.target;
                  if (videoElement && videoElement.parentElement) {
                    videoElement.style.display = 'none';
                    videoElement.parentElement.style.background =
                      'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
                  }
                }}
                onLoadedData={() => {
                  console.log('✅ 메인 페이지 배경 영상 로드 성공');
                }}
              >
                <source src="/videos/Naraddon_main_2nd.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="home-hero-section__overlay"></div>
            </div>

            {/* 히어로 섹션 */}
            <HeroSection />
          </div>

          <Suspense fallback={<SectionLoaderDefault />}>
            <ScrollReveal>
              <TrustSection />
            </ScrollReveal>
          </Suspense>
          <Suspense fallback={null}>
            <ScrollReveal delay={0.1}>
              <ShortsSection />
            </ScrollReveal>
          </Suspense>
          <Suspense fallback={<SectionLoaderPolicy />}>
            <ScrollReveal>
              <PolicyThumbnails initialData={initialPolicyNews} />
            </ScrollReveal>
          </Suspense>
          <Suspense fallback={<SectionLoaderTube />}>
            <ScrollReveal>
              <NaraddonTube initialData={initialTubeVideos} />
            </ScrollReveal>
          </Suspense>
        </div>
    </>
  );
}

export default Home;
