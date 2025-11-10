'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import './PolicyNewsDetail.css';

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const formatDate = (value) => {
  if (!value) {
    return '작성일 미정';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '작성일 미정';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  } catch (error) {
    return '작성일 미정';
  }
};

const PolicyNewsDetail = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [post, setPost] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch(`/api/policy-news/${params.id}?countView=true`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.message || '게시글을 불러오지 못했습니다.');
        }
        const data = await response.json();
        if (cancelled) {
          return;
        }
        setPost(data.post);

        const relatedResponse = await fetch('/api/policy-news?limit=6', { cache: 'no-store' });
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          const filtered = (relatedData.posts || [])
            .filter((item) => (item._id || item.id) !== (data.post._id || data.post.id))
            .slice(0, 4);
          setRelatedNews(filtered);
        }

        // Check admin status from sessionStorage
        if (typeof window !== 'undefined') {
          const authorized = sessionStorage.getItem('policyNewsAuthorized');
          setIsAdmin(authorized === 'true');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setScrollProgress(scrollPercent);
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/policy-news/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || '삭제 실패');
      }

      alert('게시글이 삭제되었습니다.');

      // 로컬 스토리지 캐시 삭제
      if (typeof window !== 'undefined') {
        localStorage.removeItem('policyNewsCache');
        localStorage.removeItem('policyNewsCacheTime');
      }

      router.push('/policy-news');
      router.refresh();
    } catch (error) {
      console.error('게시글 삭제 실패', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateTOC = () => {
    if (!contentRef.current) return [];
    const headings = contentRef.current.querySelectorAll('h2, h3');
    return Array.from(headings).map(h => ({
      text: h.textContent,
      level: h.tagName,
      id: h.id || h.textContent.replace(/\s+/g, '-').toLowerCase()
    }));
  };

  const plainTags = useMemo(() => (Array.isArray(post?.tags) ? post.tags : []), [post]);

  /**
   * 로그인 권한 체크
   *
   * @purpose 가입자만 정책소식 게시글 열람 가능
   * @context 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
   */
  if (status === 'loading' || isLoading) {
    return (
      <div className="policy-news-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>콘텐츠를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <div className="policy-news-detail">
        <div className="auth-required-container">
          <div className="auth-card">
            <div className="auth-icon-wrapper">
              👋
            </div>
            <h2 className="auth-title">안녕하세요 대표님!</h2>
            <p className="auth-message">
              기업에 꼭 필요한 자금문제를<br />
              지금 나라똔에서 해결하세요.
            </p>
            <div className="auth-divider"></div>
            <p className="auth-description">
              본 서비스는 나라똔 회원만<br />
              이용할 수 있습니다.<br />
              <br />
              가입 후 이용하시면 바로 확인 가능합니다.
            </p>
            <div className="auth-buttons">
              <button
                className="auth-button primary"
                onClick={() => router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname))}
              >
                <i className="fas fa-user-plus"></i>
                <span>회원가입 / 로그인</span>
              </button>
              <button
                className="auth-button secondary"
                onClick={() => router.push('/policy-news')}
              >
                <i className="fas fa-arrow-left"></i>
                <span>목록으로 돌아가기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="policy-news-detail">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p className="error-message">{errorMessage}</p>
          <button className="back-button" onClick={() => router.push('/policy-news')}>
            <i className="fas fa-arrow-left"></i> 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const createdDate = formatDate(post.createdAt);
  const views = typeof post.views === 'number' ? post.views : 0;

  return (
    <div className="policy-news-detail">
      {/* 스크롤 진행 표시 */}
      <div className="scroll-progress-bar">
        <div className="progress" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* 헤더 영역 */}
      <div className="detail-header">
        {/* 정책분석 보기 링크 */}
        <div className="policy-analysis-link">
          <Link href="/policy-analysis">
            <i className="fas fa-chart-line"></i>
            정책분석 보기
          </Link>
        </div>

        {/* 제목 */}
        <h1 className="post-title">{post.title}</h1>

        {/* 메타 정보 */}
        <div className="post-meta">
          <span className="meta-item">
            <i className="far fa-calendar"></i>
            {createdDate}
          </span>
          <span className="meta-divider"></span>
          <span className="meta-item">
            <i className="far fa-eye"></i>
            조회 {views}
          </span>
          <span className="meta-divider"></span>
          <span className="meta-item category-tag">
            {post.category || '기타'}
          </span>
        </div>

        {/* 관리자 액션 */}
        {isAdmin && (
          <div className="admin-actions">
            <button
              className="admin-button"
              onClick={() => router.push(`/policy-news/${params.id}/edit`)}
            >
              <i className="fas fa-edit"></i> 수정
            </button>
            <button
              className="admin-button delete"
              onClick={handleDelete}
            >
              <i className="fas fa-trash"></i> 삭제
            </button>
          </div>
        )}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="content-wrapper">
        {/* 메인 콘텐츠 */}
        <div className="main-content">
          {/* 요약 - 이미지 위로 이동 */}
          {post.excerpt && (
            <div className="post-excerpt">
              <p>{post.excerpt}</p>
            </div>
          )}

          {/* 썸네일 이미지 */}
          {post.thumbnail && (
            <div className="post-thumbnail">
              <img
                src={post.thumbnail}
                alt={post.title}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* 본문 콘텐츠 */}
          <div className="post-content" ref={contentRef}>
            {post.content.split('\n').map((paragraph, index) => {
              if (!paragraph.trim()) return <br key={index} />;

              // 이미지 처리
              const imageMatch = paragraph.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
              if (imageMatch) {
                return (
                  <div key={index} className="content-image-wrapper">
                    <img
                      src={imageMatch[2]}
                      alt={imageMatch[1] || '이미지'}
                      className="content-image"
                    />
                    {imageMatch[1] && (
                      <p className="image-caption">{imageMatch[1]}</p>
                    )}
                  </div>
                );
              }

              // 제목 처리
              const headingMatch = paragraph.match(/^(#{1,6})\s+(.+)$/);
              if (headingMatch) {
                const level = headingMatch[1].length;
                const HeadingTag = `h${Math.min(level, 6)}`;
                return (
                  <HeadingTag key={index} id={headingMatch[2].replace(/\s+/g, '-').toLowerCase()}>
                    {headingMatch[2]}
                  </HeadingTag>
                );
              }

              // 구분선
              if (paragraph.match(/^(-{3,}|\*{3,})$/)) {
                return <hr key={index} />;
              }

              // 일반 단락
              return <p key={index}>{paragraph}</p>;
            })}
          </div>

          {/* 태그 */}
          {plainTags.length > 0 && (
            <div className="post-tags">
              <div className="tags-container">
                {plainTags.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <aside className="sidebar">
          {/* 목차 */}
          {generateTOC().length > 0 && (
            <div className="toc-box">
              <div className="toc-header">
                <h3>목차</h3>
                <button
                  className="toc-toggle"
                  onClick={() => setShowTOC(!showTOC)}
                >
                  <i className={`fas fa-chevron-${showTOC ? 'up' : 'down'}`}></i>
                </button>
              </div>
              {showTOC && (
                <ul className="toc-list">
                  {generateTOC().map((item, idx) => (
                    <li key={idx} className="toc-item">
                      <a
                        href={`#${item.id}`}
                        className="toc-link"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* 관련 게시글 */}
      {relatedNews.length > 0 && (
        <div className="related-news">
          <h2>관련 정책소식</h2>
          <div className="related-grid">
            {relatedNews.map((news) => {
              const newsId = news._id || news.id;
              return (
                <Link
                  key={newsId}
                  href={`/policy-news/${newsId}`}
                  className="related-item"
                >
                  <div className="related-category">{news.category || '정책소식'}</div>
                  <h3 className="related-title">{news.title}</h3>
                  <div className="related-date">{formatDate(news.createdAt)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 정책분석 바로가기 */}
      <div style={{
        marginTop: '40px',
        padding: '30px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '20px' }}>
          더 깊이 있는 정책 인사이트를 원하시나요?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '20px', fontSize: '15px' }}>
          전문가의 심층 분석과 함께 정책을 이해해보세요
        </p>
        <Link
          href="/policy-analysis"
          style={{
            display: 'inline-block',
            padding: '12px 30px',
            background: 'white',
            color: '#667eea',
            borderRadius: '8px',
            fontWeight: '600',
            textDecoration: 'none',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <i className="fas fa-chart-line" style={{ marginRight: '8px' }}></i>
          정책분석 페이지 보기
        </Link>
      </div>

      {/* 스크롤 탑 버튼 */}
      <button
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="맨 위로 이동"
      >
        <i className="fas fa-chevron-up"></i>
      </button>
    </div>
  );
};

export default PolicyNewsDetail;