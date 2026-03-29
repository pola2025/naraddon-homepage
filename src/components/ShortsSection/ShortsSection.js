'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * 쇼츠 영상 모달 (createPortal로 document.body에 렌더링)
 * PC: 화면 전체 높이 사용, 9:16 비율
 * 모바일: 검정 배경 꽉 차게, 영상은 원본 비율 유지 (위아래 검정)
 */
function ShortsModal({ video, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="shorts-modal-backdrop" onClick={onClose}>
      <div className="shorts-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 닫기 버튼 */}
        <button type="button" className="shorts-modal-close" onClick={onClose}>
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
        {/* YouTube Shorts embed */}
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
          title={video.title}
          className="shorts-modal-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>,
    document.body
  );
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
  }, []);

  /** 모달 닫기 */
  const closeModal = useCallback(() => {
    setActiveVideo(null);
  }, []);

  if (loading || shorts.length === 0) return null;

  return (
    <section className="shorts-section">
      <div className="shorts-section-inner">
        {/* 헤더 */}
        <div className="shorts-header">
          <div className="shorts-header-left">
            <div className="shorts-heading">
              <span className="shorts-eyebrow">인증기업심사관이 전해드리는</span>
              <h2 className="shorts-title-text">짧게 보는 정책자금 뉴스</h2>
            </div>
          </div>
          <a href="/shorts" className="shorts-view-all">
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

      {/* 모달은 createPortal로 document.body에 렌더링 */}
      {activeVideo && <ShortsModal video={activeVideo} onClose={closeModal} />}
    </section>
  );
}

export default ShortsSection;
