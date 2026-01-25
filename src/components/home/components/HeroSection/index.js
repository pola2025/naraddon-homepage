'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './HeroSection.css';

/**
 * HeroSection - 메인 히어로 섹션
 *
 * @purpose 사용자가 처음 보는 메인 화면의 핵심 영역
 * @context 검색 기능 제공, 무료심사신청/Q&A 버튼 제공
 * @note 검색어 입력 시 /search 페이지로 이동하여 결과 표시
 */
const HeroSection = () => {
  const router = useRouter();
  const [contentVisible, setContentVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * 검색 실행 핸들러
   * 검색어가 있으면 /search 페이지로 이동
   */
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery && !isSearching) {
      setIsSearching(true);
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  /**
   * 키보드 Enter 입력 처리
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className={`hero-section-container ${contentVisible ? 'visible' : ''}`}>
      <div className="hero-text-container">
        <h1 className="hero-main-title">
          기업이 살아야, 나라가 산다
          <span className="highlight">가장 믿음직한 동행, 나라똔이 함께합니다.</span>
        </h1>

        <div className="hero-action-wrapper">
          <div className="hero-buttons">
            <a href="/consultation-request#form-section" className="hero-btn hero-btn-primary">
              <i className="fas fa-comments"></i>
              <span>무료심사신청</span>
            </a>
            <a href="/consultation-request#qna-section" className="hero-btn hero-btn-secondary">
              <i className="fas fa-question-circle"></i>
              <span>사업필독서 100가지</span>
            </a>
          </div>

          <div className="hero-search-container">
            <div className="search-wrapper">
              <h2 className="search-title">무엇을 도와드릴까요?</h2>
              <form onSubmit={handleSearch} className="search-input-container">
                <input
                  type="text"
                  placeholder="정책자금, 인증심사, 전문가 상담 등 검색해보세요"
                  className="search-input-main"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  aria-label="사이트 내 검색"
                />
                <button
                  type="submit"
                  className={`search-button-main ${searchQuery.trim() ? 'active' : ''} ${isSearching ? 'loading' : ''}`}
                  aria-label="검색 실행"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <span className="search-spinner"></span>
                  ) : (
                    <i className="fas fa-search"></i>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

