'use client';

import React, { useState, useEffect } from 'react';
import './ShortsSection.css';

function ShortsSection() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shorts')
      .then((res) => res.json())
      .then((data) => {
        setShorts(data.shorts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
            <a
              key={item._id}
              href={item.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shorts-card"
            >
              <div className="shorts-thumb">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="shorts-thumb-img"
                  loading="lazy"
                />
                {/* 빨간 뱃지 제거 */}
                <div className="shorts-play-overlay">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ShortsSection;
