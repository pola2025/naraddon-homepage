'use client';

import React, { useState, useEffect, useCallback } from 'react';
import './ShortsSection.css';

/**
 * YouTube URL에서 video ID를 추출하는 유틸
 * shorts, watch, youtu.be 등 다양한 형식 지원
 */
function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function ShortsSection() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    fetch('/api/shorts')
      .then((res) => res.json())
      .then((data) => {
        setShorts(data.shorts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /** 모달 열기 */
  const openModal = useCallback((item) => {
    const videoId = extractVideoId(item.youtubeUrl);
    if (!videoId) {
      window.open(item.youtubeUrl, '_blank');
      return;
    }
    setActiveVideo({ ...item, videoId });
    document.body.style.overflow = 'hidden';
  }, []);

  /** 모달 닫기 */
  const closeModal = useCallback(() => {
    setActiveVideo(null);
    document.body.style.overflow = '';
  }, []);

  /** ESC 키로 닫기 */
  useEffect(() => {
    if (!activeVideo) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeVideo, closeModal]);

  if (loading || shorts.length === 0) return null;

  return (
    <section className="shorts-section">
      <div className="shorts-section-inner">
        {/* 헤더 */}
        <div className="shorts-header">
          <div className="shorts-header-left">
            <div className="shorts-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
              </svg>
            </div>
            <div>
              <h2 className="shorts-title-text">짧게 보는 정책자금 뉴스</h2>
              <p className="shorts-subtitle">1분 안에 핵심만 쏙쏙</p>
            </div>
          </div>
          <a href="/policy-news" className="shorts-view-all">
            전체보기
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* 카드 스크롤 */}
        <div className="shorts-scroll">
          {shorts.map((item) => (
            <button
              key={item._id}
              type="button"
              className="shorts-card"
              onClick={() => openModal(item)}
            >
              <div className="shorts-thumb">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="shorts-thumb-img"
                  loading="lazy"
                />
                <div className="shorts-play-overlay">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 영상 재생 모달 */}
      {activeVideo && (
        <div className="shorts-modal-backdrop" onClick={closeModal}>
          <div className="shorts-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* 닫기 버튼 */}
            <button type="button" className="shorts-modal-close" onClick={closeModal}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            {/* YouTube Shorts embed (세로 비율) */}
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0`}
              title={activeVideo.title}
              className="shorts-modal-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default ShortsSection;
