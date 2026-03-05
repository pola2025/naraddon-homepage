'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import './search.css';

/**
 * 검색 결과 인터페이스
 */
interface SearchSection {
  title: string;
  anchor: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  matchedKeywords: string[];
  relevanceScore: number;
  sections?: SearchSection[];
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  query: string;
  total: number;
  error?: string;
}

/**
 * 검색 결과 컴포넌트
 *
 * @purpose 검색 결과를 카드 형태로 표시
 * @context useSearchParams 사용으로 Suspense 필요
 */
function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [searched, setSearched] = useState(false);

  /**
   * 검색 API 호출
   */
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data: SearchResponse = await response.json();

      if (data.success) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('검색 오류:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // URL 쿼리 파라미터 변경 시 검색 실행
  useEffect(() => {
    if (query) {
      setSearchInput(query);
      performSearch(query);
    }
  }, [query]);

  /**
   * 검색 폼 제출 핸들러
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  /**
   * 카테고리별 아이콘 매핑
   */
  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      '정책': 'fas fa-file-alt',
      '커뮤니티': 'fas fa-users',
      '미디어': 'fas fa-video',
      'AI 서비스': 'fas fa-robot',
      '상담': 'fas fa-headset',
      '서비스': 'fas fa-cogs',
      '뉴스': 'fas fa-newspaper',
    };
    return icons[category] || 'fas fa-file';
  };

  /**
   * 카테고리별 색상 클래스
   */
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      '정책': 'category-policy',
      '커뮤니티': 'category-community',
      '미디어': 'category-media',
      'AI 서비스': 'category-ai',
      '상담': 'category-consult',
      '서비스': 'category-service',
      '뉴스': 'category-news',
    };
    return colors[category] || 'category-default';
  };

  return (
    <div className="search-page">
      {/* 검색 헤더 */}
      <div className="search-header">
        <div className="search-header-content">
          <h1 className="search-page-title">사이트 검색</h1>
          <p className="search-page-subtitle">
            나라똔의 모든 서비스와 정보를 검색해보세요
          </p>

          {/* 검색 폼 */}
          <form onSubmit={handleSubmit} className="search-form">
            <div className="search-input-wrapper">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="정책자금, 인증심사, 전문가 상담 등 검색해보세요"
                className="search-input"
                aria-label="검색어 입력"
              />
              <button type="submit" className="search-submit-btn" aria-label="검색">
                검색
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 검색 결과 영역 */}
      <div className="search-results-container">
        {/* 검색 상태 표시 */}
        {query && (
          <div className="search-status">
            <span className="search-query-text">
              &quot;<strong>{query}</strong>&quot; 검색 결과
            </span>
            <span className="search-count">
              {loading ? '검색 중...' : `${results.length}개 발견`}
            </span>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>검색 중입니다...</p>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {!loading && searched && results.length === 0 && (
          <div className="search-empty">
            <i className="fas fa-search-minus"></i>
            <h3>검색 결과가 없습니다</h3>
            <p>다른 검색어를 시도해보세요</p>
            <div className="search-suggestions">
              <p>추천 검색어:</p>
              <div className="suggestion-tags">
                <button onClick={() => router.push('/search?q=정책자금')}>정책자금</button>
                <button onClick={() => router.push('/search?q=전문가')}>전문가</button>
                <button onClick={() => router.push('/search?q=상담')}>상담</button>
                <button onClick={() => router.push('/search?q=인증')}>인증</button>
              </div>
            </div>
          </div>
        )}

        {/* 초기 상태 (검색 전) */}
        {!loading && !searched && !query && (
          <div className="search-initial">
            <i className="fas fa-search"></i>
            <h3>무엇을 찾고 계신가요?</h3>
            <p>검색어를 입력하시면 관련 페이지를 찾아드립니다</p>
            <div className="popular-searches">
              <p>인기 검색어:</p>
              <div className="popular-tags">
                <button onClick={() => router.push('/search?q=정책자금')}>정책자금</button>
                <button onClick={() => router.push('/search?q=무료심사')}>무료심사</button>
                <button onClick={() => router.push('/search?q=전문가 상담')}>전문가 상담</button>
                <button onClick={() => router.push('/search?q=나라똔 인터뷰')}>나라똔 인터뷰</button>
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 목록 */}
        {!loading && results.length > 0 && (
          <div className="search-results-grid">
            {results.map((result) => (
              <Link
                key={result.id}
                href={result.path}
                className="search-result-card"
              >
                <div className="result-card-header">
                  <span className={`result-category ${getCategoryColor(result.category)}`}>
                    <i className={getCategoryIcon(result.category)}></i>
                    {result.category}
                  </span>
                </div>

                <h3 className="result-title">{result.title}</h3>
                <p className="result-description">{result.description}</p>

                {/* 매칭된 키워드 */}
                {result.matchedKeywords.length > 0 && (
                  <div className="result-keywords">
                    {result.matchedKeywords.map((keyword, idx) => (
                      <span key={idx} className="keyword-tag">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                {/* 관련 섹션 */}
                {result.sections && result.sections.length > 0 && (
                  <div className="result-sections">
                    <span className="sections-label">관련 섹션:</span>
                    {result.sections.slice(0, 3).map((section, idx) => (
                      <Link
                        key={idx}
                        href={`${result.path}${section.anchor}`}
                        className="section-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {section.title}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="result-action">
                  <span>자세히 보기</span>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 검색 페이지 메인 컴포넌트
 *
 * @purpose 사이트 내 검색 기능 제공
 * @context 메인 히어로 섹션 검색창에서 이동
 * @note useSearchParams 사용으로 Suspense로 감싸야 함
 */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="search-page">
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>로딩 중...</p>
          </div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
