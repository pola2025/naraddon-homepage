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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchVideos();
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

    const visibleVids = videos.slice(currentIndex, currentIndex + 3);

    // Observe new cards
    cardRefs.current.forEach((element, cardId) => {
      if (visibleVids.some(video => video._id === cardId)) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      cardRefs.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
    };
  }, [videos, currentIndex]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      // 나라똔튜브 API 사용 - published 영상만 가져오기
      const response = await fetch('/api/naraddon-tube');
      const data = await response.json();

      if (data.entries && Array.isArray(data.entries)) {
        // NaraddonTubeEntry를 InterviewVideo 형식으로 변환
        const convertedVideos: InterviewVideo[] = data.entries.map((entry: NaraddonTubeEntry) => {
          const video = entry.videos[0]; // 항상 1개의 영상만 있음
          return {
            _id: entry._id,
            youtubeUrl: video.url,
            youtubeId: video.youtubeId,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.customThumbnail,
            displayThumbnail: video.customThumbnail || `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`,
          };
        });

        setVideos(convertedVideos);

        // 처음 3개 썸네일 미리 로드
        convertedVideos.slice(0, 3).forEach((video: InterviewVideo) => {
          if (video.youtubeId) {
            const img = new window.Image();
            img.src = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handlePrevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentIndex < Math.max(0, videos.length - 3)) {
      setCurrentIndex(currentIndex + 1);
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

  const visibleVideos = videos.slice(currentIndex, currentIndex + 3);

  // Preload next slide images - 성능 최적화
  const preloadNextSlideImages = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < Math.max(0, videos.length - 3)) {
      const nextVideos = videos.slice(nextIndex, nextIndex + 3);

      nextVideos.forEach((video) => {
        const extractYoutubeId = (url: string): string => {
          const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
          return match ? match[1] : '';
        };
        const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
        const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;

        if (!preloadedImages.has(thumbnailUrl)) {
          const img = new window.Image();
          img.src = thumbnailUrl;
          img.onload = () => {
            setPreloadedImages(prev => new Set([...prev, thumbnailUrl]));
          };
        }
      });
    }
  }, [currentIndex, videos, preloadedImages]);

  // Preload images when current index changes
  useEffect(() => {
    preloadNextSlideImages();
  }, [preloadNextSlideImages]);

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
        <p>현재 실무지원금을 받은 대표님들의 생생한 후기입니다.</p>
      </div>

      <div className="interview-videos-container">
        <div className="videos-slider">
          {videos.length > 3 && currentIndex > 0 && (
            <button className="slider-arrow arrow-left" onClick={handlePrevSlide}>
              ←
            </button>
          )}

          <div className="videos-grid">
            {isLoading ? (
              <div className="loading-message">영상을 불러오는 중…</div>
            ) : visibleVideos.length > 0 ? (
              visibleVideos.map((video) => {
                const extractYoutubeId = (url: string): string => {
                  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                  return match ? match[1] : '';
                };
                const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
                // mqdefault를 기본으로 사용 (320x180, 더 빠른 로딩)
                const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;

                const isVisible = visibleCards.has(video._id);
                const isImageLoaded = loadedImages.has(thumbnailUrl);
                const shouldLoadEagerly = currentIndex === 0; // Load first 3 eagerly

                return (
                  <div
                    key={video._id}
                    className="video-card"
                    onClick={() => handleVideoClick(video)}
                    ref={(el) => setCardRef(el, video._id)}
                    data-card-id={video._id}
                  >
                    <div className="video-thumbnail">
                      {/* Skeleton/blur placeholder */}
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
                          // mqdefault가 없으면 default로 폴백
                          if (target.src.includes('mqdefault')) {
                            target.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                          }
                        }}
                        unoptimized
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

          {videos.length > 3 && currentIndex < Math.max(0, videos.length - 3) && (
            <button className="slider-arrow arrow-right" onClick={handleNextSlide}>
              →
            </button>
          )}
        </div>

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