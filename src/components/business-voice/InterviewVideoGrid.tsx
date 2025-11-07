'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * Business Voice - 인터뷰 영상 그리드 (클라이언트 컴포넌트)
 *
 * @purpose 인터랙티브 기능 담당 (모달, Intersection Observer)
 * @context Server Component에서 전달받은 영상 데이터 렌더링
 * @note 성능 최적화: Lazy loading, 이미지 preload, 스켈레톤
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
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Intersection Observer for lazy loading video cards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute('data-card-id');
            if (cardId) {
              setVisibleCards(prev => new Set([...prev, cardId]));
            }
          }
        });
      },
      {
        rootMargin: '200px',
        threshold: 0.01
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Update observer when videos change
  useEffect(() => {
    if (!observerRef.current) return;

    const displayCount = showAll ? videos.length : Math.min(6, videos.length);
    const displayVideos = videos.slice(0, displayCount);

    cardRefs.current.forEach((element, cardId) => {
      if (displayVideos.some(video => video._id === cardId)) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      cardRefs.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
    };
  }, [videos, showAll]);

  const handleImageLoad = useCallback((imageUrl: string) => {
    setLoadedImages(prev => new Set([...prev, imageUrl]));
  }, []);

  const setCardRef = useCallback((element: HTMLDivElement | null, cardId: string) => {
    if (element) {
      cardRefs.current.set(cardId, element);
    } else {
      cardRefs.current.delete(cardId);
    }
  }, []);

  const displayCount = showAll ? videos.length : Math.min(6, videos.length);
  const displayVideos = videos.slice(0, displayCount);

  const handleVideoClick = (video: InterviewVideo) => {
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

  return (
    <>
      <div className="videos-grid" style={{
        maxHeight: showAll ? 'none' : '800px',
        overflow: 'hidden',
        transition: 'max-height 0.5s ease-in-out'
      }}>
        {displayVideos.map((video, index) => {
          const extractYoutubeId = (url: string): string => {
            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
            return match ? match[1] : '';
          };
          const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
          const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
          const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;

          const isImageLoaded = loadedImages.has(thumbnailUrl);
          const shouldLoadEagerly = index < 6;

          return (
            <div
              key={video._id}
              className="video-card"
              onClick={() => handleVideoClick(video)}
              ref={(el) => setCardRef(el, video._id)}
              data-card-id={video._id}
              style={{
                animation: showAll && index >= 6 ? 'fadeInUp 0.3s ease-out' : 'none',
                animationDelay: showAll && index >= 6 ? `${(index - 6) * 0.05}s` : '0s',
                animationFillMode: 'both'
              }}
            >
              <div className="video-thumbnail">
                {!isImageLoaded && (
                  <div className="thumbnail-skeleton">
                    <div className="skeleton-shimmer"></div>
                  </div>
                )}

                <Image
                  src={thumbnailUrl}
                  alt={video.title}
                  width={320}
                  height={180}
                  priority={shouldLoadEagerly}
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
                />

                <div className="play-overlay">
                  <div className="play-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="video-info">
                <h3>{video.title}</h3>
                {video.description ? <p>{video.description}</p> : null}
                <div className="video-meta">
                  {video.author ? <span>{video.author}</span> : null}
                  {video.company ? <span>{video.company}</span> : null}
                  {video.amount ? <span>{video.amount}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {videos.length > 6 && (
        <div className="show-more-container">
          <button
            className="show-more-button"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? '접기 ▲' : '전체보기 ▼'}
          </button>
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
