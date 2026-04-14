'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';

/**
 * Business Voice - 인터뷰 영상 그리드 (클라이언트 컴포넌트)
 *
 * @purpose 초기 3개만 표시, "전체보기" 클릭 시 전체 확장
 * @context Server Component에서 전달받은 영상 데이터 렌더링
 * @note 16:9 비율 유지, 클릭 시 YouTube 모달 재생
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
  initialLimit?: number;
}

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

export default function InterviewVideoGrid({ videos, initialLimit = 3 }: InterviewVideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  const handleImageLoad = useCallback((imageUrl: string) => {
    setLoadedImages((prev) => new Set([...prev, imageUrl]));
  }, []);

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

  const hasMore = videos.length > initialLimit;
  const displayVideos = isExpanded ? videos : videos.slice(0, initialLimit);

  return (
    <>
      <div className="interview-grid">
        {displayVideos.map((video, index) => {
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
              className="interview-grid-item"
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
                      objectPosition: 'center',
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

      {/* 전체보기 / 접기 버튼 */}
      {hasMore && (
        <div className="interview-view-all">
          <button className="interview-view-all-btn" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <>
                접기 <i className="fas fa-chevron-up"></i>
              </>
            ) : (
              <>
                나라똔 인터뷰 전체보기 ({videos.length}건) <i className="fas fa-chevron-down"></i>
              </>
            )}
          </button>
        </div>
      )}

      <VideoModal video={selectedVideo} isOpen={isVideoModalOpen} onClose={handleCloseVideoModal} />
    </>
  );
}
