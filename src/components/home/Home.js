'use client';

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import './Home.css';
import HeroSection from './components/HeroSection/index';
import IntroVideo from './components/IntroVideo';
import { captions } from './constants/captions';
import { prefetchPolicyNews } from '../../utils/prefetch';
import PopupBanner from '../common/PopupBanner';
import { MotionLoader, ScrollReveal } from '@/components/loading';

// 동적 임포트로 초기 로딩 속도 개선
const TrustSection = lazy(() => import('../TrustSection'));
const ShortsSection = lazy(() => import('../ShortsSection'));
const PolicyThumbnails = lazy(() => import('../PolicyThumbnails'));
const NaraddonTube = lazy(() => import('../NaraddonTube/NaraddonTubeSimple'));

const CAPTION_FADE_DURATION = 850;

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
  // 초기값은 false로 설정 (서버/클라이언트 일치)
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    document.body.classList.add('page-home');

    // 정책소식 데이터 미리 로드
    prefetchPolicyNews();

    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      // URL 파라미터 확인 (로고 클릭시 ?intro=true)
      const urlParams = new URLSearchParams(window.location.search);
      const shouldShowIntro = urlParams.get('intro') === 'true';

      // 세션 스토리지 확인 (최초 접속인지)
      const hasVisited = sessionStorage.getItem('hasVisited');

      // 인트로 표시 조건:
      // 1. 로고 클릭으로 접근 (?intro=true)
      // 2. 최초 방문 (!hasVisited)
      if (shouldShowIntro || !hasVisited) {
        setShowIntro(true);
        // 방문 기록 저장
        sessionStorage.setItem('hasVisited', 'true');
      }

      // URL 파라미터 정리 (깔끔한 URL 유지)
      if (shouldShowIntro) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    return () => document.body.classList.remove('page-home');
  }, []);
  const [showStartButton, setShowStartButton] = useState(true);
  const [showGreenOverlay, setShowGreenOverlay] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [isCaptionVisible, setIsCaptionVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const captionRef = useRef('');
  const fadeTimeoutRef = useRef(null);

  // 자막 업데이트 (무한 반복)
  useEffect(() => {
    if (!showIntro) return;

    const startTime = Date.now();
    const totalDuration = 30; // 전체 자막 길이 (30초)

    const updateCaption = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const loopedTime = elapsed % totalDuration; // 무한 반복을 위한 모듈로 연산

      // 디버깅: 30초마다 루프 확인
      if (Math.floor(elapsed / 30) !== Math.floor((elapsed - 0.1) / 30)) {
        console.log(`🔄 자막 루프 ${Math.floor(elapsed / 30) + 1}회차 시작`);
      }

      // 현재 시간에 맞는 자막 찾기
      const caption = captions.find((cap) => loopedTime >= cap.time && loopedTime < cap.endTime);

      if (caption) {
        if (caption.text !== captionRef.current) {
          // 새로운 자막으로 변경
          captionRef.current = caption.text;
          setIsCaptionVisible(false);

          if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
          }

          // 페이드인 효과
          fadeTimeoutRef.current = setTimeout(() => {
            setCurrentCaption(caption.text);
            setIsCaptionVisible(true);
            fadeTimeoutRef.current = null;
          }, CAPTION_FADE_DURATION);
        }
      } else {
        // 자막이 없는 구간 처리 (실제로는 발생하지 않아야 함)
        if (captionRef.current) {
          captionRef.current = '';
          setIsCaptionVisible(false);

          if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
          }

          fadeTimeoutRef.current = setTimeout(() => {
            setCurrentCaption('');
            fadeTimeoutRef.current = null;
          }, CAPTION_FADE_DURATION);
        }
      }
    };

    const intervalId = setInterval(updateCaption, 100);
    updateCaption(); // 초기 실행

    return () => {
      clearInterval(intervalId);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [showIntro]);

  const handleStart = useCallback(() => {
    setShowStartButton(false);
    setShowGreenOverlay(true);

    setTimeout(() => {
      setShowIntro(false);
      setShowGreenOverlay(false);
      setIsExpanded(false);
    }, 400);
  }, []);

  return (
    <>
      {showIntro ? (
        <IntroVideo
          showStartButton={showStartButton}
          showGreenOverlay={showGreenOverlay}
          onStart={handleStart}
          currentCaption={currentCaption}
          isCaptionVisible={isCaptionVisible}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
      ) : (
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
      )}
    </>
  );
}

export default Home;
