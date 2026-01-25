'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiCheckCircle } from 'react-icons/fi';
import PolicyNewsSection from '../PolicyNewsSection/PolicyNewsSection';

const categories = [
  { id: 'all', name: '전체', icon: 'fas fa-th' },
  { id: 'government', name: '정부지원정책', icon: 'fas fa-landmark' },
  { id: 'support', name: '창업·경영지원', icon: 'fas fa-hand-holding-usd' },
  { id: 'manufacturing', name: '제조혁신', icon: 'fas fa-industry' },
  { id: 'other', name: '기타정책', icon: 'fas fa-ellipsis-h' },
];

const fallbackThumbnails = {
  government: [
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
  ],
  support: [
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&q=80',
    'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&q=80',
    'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=800&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80',
  ],
  manufacturing: [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
    'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  ],
  other: [
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  ],
};

const CATEGORY_KEYS = ['government', 'support', 'manufacturing', 'other'];

const stripHtml = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const formatDate = (value) => {
  if (!value) {
    return '게시일 미확인';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '게시일 미확인';
  }
  return date.toLocaleDateString('ko-KR');
};

const estimateReadTime = (content) => {
  const plain = stripHtml(content);
  if (!plain) {
    return 5;
  }
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const normalizeTags = (tags) =>
  Array.isArray(tags)
    ? tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
    : [];

const normalizeCategory = (value) => {
  if (!value) {
    return 'other';
  }
  const trimmed = value.toString().trim();
  const lower = trimmed.toLowerCase();
  if (CATEGORY_KEYS.includes(lower)) {
    return lower;
  }
  if (lower.startsWith('gov') || lower.includes('정부')) {
    return 'government';
  }
  if (lower.startsWith('supp') || lower.includes('지원')) {
    return 'support';
  }
  if (lower.startsWith('manu') || lower.includes('제조')) {
    return 'manufacturing';
  }
  return 'other';
};

const getFallbackThumbnail = (category, index = 0) => {
  const pool = fallbackThumbnails[category] || fallbackThumbnails.other;
  if (!pool || pool.length === 0) {
    return '';
  }
  return pool[index % pool.length];
};

const normalizePost = (rawPost, index) => {
  const normalizedCategory = normalizeCategory(rawPost?.category);
  const categoryMeta =
    categories.find((item) => item.id === normalizedCategory) ||
    categories.find((item) => item.id === 'other');

  const plainExcerpt = stripHtml(rawPost?.excerpt);
  const plainContent = stripHtml(rawPost?.content);
  const baseExcerpt = plainExcerpt || plainContent;
  const excerpt =
    baseExcerpt && baseExcerpt.length > 0
      ? baseExcerpt.length > 160
        ? `${baseExcerpt.slice(0, 160).trim()}...`
        : baseExcerpt
      : '상세 내용을 확인해 주세요.';

  const createdAtValue = rawPost?.createdAt ?? rawPost?.updatedAt ?? null;
  const createdAtTimestamp = createdAtValue ? new Date(createdAtValue).getTime() : null;

  const authorName =
    typeof rawPost?.examiner?.name === 'string' && rawPost.examiner.name.trim().length > 0
      ? rawPost.examiner.name.trim()
      : '정책 전문가';

  const authorCompany =
    typeof rawPost?.examiner?.companyName === 'string' &&
    rawPost.examiner.companyName.trim().length > 0
      ? rawPost.examiner.companyName.trim()
      : '정책분석센터';

  const title =
    typeof rawPost?.title === 'string' && rawPost.title.trim().length > 0
      ? rawPost.title.trim()
      : '정책분석 자료';

  const thumbnail =
    typeof rawPost?.thumbnail === 'string' && rawPost.thumbnail.trim().length > 0
      ? rawPost.thumbnail.trim()
      : getFallbackThumbnail(normalizedCategory, index);

  const tags = normalizeTags(rawPost?.tags);
  const readTime = estimateReadTime(rawPost?.content);

  const searchSource = [title, excerpt, authorName, authorCompany, tags.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    id: String(rawPost?._id ?? rawPost?.id ?? index),
    title,
    excerpt,
    content: rawPost?.content ?? '',
    thumbnail,
    author: authorName,
    authorTitle: authorCompany,
    date: formatDate(createdAtValue),
    category: normalizedCategory,
    categoryLabel: categoryMeta?.name ?? '기타정책',
    tags,
    views: typeof rawPost?.views === 'number' ? rawPost.views : 0,
    likes: typeof rawPost?.likes === 'number' ? rawPost.likes : 0,
    comments: typeof rawPost?.comments === 'number' ? rawPost.comments : 0,
    readTime,
    createdAtTimestamp,
    searchText: searchSource,
  };
};

const PolicyAnalysis = ({ showPolicyNews = true }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  // const [searchTerm, setSearchTerm] = useState(''); // 검색 기능 제거
  const [visiblePosts, setVisiblePosts] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showWritePasswordModal, setShowWritePasswordModal] = useState(false);
  const [writePassword, setWritePassword] = useState('');
  const [writePasswordError, setWritePasswordError] = useState('');
  const [isVerifyingWritePassword, setIsVerifyingWritePassword] = useState(false);
  const [isWriteAuthorized, setIsWriteAuthorized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /**
   * 세션 기반 권한 체크
   *
   * @purpose examiner, admin, super_admin role은 비밀번호 없이 작성 가능
   * @context 로그인한 사용자의 role을 확인하여 자동 인증
   */
  useEffect(() => {
    if (status === 'loading') return;

    // 세션에 examiner, admin, super_admin role이 있으면 자동 인증
    if (session && session.user) {
      const userRole = session.user.role;
      if (userRole === 'examiner' || userRole === 'admin' || userRole === 'super_admin') {
        setIsWriteAuthorized(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('policyAnalysisAuthorized', 'true');
        }
        console.log('[PolicyAnalysis] Auto-authorized via session:', userRole);
        return;
      }
    }

    // 세션 인증 실패 시 기존 로직 (비밀번호 방식) 사용
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('policyAnalysisAuthorized') === 'true') {
        setIsWriteAuthorized(true);
      }
    }

    const checkExistingAccess = async () => {
      try {
        const response = await fetch('/api/policy-analysis/access', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const data = await response.json().catch(() => null);
        if (data?.authorized) {
          setIsWriteAuthorized(true);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('policyAnalysisAuthorized', 'true');
          }
        }
      } catch (error) {
        console.warn('[PolicyAnalysis] access check error', error);
      }
    };

    void checkExistingAccess();
  }, [session, status]);

  useEffect(() => {
    // body에 클래스 추가 제거 - 높이 문제 해결
    // document.body.classList.add('page-policy-analysis');

    // 모바일 감지
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadPosts = async () => {
      setIsLoading(true);
      setFetchError('');

      try {
        // limit와 fields 파라미터 추가 (성능 최적화)
        const response = await fetch('/api/policy-analysis?sort=views&limit=20&fields=minimal', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('정책분석 글을 불러오지 못했습니다.');
        }

        const payload = await response.json();
        const normalized = Array.isArray(payload?.posts)
          ? payload.posts.map((item, index) => normalizePost(item, index))
          : [];

        if (isMounted) {
          setPosts(normalized);
        }
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('[PolicyAnalysis] fetch error', error);
        if (isMounted) {
          setPosts([]);
          setFetchError('정책분석 글을 불러오는 동안 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
      controller.abort();
      // body 클래스 제거 - 주석처리
      // document.body.classList.remove('page-policy-analysis');
    };
  }, []);

  useEffect(() => {
    if (posts.length === 0) {
      setTopPosts([]);
      return;
    }

    const sorted = [...posts].sort((a, b) => {
      if (b.views !== a.views) {
        return b.views - a.views;
      }
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      const timeA = a.createdAtTimestamp ?? 0;
      const timeB = b.createdAtTimestamp ?? 0;
      return timeB - timeA;
    });

    setTopPosts(sorted.slice(0, 7));
  }, [posts]);

  useEffect(() => {
    const limit = Math.min(5, topPosts.length);
    if (currentTopIndex >= limit && limit > 0) {
      setCurrentTopIndex(0);
    }
  }, [topPosts, currentTopIndex]);

  useEffect(() => {
    const limit = Math.min(5, topPosts.length);
    if (limit < 2) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentTopIndex((prev) => ((prev + 1) % limit));
    }, 5000);

    return () => clearInterval(timer);
  }, [topPosts]);

  useEffect(() => {
    setVisiblePosts(5);
  }, [posts.length]);

  // 해시 기반 스크롤 처리 (데이터 로딩 완료 후)
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;

    // 데이터 로딩 완료 후 해시 확인 및 스크롤
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 800); // 800ms 지연으로 DOM 렌더링 충분히 대기
    }
  }, [isLoading, posts.length]);

  // 같은 페이지 내 해시 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // 검색 기능 제거로 인한 useEffect 제거
  // useEffect(() => {
  //   setVisiblePosts(5);
  // }, [searchTerm]);

  // 검색 기능 제거 - 모든 posts를 표시
  const filteredPosts = posts;

  const mainTopPosts = useMemo(() => topPosts.slice(0, 5), [topPosts]);
  const indicatorCount = mainTopPosts.length;
  const canNavigateTopPosts = indicatorCount > 1;

  const sliderTouchRef = useRef({ startX: 0, endX: 0 });

  const handlePrevTop = () => {
    if (!canNavigateTopPosts) {
      return;
    }
    setCurrentTopIndex((prev) => (prev - 1 + indicatorCount) % indicatorCount);
  };

  const handleNextTop = () => {
    if (!canNavigateTopPosts) {
      return;
    }
    setCurrentTopIndex((prev) => (prev + 1) % indicatorCount);
  };

  const handleSliderTouchStart = (event) => {
    if (!canNavigateTopPosts || !event.touches?.length) {
      return;
    }
    const { clientX } = event.touches[0];
    sliderTouchRef.current = { startX: clientX, endX: clientX };
  };

  const handleSliderTouchMove = (event) => {
    if (!canNavigateTopPosts || !event.touches?.length) {
      return;
    }
    const { clientX } = event.touches[0];
    sliderTouchRef.current = {
      ...sliderTouchRef.current,
      endX: clientX,
    };
  };

  const handleSliderTouchEnd = () => {
    if (!canNavigateTopPosts) {
      sliderTouchRef.current = { startX: 0, endX: 0 };
      return;
    }

    const { startX, endX } = sliderTouchRef.current;
    if (!startX || !endX) {
      sliderTouchRef.current = { startX: 0, endX: 0 };
      return;
    }

    const deltaX = startX - endX;
    const swipeThreshold = 40;

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        handleNextTop();
      } else {
        handlePrevTop();
      }
    }

    sliderTouchRef.current = { startX: 0, endX: 0 };
  };

  const handleSliderKeyDown = (event) => {
    if (!canNavigateTopPosts) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handlePrevTop();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleNextTop();
    }
  };

  const closeWritePasswordModal = () => {
    if (isVerifyingWritePassword) {
      return;
    }

    setShowWritePasswordModal(false);
    setWritePassword('');
    setWritePasswordError('');
  };

  const handleWritePasswordSubmit = async (event) => {
    event.preventDefault();
    const trimmed = writePassword.trim();

    if (!trimmed) {
      setWritePasswordError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsVerifyingWritePassword(true);
      setWritePasswordError('');

      const response = await fetch('/api/policy-analysis/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || '비밀번호 확인에 실패했습니다.');
      }

      setIsWriteAuthorized(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('policyAnalysisAuthorized', 'true');
      }

      setShowWritePasswordModal(false);
      setWritePassword('');
      setWritePasswordError('');
      router.push('/policy-analysis/write');
    } catch (error) {
      setWritePasswordError(
        error instanceof Error ? error.message : '비밀번호 확인 중 문제가 발생했습니다.',
      );
    } finally {
      setIsVerifyingWritePassword(false);
    }
  };

  const handleViewPost = (postId) => {
    router.push(`/policy-analysis/${postId}`);
  };

  const handleLoadMore = () => {
    setVisiblePosts((prev) => Math.min(prev + 5, filteredPosts.length));
  };

  const handleWriteClick = () => {
    if (isWriteAuthorized) {
      router.push('/policy-analysis/write');
      return;
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem('policyAnalysisAuthorized') === 'true') {
      setIsWriteAuthorized(true);
      router.push('/policy-analysis/write');
      return;
    }

    setWritePassword('');
    setWritePasswordError('');
    setShowWritePasswordModal(true);
  };


  return (
    <div className="policy-analysis-container">
      {showPolicyNews && (
        <section id="policy-news" className="policy-analysis__news-section">
          <PolicyNewsSection />
        </section>
      )}

      {/* 정책분석 섹션 임시 숨김 처리 */}
      <div id="policy-analysis" className="main-content" style={{ display: 'none' }}>
        <div className="top-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-crown"></i> Best 정책분석 게시글
            </h2>
          </div>

          {isLoading && posts.length === 0 ? (
            <div className="policy-analysis__feedback policy-analysis__feedback--loading">
              <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
              <span>정책분석 글을 불러오는 중입니다...</span>
            </div>
          ) : mainTopPosts.length === 0 ? (
            <div className="policy-analysis__feedback policy-analysis__feedback--empty">
              <i className="fas fa-info-circle" aria-hidden="true"></i>
              <span>표시할 인기 정책분석 글이 없습니다.</span>
            </div>
          ) : (
            <>
              <div
                className="analysis-main-rolling"
                role="group"
                aria-label="정책분석 상위 게시글 슬라이더"
                tabIndex={0}
                onKeyDown={handleSliderKeyDown}
                onTouchStart={handleSliderTouchStart}
                onTouchMove={handleSliderTouchMove}
                onTouchEnd={handleSliderTouchEnd}
              >
                {mainTopPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className={`analysis-main-item ${index === currentTopIndex ? 'active' : ''}`}
                    role="button"
                    tabIndex={index === currentTopIndex ? 0 : -1}
                    aria-hidden={index !== currentTopIndex}
                    aria-label={`${post.title} 상세 보기`}
                    onClick={() => handleViewPost(post.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleViewPost(post.id);
                      }
                    }}
                  >
                    <div className="analysis-image">
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackThumbnail(post.categoryId, index);
                        }}
                        loading="lazy"
                      />
                      <span className="ranking-badge">TOP {index + 1}</span>
                    </div>
                    <div className="analysis-content">
                      <div className="analysis-meta">
                        <span className="category-badge">{post.categoryLabel}</span>
                        <span className="date">{post.date}</span>
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>
                      <div className="analysis-author-info">
                        <FiCheckCircle style={{ color: '#3b82f6', fontSize: '1rem' }} />
                        <span className="author-name">{post.author}</span>
                        <span className="author-company">{post.authorTitle}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {canNavigateTopPosts && (
                  <>
                    <button
                      type="button"
                      className="analysis-main-control analysis-main-control--prev"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePrevTop();
                      }}
                      aria-label="이전 인기 정책분석 보기"
                    >
                      <i className="fas fa-chevron-left" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      className="analysis-main-control analysis-main-control--next"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleNextTop();
                      }}
                      aria-label="다음 인기 정책분석 보기"
                    >
                      <i className="fas fa-chevron-right" aria-hidden="true"></i>
                    </button>
                  </>
                )}

                {canNavigateTopPosts && (
                  <div className="analysis-indicators">
                    {Array.from({ length: indicatorCount }).map((_, index) => (
                      <button
                        key={`indicator-${index}`}
                        type="button"
                        className={`indicator ${index === currentTopIndex ? 'active' : ''}`}
                        onClick={() => setCurrentTopIndex(index)}
                        aria-label={`TOP ${index + 1} 게시글 보기`}
                        aria-current={index === currentTopIndex ? 'true' : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 모바일에서 스와이프 안내 */}
              {isMobile && (
                <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '20px' }}>
                  <span style={{
                    fontSize: '11px',
                    color: '#64748b',
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                    borderRadius: '20px',
                    display: 'inline-block',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}>
                    <i className="fas fa-arrows-alt-h" style={{ marginRight: '6px', fontSize: '10px' }}></i>
                    좌우로 밀어서 더보기
                  </span>
                </div>
              )}

              <div className="top-grid">
                {topPosts.slice(1, 7).map((post, index) => (
                  <div key={post.id} className="grid-item" onClick={() => handleViewPost(post.id)}>
                    <div className="grid-image">
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackThumbnail(post.categoryId, index + 1);
                        }}
                        loading="lazy"
                      />
                      <span className="grid-rank">TOP {index + 2}</span>
                    </div>
                    <div className="grid-content">
                      <h4>{post.title}</h4>
                      <div className="grid-meta">
                        <span className="category">{post.categoryLabel}</span>
                        <span className="views">
                          <i className="fas fa-eye"></i> {post.views.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="list-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-list"></i> 게시글 목록 <span className="post-count">총 {filteredPosts.length}건</span>
            </h2>
          </div>

          {isLoading && posts.length === 0 ? (
            <div className="policy-analysis__feedback policy-analysis__feedback--loading">
              <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
              <span>정책분석 글을 불러오는 중입니다...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="policy-analysis__feedback policy-analysis__feedback--empty">
              <i className="fas fa-info-circle" aria-hidden="true"></i>
              <span>조건에 맞는 정책분석 글이 없습니다.</span>
            </div>
          ) : (
            <>
              <div className="posts-list">
                {filteredPosts.slice(0, visiblePosts).map((post) => (
                  <article key={post.id} className="list-item">
                    <div className="item-thumbnail" onClick={() => handleViewPost(post.id)}>
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackThumbnail(post.categoryId, post.id);
                        }}
                        loading="lazy"
                      />
                    </div>
                    <div className="item-content">
                      <div className="item-header">
                        <span className="item-category">{post.categoryLabel}</span>
                        <span className="item-author-info">
                          <FiCheckCircle style={{ color: '#3b82f6', fontSize: '0.875rem', display: 'inline-block', verticalAlign: 'middle' }} />
                          <span className="author-name">{post.author}</span>
                          <span className="author-company">{post.authorTitle}</span>
                        </span>
                      </div>
                      <h3 className="item-title" onClick={() => handleViewPost(post.id)}>{post.title}</h3>
                      <div className="item-tags">
                        {post.tags.slice(0, 3).map((tag, idx) => (
                          <span key={`${post.id}-tag-${idx}`} className="tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {visiblePosts < filteredPosts.length && (
                <button className="load-more-btn" onClick={handleLoadMore} type="button">
                  <i className="fas fa-plus"></i> 더보기
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 정책분석 작성하기 버튼 - examiner/admin/super_admin만 표시 */}
      {session && session.user && (session.user.role === 'examiner' || session.user.role === 'admin' || session.user.role === 'super_admin') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 'var(--layout-max-width, 1280px)', margin: '-10px auto 20px', paddingLeft: 'var(--layout-padding-inline)', paddingRight: 'var(--layout-padding-inline)' }}>
          <button
            className="write-button"
            onClick={handleWriteClick}
          >
            <i className="fas fa-pencil-alt"></i> 정책분석 작성하기
          </button>
        </div>
      )}

      {showWritePasswordModal && (
        <div className="write-modal-overlay">
          <div className="write-modal">
            <div className="modal-header">
              <h2>정책분석 작성 인증</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeWritePasswordModal}
                aria-label="닫기"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form className="modal-form" onSubmit={handleWritePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="policy-analysis-password">
                  <i className="fas fa-lock"></i> 비밀번호 <span className="required">*</span>
                </label>
                <input
                  id="policy-analysis-password"
                  type="password"
                  value={writePassword}
                  onChange={(event) => {
                    setWritePassword(event.target.value);
                    if (writePasswordError) {
                      setWritePasswordError('');
                    }
                  }}
                  placeholder="운영진이 전달한 비밀번호를 입력해주세요"
                  autoFocus
                />
              </div>
              {writePasswordError && <p className="password-error-text">{writePasswordError}</p>}
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeWritePasswordModal}
                  disabled={isVerifyingWritePassword}
                >
                  <i className="fas fa-arrow-left"></i>
                  취소
                </button>
                <button type="submit" className="btn-submit" disabled={isVerifyingWritePassword}>
                  <i className="fas fa-check"></i>
                  {isVerifyingWritePassword ? '확인 중...' : '확인 후 작성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PolicyAnalysis;









