'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { normalizePolicyNewsItem } from '@/hooks/usePolicyNews';
import { sanitizeImageUrl } from '@/utils/imageUrlSanitizer';
import './policy-news-list.css';

/**
 * 정책소식 전체보기 페이지
 *
 * @purpose 정책소식 전체 목록을 카드 형태로 표시
 * @context 3열 그리드, 무한스크롤, 카테고리 필터 지원
 */

// 카테고리 필터 탭 정의
const FILTER_TABS = [
  { id: 'all', label: '전체' },
  { id: '소상공인', label: '소상공인' },
  { id: '중소기업', label: '중소기업' },
  { id: '정부지원', label: '정부지원금' },
];

// 한 번에 로드할 게시물 수 (4줄 x 3열 = 12개)
const ITEMS_PER_PAGE = 12;

export default function PolicyNewsListPage() {
  const router = useRouter();
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 초기 데이터 로드
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/policy-news?limit=100', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('정책소식을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        const normalized = posts.map((post: any, index: number) =>
          normalizePolicyNewsItem(post, index)
        );

        setAllPosts(normalized);
      } catch (err) {
        console.error('[PolicyNewsList] Fetch error:', err);
        setError('정책소식을 불러오는 중 문제가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 필터 변경 시 게시물 필터링
  useEffect(() => {
    let filtered = allPosts;

    if (activeFilter !== 'all') {
      filtered = allPosts.filter((post) => {
        const category = post.category?.toLowerCase() || '';
        const title = post.title?.toLowerCase() || '';
        const tags = post.tags?.join(' ').toLowerCase() || '';
        const searchText = `${category} ${title} ${tags}`;

        // 필터 키워드 매칭
        if (activeFilter === '소상공인') {
          return searchText.includes('소상공인');
        }
        if (activeFilter === '중소기업') {
          return searchText.includes('중소기업') || searchText.includes('중소');
        }
        if (activeFilter === '정부지원') {
          return (
            searchText.includes('정부지원') ||
            searchText.includes('지원금') ||
            searchText.includes('정책자금')
          );
        }
        return true;
      });
    }

    setFilteredPosts(filtered);
    setDisplayedPosts(filtered.slice(0, ITEMS_PER_PAGE));
    setHasMore(filtered.length > ITEMS_PER_PAGE);
  }, [allPosts, activeFilter]);

  // 더 로드하기
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    setTimeout(() => {
      const currentLength = displayedPosts.length;
      const nextPosts = filteredPosts.slice(currentLength, currentLength + ITEMS_PER_PAGE);

      if (nextPosts.length > 0) {
        setDisplayedPosts((prev) => [...prev, ...nextPosts]);
      }

      setHasMore(currentLength + nextPosts.length < filteredPosts.length);
      setIsLoadingMore(false);
    }, 300);
  }, [displayedPosts, filteredPosts, hasMore, isLoadingMore]);

  // Intersection Observer로 무한 스크롤 구현
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadMore]);

  // 카드 클릭 핸들러
  const handleCardClick = (id: string) => {
    router.push(`/policy-news/${id}`);
  };

  // 필터 탭 변경
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
  };

  if (isLoading) {
    return (
      <div className="policy-news-list-page">
        <div className="policy-news-list-container">
          <div className="policy-news-list-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <span>정책소식을 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="policy-news-list-page">
        <div className="policy-news-list-container">
          <div className="policy-news-list-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => window.location.reload()}>다시 시도</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-news-list-page">
      <div className="policy-news-list-container">
        {/* 브레드크럼 */}
        <nav className="policy-news-breadcrumb" aria-label="브레드크럼">
          <ol>
            <li>
              <button onClick={() => router.push('/')}>
                <i className="fas fa-home"></i>
              </button>
            </li>
            <li className="separator">
              <i className="fas fa-chevron-right"></i>
            </li>
            <li>
              <button onClick={() => router.push('/policy-news')}>정책소식</button>
            </li>
            <li className="separator">
              <i className="fas fa-chevron-right"></i>
            </li>
            <li className="current">정책 알리미</li>
          </ol>
        </nav>

        {/* 헤더 */}
        <div className="policy-news-list-header">
          <h1 className="policy-news-list-title">
            <i className="fas fa-newspaper"></i> 정책 알리미
          </h1>
        </div>

        {/* 필터 탭 */}
        <div className="policy-news-filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => handleFilterChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 결과 카운트 */}
        <div className="policy-news-result-count">
          총 <strong>{filteredPosts.length}</strong>건의 정책소식
        </div>

        {/* 카드 그리드 */}
        {filteredPosts.length === 0 ? (
          <div className="policy-news-empty">
            <i className="fas fa-inbox"></i>
            <p>해당 카테고리의 정책소식이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="policy-news-card-grid">
              {displayedPosts.map((post) => (
                <article
                  key={post.id}
                  className="policy-news-card"
                  onClick={() => handleCardClick(post.id)}
                >
                  <div className="card-thumbnail">
                    <img
                      src={sanitizeImageUrl(post.thumbnail) || '/images/placeholder.png'}
                      alt={post.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.png';
                      }}
                    />
                    {post.isPinned && (
                      <span className="card-badge pinned">
                        <i className="fas fa-thumbtack"></i>
                      </span>
                    )}
                    {post.badge && <span className="card-badge info">{post.badge}</span>}
                  </div>
                  <div className="card-content">
                    <div className="card-category">{post.category || '정책정보'}</div>
                    <h3 className="card-title">{post.title}</h3>
                    {/* 요약(card-excerpt) · 태그(card-tags) · 메타 정보 모두 제거 — 2026-04-28 사용자 요청
                        목록 카드는 썸네일 + 카테고리 라벨 + 제목만 노출 */}
                  </div>
                </article>
              ))}
            </div>

            {/* 무한 스크롤 로딩 트리거 */}
            <div ref={loadMoreRef} className="policy-news-load-more">
              {isLoadingMore && (
                <div className="loading-indicator">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>더 불러오는 중...</span>
                </div>
              )}
              {!hasMore && displayedPosts.length > 0 && (
                <div className="no-more-posts">모든 정책소식을 확인했습니다.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
