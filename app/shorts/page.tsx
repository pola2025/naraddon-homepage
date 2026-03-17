'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

/**
 * 쇼츠 전체보기 페이지
 * 메인 페이지 쇼츠 섹션의 "전체보기" 링크 목적지
 * 모든 활성 쇼츠를 그리드로 보여주고 클릭 시 모달 재생
 */

interface ShortItem {
  _id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function ShortsModal({
  video,
  onClose,
}: {
  video: ShortItem & { videoId: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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
    <div className="shorts-page-backdrop" onClick={onClose}>
      <div className="shorts-page-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="shorts-page-close" onClick={onClose}>
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
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
          title={video.title}
          className="shorts-page-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>,
    document.body
  );
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<(ShortItem & { videoId: string }) | null>(null);

  useEffect(() => {
    fetch('/api/shorts')
      .then((res) => res.json())
      .then((data) => {
        setShorts(data.shorts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openModal = useCallback((item: ShortItem) => {
    const videoId = extractVideoId(item.youtubeUrl);
    if (!videoId) {
      window.open(item.youtubeUrl, '_blank');
      return;
    }
    setActiveVideo({ ...item, videoId });
  }, []);

  const closeModal = useCallback(() => {
    setActiveVideo(null);
  }, []);

  return (
    <>
      <style>{`
        .shorts-page {
          min-height: 100vh;
          background: #fff;
          padding: 40px 0 80px;
        }
        .shorts-page-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .shorts-page-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .shorts-page-nav a {
          color: #888;
          text-decoration: none;
        }
        .shorts-page-nav a:hover {
          color: #333;
        }
        .shorts-page-nav span {
          color: #ccc;
        }
        .shorts-page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px;
        }
        .shorts-page-subtitle {
          font-size: 15px;
          color: #888;
          margin: 0 0 32px;
        }
        .shorts-page-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .shorts-page-card {
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          transition: transform 0.2s;
        }
        .shorts-page-card:hover {
          transform: translateY(-4px);
        }
        .shorts-page-thumb {
          aspect-ratio: 9/16;
          position: relative;
          overflow: hidden;
          background: #e5e7eb;
          border-radius: 16px;
        }
        .shorts-page-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .shorts-page-thumb-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.15);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .shorts-page-card:hover .shorts-page-thumb-overlay {
          opacity: 1;
        }
        .shorts-page-card-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          margin: 8px 4px 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .shorts-page-empty {
          text-align: center;
          padding: 80px 0;
          color: #999;
          font-size: 16px;
        }
        .shorts-page-loading {
          text-align: center;
          padding: 80px 0;
          color: #999;
        }

        /* 모달 (메인 페이지와 동일) */
        .shorts-page-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .shorts-page-modal {
          position: relative;
          height: 100vh;
          aspect-ratio: 9/16;
        }
        .shorts-page-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #000;
        }
        .shorts-page-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.5);
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          opacity: 0.9;
          transition: opacity 0.2s;
          z-index: 1;
        }
        .shorts-page-close:hover {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .shorts-page {
            padding: 24px 0 60px;
          }
          .shorts-page-title {
            font-size: 22px;
          }
          .shorts-page-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
          }
          .shorts-page-backdrop {
            background: #000;
          }
          .shorts-page-modal {
            width: 100vw;
            height: 100vh;
            aspect-ratio: auto;
          }
          .shorts-page-iframe {
            object-fit: contain;
          }
          .shorts-page-close {
            top: 12px;
            right: 12px;
          }
        }
      `}</style>

      <div className="shorts-page">
        <div className="shorts-page-inner">
          <div className="shorts-page-nav">
            <Link href="/">홈</Link>
            <span>/</span>
            <span style={{ color: '#333' }}>쇼츠</span>
          </div>
          <h1 className="shorts-page-title">짧게 보는 정책자금 뉴스</h1>
          <p className="shorts-page-subtitle">1분 안에 핵심만 쏙쏙</p>

          {loading ? (
            <div className="shorts-page-loading">불러오는 중...</div>
          ) : shorts.length === 0 ? (
            <div className="shorts-page-empty">등록된 쇼츠가 없습니다.</div>
          ) : (
            <div className="shorts-page-grid">
              {shorts.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="shorts-page-card"
                  onClick={() => openModal(item)}
                >
                  <div className="shorts-page-thumb">
                    <img src={item.thumbnailUrl} alt={item.title} loading="lazy" />
                    <div className="shorts-page-thumb-overlay">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="shorts-page-card-title">{item.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeVideo && <ShortsModal video={activeVideo} onClose={closeModal} />}
    </>
  );
}
