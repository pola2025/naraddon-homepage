'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

const calculateReadTime = (content) => {
  const text = stripHtml(content);
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes}분 읽기`;
};

const PolicyNewsDetail = () => {
  const router = useRouter();
  const params = useParams();
  const [post, setPost] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const contentRef = useRef(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [isHeaderMinimized, setIsHeaderMinimized] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [imageViewerSrc, setImageViewerSrc] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);

      // Header minimize on scroll
      setIsHeaderMinimized(winScroll > 100);

      // Show scroll to top button
      setShowScrollTop(winScroll > 500);

      // Update active TOC section
      if (contentRef.current) {
        const headings = contentRef.current.querySelectorAll('h2, h3');
        let currentSection = '';
        headings.forEach((heading) => {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 100) {
            currentSection = heading.textContent;
          }
        });
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize localStorage preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem('policyNewsFontSize') || 'medium';
      setFontSize(savedFontSize);

      const savedLikes = JSON.parse(localStorage.getItem('policyNewsLikes') || '{}');
      setIsLiked(savedLikes[params.id] || false);

      const savedBookmarks = JSON.parse(localStorage.getItem('policyNewsBookmarks') || '{}');
      setIsBookmarked(savedBookmarks[params.id] || false);
    }
  }, [params.id]);

  // Auto-save reading position
  useEffect(() => {
    const savePosition = () => {
      if (typeof window !== 'undefined' && params.id) {
        const position = window.scrollY;
        sessionStorage.setItem(`policyNews_${params.id}_position`, position.toString());
      }
    };

    const throttledSave = () => {
      clearTimeout(window.savePositionTimeout);
      window.savePositionTimeout = setTimeout(savePosition, 1000);
    };

    window.addEventListener('scroll', throttledSave, { passive: true });
    return () => {
      window.removeEventListener('scroll', throttledSave);
      clearTimeout(window.savePositionTimeout);
    };
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    const password = window.prompt('게시글 비밀번호를 입력해주세요.');
    if (!password) {
      return;
    }
    try {
      const response = await fetch(`/api/policy-news/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result?.message || '삭제에 실패했습니다.');
        return;
      }

      alert('게시글이 삭제되었습니다.');

      // 로컬 스토리지 캐시 삭제
      if (typeof window !== 'undefined') {
        localStorage.removeItem('policyNewsCache');
        localStorage.removeItem('policyNewsCacheTime');
      }

      // 페이지 새로고침을 위해 router.refresh() 추가
      router.push('/policy-news');
      router.refresh();
    } catch (error) {
      console.error('게시글 삭제 실패', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post?.title || '';
    const text = stripHtml(post?.excerpt || post?.content || '');

    switch(platform) {
      case 'copy':
        navigator.clipboard.writeText(url).then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        });
        break;
      case 'kakao':
        window.open(`https://story.kakao.com/share?url=${encodeURIComponent(url)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`);
        break;
      default:
        if (navigator.share) {
          navigator.share({ title, text, url });
        }
    }
    setShowShareMenu(false);
  };

  const handleLike = () => {
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);

    if (typeof window !== 'undefined') {
      const savedLikes = JSON.parse(localStorage.getItem('policyNewsLikes') || '{}');
      if (newLikeState) {
        savedLikes[params.id] = true;
      } else {
        delete savedLikes[params.id];
      }
      localStorage.setItem('policyNewsLikes', JSON.stringify(savedLikes));
    }

    // Haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleBookmark = () => {
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);

    if (typeof window !== 'undefined') {
      const savedBookmarks = JSON.parse(localStorage.getItem('policyNewsBookmarks') || '{}');
      if (newBookmarkState) {
        savedBookmarks[params.id] = {
          id: params.id,
          title: post?.title,
          date: new Date().toISOString()
        };
      } else {
        delete savedBookmarks[params.id];
      }
      localStorage.setItem('policyNewsBookmarks', JSON.stringify(savedBookmarks));
    }
  };

  const handleReaction = (emoji) => {
    setSelectedReaction(emoji);
    setShowReactionPicker(false);

    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('policyNewsFontSize', size);
    }
  };

  const handleImageClick = (src) => {
    setImageViewerSrc(src);
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

  if (isLoading) {
    return (
      <div className="policy-news-detail">
        <div className="loading-container">
          <div className="premium-loader">
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="loader-text">콘텐츠를 준비하고 있습니다</p>
            <div className="loader-progress">
              <div className="loader-progress-bar"></div>
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
          <div className="error-content">
            <i className="fas fa-exclamation-circle"></i>
            <h2>앗! 문제가 발생했습니다</h2>
            <p>{errorMessage}</p>
            <button className="primary-button" onClick={() => router.push('/policy-news')}>
              <i className="fas fa-arrow-left"></i> 목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const createdDate = formatDate(post.createdAt);
  const views = typeof post.views === 'number' ? post.views : 0;
  const likes = typeof post.likes === 'number' ? post.likes : 0;
  const comments = typeof post.comments === 'number' ? post.comments : 0;
  const excerpt = post.excerpt || stripHtml(post.content || '').slice(0, 200);
  const readTime = calculateReadTime(post.content || '');

  return (
    <div className="policy-news-detail">
      {/* Progress Bar */}
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* Header */}
      <header className={`article-header ${isHeaderMinimized ? 'minimized' : ''}`}>
        <div className="header-wrapper">
          <button className="back-btn glass-effect" onClick={() => router.push('/policy-news')}>
            <i className="fas fa-arrow-left"></i>
            <span className="back-text">목록</span>
          </button>

          {isHeaderMinimized && (
            <div className="minimized-title">
              <span className="mini-category">{post?.category}</span>
              <h4 className="mini-title">{post?.title}</h4>
            </div>
          )}

          <div className="header-actions">
            <button
              className="action-btn glass-effect"
              onClick={() => setShowTOC(!showTOC)}
              title="목차"
            >
              <i className="fas fa-list-ul"></i>
            </button>

            <div className="font-size-control">
              <button
                className={`size-btn ${fontSize === 'small' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('small')}
                title="작게"
              >
                <span style={{ fontSize: '12px' }}>A</span>
              </button>
              <button
                className={`size-btn ${fontSize === 'medium' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('medium')}
                title="보통"
              >
                <span style={{ fontSize: '14px' }}>A</span>
              </button>
              <button
                className={`size-btn ${fontSize === 'large' ? 'active' : ''}`}
                onClick={() => handleFontSizeChange('large')}
                title="크게"
              >
                <span style={{ fontSize: '16px' }}>A</span>
              </button>
            </div>

            <button
              className="action-btn glass-effect"
              onClick={() => setShowShareMenu(!showShareMenu)}
            >
              <i className="fas fa-share-alt"></i>
            </button>

            {showShareMenu && (
              <div className="share-menu">
                <button onClick={() => handleShare('copy')}>
                  <i className="fas fa-link"></i>
                  {copiedLink ? '복사됨!' : '링크 복사'}
                </button>
                <button onClick={() => handleShare('kakao')}>
                  <i className="fas fa-comment"></i>
                  카카오톡
                </button>
                <button onClick={() => handleShare('facebook')}>
                  <i className="fab fa-facebook"></i>
                  페이스북
                </button>
                <button onClick={() => handleShare('twitter')}>
                  <i className="fab fa-twitter"></i>
                  트위터
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {post.thumbnail && (
        <div className="hero-section parallax">
          <div className="hero-image" onClick={() => handleImageClick(post.thumbnail)}>
            <img
              src={post.thumbnail}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/placeholder.png';
              }}
            />
            <div className="hero-overlay">
              <div className="hero-content">
                <div className="hero-category pulse">{post.category}</div>
                <h1 className="hero-title">{post.title}</h1>
                <div className="hero-meta">
                  <span><i className="far fa-calendar"></i> {createdDate}</span>
                  <span className="dot">•</span>
                  <span><i className="far fa-clock"></i> {readTime}</span>
                </div>
              </div>
            </div>
            <div className="image-zoom-hint">
              <i className="fas fa-search-plus"></i>
            </div>
          </div>
        </div>
      )}

      {/* Table of Contents */}
      {showTOC && (
        <aside className="toc-sidebar glass-effect">
          <div className="toc-header">
            <h3>목차</h3>
            <button onClick={() => setShowTOC(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <nav className="toc-list">
            {generateTOC().map((item, idx) => (
              <a
                key={idx}
                href={`#${item.id}`}
                className={`toc-item toc-${item.level.toLowerCase()} ${activeSection === item.text ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <article className="article-container">
        <div className={`article-content font-${fontSize}`} ref={contentRef}>
          {/* Title Section */}
          <div className="title-section fade-in">
            {!post.thumbnail && (
              <>
                <div className="category-badge shimmer">
                  <i className="fas fa-bookmark"></i>
                  {post.category || '정책소식'}
                </div>
                <h1 className="article-title">{post.title}</h1>
              </>
            )}

            {excerpt && (
              <p className="article-excerpt">{excerpt}</p>
            )}

            <div className="article-meta">
              <div className="meta-left">
                <span className="meta-item">
                  <i className="far fa-calendar-alt"></i>
                  {createdDate}
                </span>
                <span className="meta-divider">·</span>
                <span className="meta-item">
                  <i className="far fa-clock"></i>
                  {readTime}
                </span>
                <span className="meta-divider">·</span>
                <span className="meta-item">
                  <i className="far fa-eye"></i>
                  {views.toLocaleString()}회
                </span>
              </div>

              {isAdmin && (
                <div className="admin-actions">
                  <button
                    className="admin-btn edit"
                    onClick={() => router.push(`/policy-news/${params.id}/edit`)}
                    title="수정"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                  <button
                    className="admin-btn delete"
                    onClick={handleDelete}
                    title="삭제"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Body - Text with Image Support */}
          <div className="article-body enhanced-content">
            {post.content.split('\n').map((line, index) => {
              // 빈 줄도 <br/>로 표시하여 띄어쓰기 유지
              if (!line.trim()) return <br key={index} />;

              // 이미지 패턴 체크: ![이미지설명](이미지URL)
              const imagePattern = /^!\[([^\]]*)\]\(([^)]+)\)$/;
              const imageMatch = line.match(imagePattern);

              if (imageMatch) {
                const [, altText, imageUrl] = imageMatch;
                return (
                  <div key={index} className="article-image-container">
                    <img
                      src={imageUrl}
                      alt={altText || '이미지'}
                      className="article-image"
                      onClick={() => handleImageClick(imageUrl)}
                    />
                    {altText && (
                      <p className="article-image-caption">{altText}</p>
                    )}
                  </div>
                );
              }

              // 제목 패턴 체크: # 제목 (한 개 #), ## 소제목 (두 개 ##)
              const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
              if (headingMatch) {
                const [, hashes, text] = headingMatch;
                const HeadingTag = `h${hashes.length + 1}`; // h2, h3, h4로 변환

                return (
                  <HeadingTag key={index} className={`article-heading-${hashes.length}`}>
                    {text}
                  </HeadingTag>
                );
              }

              // 구분선 패턴 체크: --- 또는 ***
              if (line.match(/^(-{3,}|\*{3,})$/)) {
                return <hr key={index} className="article-divider" />;
              }

              // 일반 텍스트 단락
              return (
                <p key={index} className="article-paragraph" style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
                  {line}
                </p>
              );
            })}
          </div>

          {/* Tags & Engagement Combined Wrapper */}
          <div className="tags-engagement-wrapper">
            {/* Tags */}
            {plainTags.length > 0 && (
              <div className="tags-section">
                {plainTags.map((tag) => (
                  <button key={tag} className="tag-chip">
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Engagement Section - Removed */}

            {/* Comment Section */}
            <div className="comment-section">
              <div className="comment-header">
                <h3>댓글 {comments}개</h3>
              </div>

              {/* 댓글 작성 폼 */}
              <div className="comment-form">
                <textarea
                  placeholder="댓글을 남겨주세요..."
                  className="comment-input"
                  rows="3"
                />
                <div className="comment-form-actions">
                  <input
                    type="text"
                    placeholder="닉네임"
                    className="comment-nickname"
                  />
                  <input
                    type="password"
                    placeholder="비밀번호 (삭제시 필요)"
                    className="comment-password"
                  />
                  <button className="comment-submit-btn">
                    댓글 등록
                  </button>
                </div>
              </div>

              {/* 댓글 목록 */}
              <div className="comment-list">
                {/* 댓글이 없습니다 */}
              </div>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedNews.length > 0 && (
          <aside className="related-section">
            <h2 className="section-title">
              <span>추천 콘텐츠</span>
              <i className="fas fa-sparkles"></i>
            </h2>
            <div className="related-grid">
              {relatedNews.map((news) => {
                const relatedId = news._id || news.id;
                const relatedViews = typeof news.views === 'number' ? news.views : 0;
                return (
                  <article
                    key={relatedId}
                    className="related-card hover-lift"
                    onClick={() => router.push(`/policy-news/${relatedId}`)}
                  >
                    <div className="card-image">
                      {news.thumbnail ? (
                        <img
                          src={news.thumbnail}
                          alt={news.title || '정책소식'}
                          style={{ width: '100%', height: '250px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/placeholder.png';
                          }}
                        />
                      ) : (
                        <div className="image-placeholder">
                          <i className="far fa-image"></i>
                        </div>
                      )}
                      <div className="card-category">
                        {news.category || '정책소식'}
                      </div>
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{news.title || '제목 미정'}</h3>
                      <p className="card-excerpt">
                        {stripHtml(news.excerpt || news.content || '').slice(0, 80)}...
                      </p>
                      <div className="card-meta">
                        <span>
                          <i className="far fa-calendar"></i>
                          {formatDate(news.createdAt)}
                        </span>
                        <span>
                          <i className="far fa-eye"></i>
                          {relatedViews.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        )}
      </article>

      {/* CTA Section - Copied from PolicyAnalysis */}
      <section className="policy-analysis__cta-section" aria-labelledby="policy-analysis-cta-title">
        <div className="policy-analysis__cta-container">
          <div className="policy-analysis__cta-banner">
            <div className="policy-analysis__cta-content">
              <p className="policy-analysis__cta-eyebrow">Policy News</p>
              <h2 id="policy-analysis-cta-title" className="policy-analysis__cta-title">
                인증 기업심사관과 함께 정책자금을
                <br className="policy-analysis__cta-break" />
                찾아보시겠어요?
              </h2>
              <p className="policy-analysis__cta-description">
                검증된 정책분석 전문가가 1:1로 맞춤 전략을 제안해드립니다.<br />대표님의 사업에 필요한 정책을 바로 안내해드립니다.
              </p>
            </div>
            <Link href="/consultation-request#form-section" className="policy-analysis__cta-button">
              상담 예약하기
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Actions - Mobile */}
      <div className={`floating-actions ${showScrollTop ? 'show' : ''}`}>
        <button
          className={`float-btn glass-effect ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i>
          {isLiked && <span className="float-badge">1</span>}
        </button>
        <button
          className={`float-btn glass-effect ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmark}
        >
          <i className={`${isBookmarked ? 'fas' : 'far'} fa-bookmark`}></i>
        </button>
        <button
          className="float-btn glass-effect scroll-top"
          onClick={scrollToTop}
        >
          <i className="fas fa-chevron-up"></i>
        </button>
      </div>

      {/* Image Viewer Modal */}
      {imageViewerSrc && (
        <div className="image-viewer-modal" onClick={() => setImageViewerSrc(null)}>
          <button className="viewer-close" onClick={() => setImageViewerSrc(null)}>
            <i className="fas fa-times"></i>
          </button>
          <img src={imageViewerSrc} alt="확대 이미지" />
          <div className="viewer-controls">
            <button><i className="fas fa-search-minus"></i></button>
            <button><i className="fas fa-search-plus"></i></button>
            <button><i className="fas fa-download"></i></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyNewsDetail;
