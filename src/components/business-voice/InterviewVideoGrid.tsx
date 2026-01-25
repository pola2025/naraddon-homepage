'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * Business Voice - 인터뷰 영상 스와이프 캐러셀 (클라이언트 컴포넌트)
 *
 * @purpose gg24.kr 스타일의 좌우 스와이프 캐러셀 - 부드러운 미끄러짐 효과
 * @context Server Component에서 전달받은 영상 데이터 렌더링
 * @note 터치/드래그 스와이프 지원, 16:9 비율 유지, 호버 효과 없음
 */

interface InterviewVideo {
  _id: string;
  youtubeUrl: string;
  youtubeId?: string;
  displayThumbnail?: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  author?: string;
  company?: string;
  amount?: string;
  views?: number;
}

interface VideoModalProps {
  video: InterviewVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

interface InterviewVideoGridProps {
  videos: InterviewVideo[];
}

// 비디오 모달 컴포넌트
function VideoModal({ video, isOpen, onClose }: VideoModalProps) {
  if (!isOpen || !video) return null;

  const extractYoutubeId = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="video-modal-player">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <div className="video-modal-info">
          <h3>{video.title}</h3>
          {video.description && <p>{video.description}</p>}
          <div className="video-modal-meta">
            {video.author && <span>{video.author}</span>}
            {video.company && <span>{video.company}</span>}
            {video.amount && <span>{video.amount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewVideoGrid({ videos }: InterviewVideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // 화면 크기에 따른 표시 개수 결정
  const getVisibleCount = useCallback(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }, []);

  const [visibleCount, setVisibleCount] = useState(3);

  // 최대 인덱스 계산
  const maxIndex = Math.max(0, videos.length - visibleCount);

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount());
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getVisibleCount]);

  // 현재 인덱스가 최대값을 초과하지 않도록 조정
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  const handleImageLoad = useCallback((imageUrl: string) => {
    setLoadedImages(prev => new Set([...prev, imageUrl]));
  }, []);

  // 이전/다음 슬라이드 이동
  const goToSlide = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(newIndex);
  }, [maxIndex]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // 터치/마우스 이벤트 핸들러
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    setTranslateX(diff);
  }, [isDragging, startX]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50; // 스와이프 인식 임계값

    if (translateX > threshold && currentIndex > 0) {
      goToPrev();
    } else if (translateX < -threshold && currentIndex < maxIndex) {
      goToNext();
    }

    setTranslateX(0);
  }, [isDragging, translateX, currentIndex, maxIndex, goToPrev, goToNext]);

  // 터치 이벤트
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // 마우스 이벤트
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);

  const handleVideoClick = (video: InterviewVideo) => {
    // 드래그 중이면 클릭 무시
    if (Math.abs(translateX) > 5) return;
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setSelectedVideo(null);
    setIsVideoModalOpen(false);
  };

  if (videos.length === 0) {
    return <div className="empty-message">등록된 영상이 없습니다.</div>;
  }

  // 슬라이드 위치 계산 (gap 포함)
  const slideWidth = 100 / visibleCount;
  const gapPx = 20; // gap 픽셀
  const baseTransform = currentIndex * slideWidth;
  const dragTransform = translateX;

  return (
    <>
      <div className="interview-carousel-wrapper">
        {/* 이전 버튼 */}
        <button
          className={`carousel-arrow carousel-arrow-prev ${currentIndex === 0 ? 'disabled' : ''}`}
          onClick={goToPrev}
          disabled={currentIndex === 0}
          aria-label="이전 영상"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* 캐러셀 뷰포트 */}
        <div
          ref={sliderRef}
          className="interview-carousel-viewport"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* 캐러셀 트랙 */}
          <div
            ref={trackRef}
            className="interview-carousel-track"
            style={{
              transform: `translateX(calc(-${baseTransform}% + ${dragTransform}px))`,
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
              gap: `${gapPx}px`,
            }}
          >
            {videos.map((video, index) => {
              const extractYoutubeId = (url: string): string => {
                const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                return match ? match[1] : '';
              };
              const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
              const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
              const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;
              const isImageLoaded = loadedImages.has(thumbnailUrl);

              return (
                <div
                  key={video._id}
                  className="interview-carousel-slide"
                  style={{
                    flex: `0 0 calc(${slideWidth}% - ${gapPx * (visibleCount - 1) / visibleCount}px)`,
                  }}
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="carousel-video-card">
                    <div className="carousel-video-thumbnail">
                      {!isImageLoaded && (
                        <div className="thumbnail-skeleton">
                          <div className="skeleton-shimmer"></div>
                        </div>
                      )}

                      <Image
                        src={thumbnailUrl}
                        alt={video.title}
                        width={480}
                        height={270}
                        priority={index < 3}
                        style={{
                          opacity: isImageLoaded ? 1 : 0,
                          transition: 'opacity 0.3s ease-in-out',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                        onLoad={() => handleImageLoad(thumbnailUrl)}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target.src.includes('sddefault')) {
                            target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                          } else if (target.src.includes('mqdefault')) {
                            target.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                          }
                        }}
                        draggable={false}
                      />

                      {/* 재생 아이콘 - 항상 표시 */}
                      <div className="carousel-play-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="carousel-video-info">
                      <h3>{video.title}</h3>
                      {video.description && <p className="carousel-video-desc">{video.description}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 다음 버튼 */}
        <button
          className={`carousel-arrow carousel-arrow-next ${currentIndex >= maxIndex ? 'disabled' : ''}`}
          onClick={goToNext}
          disabled={currentIndex >= maxIndex}
          aria-label="다음 영상"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 인디케이터 (점) */}
      {videos.length > visibleCount && (
        <div className="carousel-indicators">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              className={`carousel-indicator ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
              aria-label={`${idx + 1}번째 슬라이드로 이동`}
            />
          ))}
        </div>
      )}

      <VideoModal
        video={selectedVideo}
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
      />
    </>
  );
}
