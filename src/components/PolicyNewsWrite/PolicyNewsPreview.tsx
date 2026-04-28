'use client';

import { useEffect } from 'react';
import '@/components/PolicyNewsDetail/PolicyNewsDetail.css';
import './PolicyNewsPreview.css';

/**
 * 정책소식 라이브 미리보기 모달
 *
 * @purpose 관리자가 작성 중인 글을 detail 페이지(/policy-news/[id])와 동일한 레이아웃으로 미리보기
 * @context PolicyNewsWrite 의 "미리보기" 버튼이 본 모달 호출
 * @decision
 *   - 실제 PolicyNewsDetail 와 동일한 className 구조 + 같은 CSS import → 100% 동일한 스타일
 *   - HTML/마크다운 자동 분기 (PolicyNewsDetail 와 동일 로직 인라인 복제)
 *   - 모달 자체는 풀스크린 오버레이 + 닫기 버튼
 *   - 작성 페이지의 form 값 변경 시 다시 열면 즉시 반영 (props 기반)
 */

interface PolicyNewsPreviewProps {
  open: boolean;
  onClose: () => void;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string[];
  thumbnail: string;
  authorName?: string;
}

const isHtmlContent = (value = '') =>
  /<(p|div|h[1-6]|img|br|ul|ol|li|blockquote|strong|em|b|i|u|s|a|table|figure|span)\b[^>]*>/i.test(
    value
  );

const sanitizeHtml = (value = '') =>
  value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');

const formatToday = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function PolicyNewsPreview({
  open,
  onClose,
  title,
  category,
  excerpt,
  content,
  tags,
  thumbnail,
  authorName = '관리자',
}: PolicyNewsPreviewProps) {
  /**
   * 모달 열린 동안 body 스크롤 잠금
   * @purpose 배경 스크롤 방지로 미리보기 몰입감 ↑
   */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /** ESC 키로 닫기 */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isContentHtml = isHtmlContent(content);

  return (
    <div className="policy-news-preview-overlay" onClick={onClose}>
      {/* 미리보기 헤더 (모달 전용) */}
      <div className="policy-news-preview-bar">
        <div className="policy-news-preview-bar-left">
          <span className="policy-news-preview-badge">LIVE PREVIEW</span>
          <span className="policy-news-preview-meta">
            실제 화면(/policy-news/&#123;id&#125;)에 표시될 모습입니다 · 저장되지 않음
          </span>
        </div>
        <button
          type="button"
          className="policy-news-preview-close"
          onClick={onClose}
          aria-label="미리보기 닫기"
        >
          <i className="fas fa-times" />
          닫기 (ESC)
        </button>
      </div>

      {/* 실제 detail 페이지와 동일한 컨테이너/클래스 구조 */}
      <div className="policy-news-preview-stage" onClick={(e) => e.stopPropagation()}>
        <div className="policy-news-detail">
          {/* 헤더 영역 */}
          <div className="detail-header">
            {category && <span className="category-badge">{category}</span>}
            <h1 className="post-title">{title || '(제목 없음)'}</h1>
            <div className="post-meta">
              <span className="meta-item">
                <i className="fas fa-user" /> {authorName}
              </span>
              <span className="meta-divider" />
              <span className="meta-item">
                <i className="far fa-calendar-alt" /> {formatToday()}
              </span>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="content-wrapper">
            <div className="main-content">
              {/* 요약 */}
              {excerpt && (
                <div className="post-excerpt">
                  <p>{excerpt}</p>
                </div>
              )}

              {/* 썸네일 */}
              {thumbnail && (
                <div className="post-thumbnail">
                  <img src={thumbnail} alt={title} />
                </div>
              )}

              {/* 본문 — HTML(ReactQuill) / 마크다운 자동 분기 */}
              {isContentHtml ? (
                <div
                  className="post-content"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                />
              ) : (
                <div className="post-content">
                  {(content || '').split('\n').map((paragraph, index) => {
                    if (!paragraph.trim()) return <br key={index} />;

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

                    const headingMatch = paragraph.match(/^(#{1,6})\s+(.+)$/);
                    if (headingMatch) {
                      const level = headingMatch[1].length;
                      const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
                      return (
                        <HeadingTag
                          key={index}
                          id={headingMatch[2].replace(/\s+/g, '-').toLowerCase()}
                        >
                          {headingMatch[2]}
                        </HeadingTag>
                      );
                    }

                    if (paragraph.match(/^(-{3,}|\*{3,})$/)) {
                      return <hr key={index} />;
                    }

                    return <p key={index}>{paragraph}</p>;
                  })}
                </div>
              )}

              {/* 태그 */}
              {tags.length > 0 && (
                <div className="post-tags">
                  <div className="tags-container">
                    {tags.map((tag) => (
                      <span key={tag} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 빈 콘텐츠 안내 */}
              {!title && !content && !excerpt && !thumbnail && (
                <div className="policy-news-preview-empty">
                  <i className="fas fa-eye" />
                  <p>제목·본문·썸네일을 입력하면 여기에 미리보기가 표시됩니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
