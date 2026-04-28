'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MotionLoader } from '@/components/loading';
import './PolicyNewsDetail.css';

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * 본문이 HTML(에디터 v2 출력)인지 마크다운(에디터 v1)인지 판별
 *
 * @purpose 새 ReactQuill 에디터는 HTML 출력, 기존 게시글은 마크다운(`# 제목`, `![alt](url)`)
 * @decision 단순 정규식으로 블록 태그 탐지 — 풀 파서 불필요
 */
const isHtmlContent = (value = '') =>
  /<(p|div|h[1-6]|img|br|ul|ol|li|blockquote|strong|em|b|i|u|s|a|table|figure|span)\b[^>]*>/i.test(
    value
  );

/**
 * 관리자가 작성한 HTML 콘텐츠 최소 sanitize
 *
 * @purpose script/iframe/on*= 등 명백한 위험 요소 제거
 * @note ReactQuill이 클라이언트에서 1차 정제하지만 DB 직저장 후 복원 시점에 한 번 더 방어
 * @decision 풀 DOMPurify 미설치 — 화이트리스트 방식이 아닌 블랙리스트(관리자 작성 신뢰 전제)
 */
const sanitizeHtml = (value = '') =>
  value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');

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
  const [prevPost, setPrevPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);
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

        /*
          관련 게시글 + 이전글/다음글 동시 산출
          @decision 별도 API 추가 없이 목록 응답(시간 역순)에서 인덱스 계산
          @note posts는 createdAt desc → 더 최근이 next 방향, 더 과거가 prev 방향
        */
        const relatedResponse = await fetch('/api/policy-news?limit=20', { cache: 'no-store' });
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          const allPosts = relatedData.posts || [];
          const currentId = data.post._id || data.post.id;
          const idx = allPosts.findIndex((item) => (item._id || item.id) === currentId);
          if (idx !== -1) {
            setNextPost(idx > 0 ? allPosts[idx - 1] : null);
            setPrevPost(idx < allPosts.length - 1 ? allPosts[idx + 1] : null);
          }
          const filtered = allPosts
            .filter((item) => (item._id || item.id) !== currentId)
            .slice(0, 3);
          setRelatedNews(filtered);
        }

        // Check admin status from sessionStorage
        if (typeof window !== 'undefined') {
          const authorized = sessionStorage.getItem('policyNewsAuthorized');
          setIsAdmin(authorized === 'true');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
          );
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
      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
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
        },
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

  /**
   * 공유: navigator.share 우선, 미지원 시 URL 클립보드 복사
   * @context 와이어프레임 헤더 우측 액션 버튼 (2026-04-28)
   */
  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const shareTitle = post?.title || '나라똔 정책소식';
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (error) {
        // 사용자 취소 시 클립보드 폴백 진행
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다.');
    } catch {
      alert('링크 복사에 실패했습니다.');
    }
  };

  /**
   * 저장: 로컬 북마크 토글 (서버 저장은 별도 단계에서)
   */
  const handleBookmark = () => {
    if (typeof window === 'undefined' || !post) return;
    const id = post._id || post.id;
    if (!id) return;
    const key = 'policyNewsBookmarks';
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (saved.includes(id)) {
      localStorage.setItem(key, JSON.stringify(saved.filter((x) => x !== id)));
      alert('저장이 해제되었습니다.');
    } else {
      saved.push(id);
      localStorage.setItem(key, JSON.stringify(saved));
      alert('저장되었습니다.');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const generateTOC = () => {
    if (!contentRef.current) return [];
    const headings = contentRef.current.querySelectorAll('h2, h3');
    return Array.from(headings).map((h) => ({
      text: h.textContent,
      level: h.tagName,
      id: h.id || h.textContent.replace(/\s+/g, '-').toLowerCase(),
    }));
  };

  const plainTags = useMemo(() => (Array.isArray(post?.tags) ? post.tags : []), [post]);

  // 로딩 상태 체크
  if (isLoading) {
    return (
      <div className="policy-news-detail">
        <MotionLoader variant="scan" message="최적의 정책정보 분석중" />
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

      {/* 브레드크럼/조회수 제거 — 2026-04-28 리디자인 (와이어 ② 확정) */}

      {/*
        헤더 영역 — 와이어프레임 ②(2026-04-28) 기준
        카테고리 뱃지 → 제목 → 작성자/날짜 + 공유·저장·인쇄 버튼
      */}
      <div className="detail-header">
        {post.category && <span className="category-badge">{post.category}</span>}

        <h1 className="post-title">{post.title}</h1>

        <div className="post-meta">
          <div className="meta-author">
            <span className="author-avatar" aria-hidden="true">
              N
            </span>
            <span className="author-name">나라똔 편집부</span>
            <span className="meta-dot" aria-hidden="true">
              ·
            </span>
            <span className="meta-date">{createdDate}</span>
          </div>
          <div className="meta-actions">
            <button type="button" className="meta-action-btn" onClick={handleShare}>
              🔗 공유
            </button>
            <button type="button" className="meta-action-btn" onClick={handleBookmark}>
              🔖 저장
            </button>
            <button type="button" className="meta-action-btn" onClick={handlePrint}>
              🖨 인쇄
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="admin-actions">
            <button
              className="admin-button"
              onClick={() => router.push(`/policy-news/${params.id}/edit`)}
            >
              <i className="fas fa-edit"></i> 수정
            </button>
            <button className="admin-button delete" onClick={handleDelete}>
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

          {/*
            본문 콘텐츠 — HTML(신규) / 마크다운(기존) 자동 분기
            @context 새 에디터(ReactQuill)는 HTML, 구버전은 textarea + 마크다운 형식
          */}
          {isHtmlContent(post.content) ? (
            <div
              className="post-content"
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />
          ) : (
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
                      {imageMatch[1] && <p className="image-caption">{imageMatch[1]}</p>}
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
          )}

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
                <button className="toc-toggle" onClick={() => setShowTOC(!showTOC)}>
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

      {/*
        이전글 / 목록 / 다음글 네비게이션 — 와이어프레임 ② 하단 (2026-04-28)
        목록으로 버튼은 emerald 강조, 이전·다음은 회색 보더 카드
      */}
      <nav className="post-navigation">
        {prevPost ? (
          <Link href={`/policy-news/${prevPost._id || prevPost.id}`} className="nav-item nav-prev">
            <div className="nav-label">← 이전글</div>
            <div className="nav-title">{prevPost.title}</div>
          </Link>
        ) : (
          <div className="nav-item nav-prev nav-empty" aria-hidden="true" />
        )}

        <Link href="/policy-news" className="nav-list-button">
          목록으로
        </Link>

        {nextPost ? (
          <Link href={`/policy-news/${nextPost._id || nextPost.id}`} className="nav-item nav-next">
            <div className="nav-label">다음글 →</div>
            <div className="nav-title">{nextPost.title}</div>
          </Link>
        ) : (
          <div className="nav-item nav-next nav-empty" aria-hidden="true" />
        )}
      </nav>

      {/* 관련 정책소식 — 회색 배경 영역, 3열 카드 */}
      {relatedNews.length > 0 && (
        <div className="related-news">
          <div className="related-news-inner">
            <h2 className="related-news-title">관련 정책소식</h2>
            <div className="related-grid">
              {relatedNews.map((news) => {
                const newsId = news._id || news.id;
                return (
                  <Link key={newsId} href={`/policy-news/${newsId}`} className="related-item">
                    <div className="related-thumb">
                      {news.thumbnail ? <img src={news.thumbnail} alt="" /> : null}
                    </div>
                    <div className="related-category">{news.category || '정책소식'}</div>
                    <h3 className="related-title">{news.title}</h3>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
