'use client';

import React, { useState, useEffect } from 'react';
import './NaraddonTubeSimple.css';

interface Video {
  youtubeId: string;
  title: string;
  customThumbnail?: string;
  url?: string;
}

interface TubeEntry {
  _id: string;
  videos: Video[]; // 1개만 포함
  isPublished?: boolean;
  sortOrder?: number;
}

const INITIAL_VIDEO_COUNT = 4; // 초기에 보여줄 비디오 개수

const NaraddonTubeSimple = () => {
  const [entries, setEntries] = useState<TubeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // 모든 비디오를 평탄화하여 배열로 만들기 (각 entry는 1개의 video만 포함)
  const allVideos = entries
    .filter(entry => entry.videos && entry.videos.length > 0)
    .map(entry => ({
      ...entry.videos[0], // 첫 번째 (유일한) 영상 사용
      entryId: entry._id
    }));

  // 표시할 비디오 결정
  const displayVideos = isExpanded ? allVideos : allVideos.slice(0, INITIAL_VIDEO_COUNT);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/naraddon-tube', { cache: 'no-store' });
        const data = await response.json();

        if (Array.isArray(data?.entries)) {
          setEntries(data.entries.filter((entry: TubeEntry) => entry.videos && entry.videos.length > 0));
        }
      } catch (error) {
        console.error('[NaraddonTubeSimple] fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleVideoClick = (youtubeId: string) => {
    setPlayingVideo(youtubeId);
  };

  const handleCloseVideo = () => {
    setPlayingVideo(null);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (loading) {
    return (
      <section className="tube-simple-section">
        <div className="tube-simple-container">
          <p className="tube-simple-loading">로딩 중...</p>
        </div>
      </section>
    );
  }

  if (allVideos.length === 0) {
    return null; // 비디오 없으면 섹션 숨김
  }

  return (
    <>
      <section className="tube-simple-section">
        <div className="tube-simple-container">
          <div className="tube-simple-header">
            <div className="tube-simple-heading">
              <span className="tube-simple-eyebrow">나라똔에서 전해드리는</span>
              <h2 className="tube-simple-title">나라똔 튜브</h2>
            </div>
            <p className="tube-simple-subtitle">
              영상으로 만나는 나라똔 정책자금 활용 케이스 및 대표님 인터뷰
            </p>
          </div>

          {/* 비디오 그리드 - 확장 여부에 따라 클래스 변경 */}
          <div className={`tube-simple-grid ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {displayVideos.map((video, index) => {
              // 커스텀 썸네일이 있으면 사용, 없으면 YouTube 썸네일
              const thumbnailUrl = video.customThumbnail ||
                                  `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;

              return (
                <div
                  key={`${video.youtubeId}-${index}`}
                  className="tube-simple-card"
                  onClick={() => handleVideoClick(video.youtubeId)}
                >
                  <div className="tube-simple-thumbnail">
                    <img
                      src={thumbnailUrl}
                      alt={video.title}
                      loading="lazy"
                    />
                    <div className="tube-simple-overlay">
                      <svg className="tube-simple-play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="tube-simple-info">
                    <h3 className="tube-simple-video-title">{video.title}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 더보기/접기 버튼 */}
          {allVideos.length > INITIAL_VIDEO_COUNT && (
            <div className="tube-simple-toggle">
              <button
                className="tube-simple-toggle-button"
                onClick={toggleExpand}
              >
                {isExpanded ? (
                  <>
                    <span>접기</span>
                    <svg className="tube-simple-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>나라똔 튜브 전체보기 ({allVideos.length}개)</span>
                    <svg className="tube-simple-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* YouTube 영상 재생 모달 - Business Voice 스타일 */}
      {playingVideo && (() => {
        const currentVideo = allVideos.find(v => v.youtubeId === playingVideo);
        return (
          <div className="video-modal-overlay" onClick={handleCloseVideo}>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="video-modal-close" onClick={handleCloseVideo}>
                ✕
              </button>
              <div className="video-modal-player">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`}
                  title={currentVideo?.title || "YouTube video player"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              {currentVideo && (
                <div className="video-modal-info">
                  <h3>{currentVideo.title}</h3>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default NaraddonTubeSimple;
