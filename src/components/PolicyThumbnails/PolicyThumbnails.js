import React, { useMemo } from 'react';
import Link from 'next/link';
import usePolicyNews from '@/hooks/usePolicyNews';
import './PolicyThumbnails.css';

const badgeClassMap = {
  NEW: 'new',
  HOT: 'hot',
  추천: 'recommend',
  중요: 'important',
};

const categoryIconMap = {
  funding: '💰',
  support: '🤝',
  startup: '🚀',
  rnd: '🔬',
  policy: '📑',
};

const categoryLabelMap = {
  funding: '정책자금',
  support: '지원사업',
  startup: '창업지원',
  rnd: 'R&D',
  policy: '정책해설',
  정부지원: '정부지원',
  지역정책: '지역정책',
  중소기업: '중소기업',
  기타: '기타',
};

/**
 * PolicyThumbnails 컴포넌트
 *
 * @param {Array} initialData - 서버에서 미리 가져온 정책소식 데이터 (optional)
 * @note initialData가 있으면 API 호출 스킵, 없으면 클라이언트에서 fetch
 */
const PolicyThumbnails = ({ initialData }) => {
  const { items, isLoading, error, refetch } = usePolicyNews({
    limit: 8,
    initialData, // 서버 데이터 전달
  });
  const thumbnails = useMemo(() => items.slice(0, 8), [items]);

  const renderGrid = () => {
    if (isLoading && thumbnails.length === 0) {
      return (
        <div className="thumbnails-grid desktop-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="thumbnail-item skeleton-item">
              <div className="thumbnail-image-wrapper skeleton-image">
                <div className="skeleton-shimmer" />
              </div>
              <div className="thumbnail-info">
                <div className="skeleton-tag" />
                <div className="skeleton-title" />
                <div className="skeleton-meta" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error && thumbnails.length === 0) {
      return (
        <div className="thumbnails-status thumbnails-status--error">
          <p>{error}</p>
          <button type="button" className="thumbnails-status__retry" onClick={() => refetch()}>
            다시 시도하기
          </button>
        </div>
      );
    }

    if (thumbnails.length === 0) {
      return (
        <div className="thumbnails-status">
          <p>표시할 정책 소식이 없습니다.</p>
        </div>
      );
    }

    // 화면 크기 체크를 위한 미디어 쿼리
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    return (
      <>
        {/* 데스크톱 그리드 뷰 */}
        <div className="thumbnails-grid desktop-grid">
          {thumbnails.slice(0, 4).map((item) => (
            <Link key={item.id} href={`/policy-news/${item.id}`} className="thumbnail-item">
              <div className="thumbnail-image-wrapper">
                <img src={item.thumbnail} alt={item.title} className="thumbnail-image" />
                {item.isPinned ? (
                  <div className="pinned-badge">
                    <i className="fas fa-thumbtack" />
                  </div>
                ) : null}
                {item.badge ? (
                  <div
                    className={`thumbnail-badge badge-${badgeClassMap[item.badge] || 'default'}`}
                  >
                    {item.badge}
                  </div>
                ) : null}
                <div className="thumbnail-overlay">
                  <p className="overlay-description">{item.description || item.excerpt}</p>
                  <span className="read-more">자세히 보기 →</span>
                </div>
              </div>

              <div className="thumbnail-info">
                <div className="category-tag" data-category={item.category}>
                  <span className="category-icon">{categoryIconMap[item.category] || '📌'}</span>
                  <span className="category-name">
                    {categoryLabelMap[item.category] || item.category}
                  </span>
                </div>

                <h3 className="thumbnail-title">{item.title}</h3>

                {/* 메타 정보(날짜, 조회수) 숨김 - 2026-01-26 */}
              </div>
            </Link>
          ))}
        </div>

        {/* 모바일 썸네일 슬라이드 뷰 */}
        <div className="mobile-thumbnails-container">
          <button
            className="mobile-slider-arrow mobile-slider-arrow-left"
            onClick={() => {
              const slider = document.querySelector('.mobile-thumbnails-slider');
              if (slider) {
                slider.scrollBy({ left: -300, behavior: 'smooth' });
              }
            }}
            aria-label="이전"
          >
            <i className="fas fa-chevron-left" />
          </button>
          <div className="mobile-thumbnails-slider">
            {thumbnails.map((item) => (
              <Link
                key={item.id}
                href={`/policy-news/${item.id}`}
                className="mobile-thumbnail-item"
              >
                <div className="mobile-thumbnail-image-wrapper">
                  <img src={item.thumbnail} alt={item.title} className="mobile-thumbnail-image" />
                  {item.isPinned ? (
                    <div className="pinned-badge">
                      <i className="fas fa-thumbtack" />
                    </div>
                  ) : null}
                  {item.badge ? (
                    <div
                      className={`thumbnail-badge badge-${badgeClassMap[item.badge] || 'default'}`}
                    >
                      {item.badge}
                    </div>
                  ) : null}
                </div>
                <div className="mobile-thumbnail-info">
                  <div className="mobile-category-tag" data-category={item.category}>
                    <span className="category-icon">{categoryIconMap[item.category] || '📌'}</span>
                    <span className="category-name">
                      {categoryLabelMap[item.category] || item.category}
                    </span>
                  </div>
                  <h3 className="mobile-thumbnail-title">{item.title}</h3>
                  {/* 메타 정보(날짜) 숨김 - 2026-01-26 */}
                </div>
              </Link>
            ))}
          </div>
          <button
            className="mobile-slider-arrow mobile-slider-arrow-right"
            onClick={() => {
              const slider = document.querySelector('.mobile-thumbnails-slider');
              if (slider) {
                slider.scrollBy({ left: 300, behavior: 'smooth' });
              }
            }}
            aria-label="다음"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </>
    );
  };

  return (
    <section className="policy-thumbnails-section">
      <div className="container">
        <div className="thumbnails-header">
          <div className="thumbnails-heading">
            <span className="thumbnails-eyebrow">나라똔에서 전해드리는</span>
            <h3 className="thumbnails-title">정책 알리미</h3>
          </div>
          <Link href="/policy-news" className="thumbnails-action">
            <span>전체보기</span>
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>

        {renderGrid()}

        <div className="thumbnails-footer" />
      </div>
    </section>
  );
};

export default PolicyThumbnails;
