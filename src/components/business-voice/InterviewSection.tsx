'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import './interview-admin-board.css';

interface NaraddonTubeVideo {
  title: string;
  description?: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

interface NaraddonTubeEntry {
  _id: string;
  videos: NaraddonTubeVideo[];
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export default function InterviewSection() {
  const [videos, setVideos] = useState<InterviewVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    // YouTube 썸네일 CDN preconnect로 이미지 로딩 속도 향상
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://img.youtube.com';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    fetchVideos();

    return () => {
      // cleanup: 안전하게 제거
      try {
        if (link.parentNode === document.head) {
          document.head.removeChild(link);
        }
      } catch (e) {
        // 이미 제거됨 - 무시
      }
    };
  }, []);

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
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01 // Load as soon as element starts appearing
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

    // Observe new cards
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

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const CACHE_KEY = 'naraddon-tube-videos';
      const CACHE_DURATION = 5 * 60 * 1000; // 5분

      // localStorage 캐시 확인 (SSR 안전)
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > CACHE_DURATION;

            if (!isExpired && data?.entries && Array.isArray(data.entries)) {
              // 캐시된 데이터 사용 (즉시 표시)
              const convertedVideos: InterviewVideo[] = data.entries.map((entry: NaraddonTubeEntry) => {
                const video = entry.videos[0];
                return {
                  _id: entry._id,
                  youtubeUrl: video.url,
                  youtubeId: video.youtubeId,
                  title: video.title,
                  description: video.description,
                  thumbnailUrl: video.customThumbnail,
                  displayThumbnail: video.customThumbnail || `https://img.youtube.com/vi/${video.youtubeId}/sddefault.jpg`,
                };
              });
              setVideos(convertedVideos);
              setIsLoading(false);

              // 백그라운드에서 최신 데이터 fetch (캐시 갱신)
              fetch('/api/naraddon-tube')
                .then(res => res.json())
                .then(freshData => {
                  if (freshData?.entries) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                      data: freshData,
                      timestamp: Date.now()
                    }));
                  }
                })
                .catch(() => {/* 실패해도 캐시 데이터 유지 */});
              return;
            }
          }
        } catch (e) {
          // 캐시 파싱 실패 시 무시하고 계속
          console.warn('Cache parse error:', e);
        }
      }

      // 캐시 없음 또는 만료됨 - API 호출
      const response = await fetch('/api/naraddon-tube');
      const data = await response.json();

      if (data.entries && Array.isArray(data.entries)) {
        // localStorage에 캐싱 (클라이언트에서만)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          } catch (e) {
            // localStorage 용량 초과 등의 에러 무시
            console.warn('localStorage save error:', e);
          }
        }

        // NaraddonTubeEntry를 InterviewVideo 형식으로 변환
        const convertedVideos: InterviewVideo[] = data.entries.map((entry: NaraddonTubeEntry) => {
          const video = entry.videos[0];
          return {
            _id: entry._id,
            youtubeUrl: video.url,
            youtubeId: video.youtubeId,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.customThumbnail,
            displayThumbnail: video.customThumbnail || `https://img.youtube.com/vi/${video.youtubeId}/sddefault.jpg`,
          };
        });

        setVideos(convertedVideos);

        // 처음 6개 썸네일 미리 로드 (개선됨: 3개 → 6개)
        convertedVideos.slice(0, 6).forEach((video: InterviewVideo) => {
          if (video.youtubeId) {
            const img = new window.Image();
            img.src = `https://img.youtube.com/vi/${video.youtubeId}/sddefault.jpg`;
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image load state
  const handleImageLoad = useCallback((imageUrl: string) => {
    setLoadedImages(prev => new Set([...prev, imageUrl]));
  }, []);

  // Set card ref for intersection observer
  const setCardRef = useCallback((element: HTMLDivElement | null, cardId: string) => {
    if (element) {
      cardRefs.current.set(cardId, element);
    } else {
      cardRefs.current.delete(cardId);
    }
  }, []);

  // 표시할 비디오 개수 결정
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

  return (
    <section id="interview-section" className="interview-section-new">
      <div className="section-header">
        <h2>나라똔과 함께한 대표님 인터뷰</h2>
        <p>인증 기업심사관과 함께한 대표님들의 생생한 후기입니다.</p>
      </div>

      <div className="interview-videos-container">
        <div className="videos-grid" style={{
          maxHeight: showAll ? 'none' : '800px',
          overflow: 'hidden',
          transition: 'max-height 0.5s ease-in-out'
        }}>
          {isLoading ? (
            <div className="loading-message">영상을 불러오는 중…</div>
          ) : displayVideos.length > 0 ? (
            displayVideos.map((video, index) => {
              const extractYoutubeId = (url: string): string => {
                const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                return match ? match[1] : '';
              };
              const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
              // sddefault.jpg (640x480) - 품질과 성능의 균형
              const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
              const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;

              const isImageLoaded = loadedImages.has(thumbnailUrl);
              const shouldLoadEagerly = index < 6; // Load first 6 eagerly

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
                        // sddefault가 없으면 mqdefault로 폴백
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
            })
          ) : (
            <div className="empty-message">등록된 영상이 없습니다.</div>
          )}
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
      </div>

      {/* 비디오 모달 */}
      <VideoModal
        video={selectedVideo}
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
      />
    </section>
  );
}