import React, { useRef, useState, useEffect, useCallback } from 'react';
import MotionLoader from '@/components/loading/MotionLoader';
import './IntroVideo.css';

/**
 * 인트로 비디오 히어로 섹션
 *
 * @purpose 메인 페이지 진입 시 전체화면 영상 배경 + 자막 + CTA 버튼
 * @design 상태 2개만 존재: 로딩 중 / 재생 중. 에러 상태 없음.
 *   영상 로드 실패 시 자동 재시도하며, 사용자에게는 로딩만 보임.
 *   네트워크 순간 끊김에도 깨진 화면이 나오지 않는 구조.
 */
const IntroVideo = ({
  showStartButton,
  currentCaption,
  isCaptionVisible,
  showGreenOverlay,
  onStart,
  isExpanded,
  setIsExpanded,
}) => {
  if (!showStartButton) return null;

  const videoRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const MAX_RETRY = 10;
  const videoSrc = '/videos/Naraddon_main_2nd.mp4';

  /**
   * 영상 로드 실패 시 재시도
   * 지수 백오프: 1초 → 2초 → 4초 → ... 최대 30초 간격
   */
  const retryLoad = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRY) return;

    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
    retryCountRef.current += 1;

    retryTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;

      // source를 다시 설정하여 재시도
      video.src = videoSrc + '?retry=' + retryCountRef.current;
      video.load();
    }, delay);
  }, []);

  // 영상 재생 가능 상태가 되면 로딩 해제
  const handleCanPlay = useCallback(() => {
    setIsVideoReady(true);
    retryCountRef.current = 0; // 성공 시 카운트 리셋
  }, []);

  // 영상 에러 시 재시도 (에러 UI 없음)
  const handleError = useCallback(() => {
    retryLoad();
  }, [retryLoad]);

  // 클린업
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="intro-video-section">
      {/* 로딩 상태 - 영상 준비 전까지만 표시 (나라똔 브랜드 웨이브 애니메이션) */}
      {!isVideoReady && (
        <div className="video-loading-state">
          <MotionLoader variant="wave" size="lg" message="최적의 정책자금을 분석하고 있습니다" />
        </div>
      )}

      {/* 배경 영상 */}
      <div className="video-background" style={{ opacity: isVideoReady ? 1 : 0 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          onError={handleError}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className="video-overlay"></div>

        {showGreenOverlay && <div className="green-overlay"></div>}
      </div>

      {/* 자막 - 영상 준비 후에만 표시 */}
      {isVideoReady && (
        <div
          className={`video-caption ${currentCaption && isCaptionVisible ? 'visible' : 'hidden'}`}
        >
          {currentCaption && <div className="main-caption">{currentCaption}</div>}
        </div>
      )}

      {/* 시작 버튼 */}
      <div className="start-button-container">
        <button className="start-button" onClick={onStart}>
          <span className="button-text">나라똔과 함께하기</span>
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};

export default IntroVideo;
