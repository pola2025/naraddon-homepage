'use client';

import { useEffect, useMemo } from 'react';
import PolicyNewsDetail from '@/components/PolicyNewsDetail/PolicyNewsDetail';
import './PolicyNewsPreview.css';

/**
 * 정책소식 라이브 미리보기 모달
 *
 * @purpose 작성 중인 글을 실제 detail 페이지(/policy-news/[id])와 100% 동일한 화면으로 미리보기
 * @decision
 *   - 마크업/스타일 복제(이전 방식)는 실제와 차이가 발생 → 실제 PolicyNewsDetail 컴포넌트를
 *     previewPost prop 으로 그대로 호출 (단일 진실 소스)
 *   - 모달 자체는 풀스크린 오버레이 + 상단 컨트롤 바
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

export default function PolicyNewsPreview({
  open,
  onClose,
  title,
  category,
  excerpt,
  content,
  tags,
  thumbnail,
}: PolicyNewsPreviewProps) {
  /**
   * PolicyNewsDetail 가 기대하는 post 형태로 묶어서 전달
   * @decision 입력값 변경 시마다 useMemo 재생성 → PolicyNewsDetail 의 useEffect 가 setPost 호출
   */
  const previewPost = useMemo(
    () => ({
      _id: 'preview',
      title: title || '(제목 없음)',
      category: category || '',
      excerpt: excerpt || '',
      content: content || '',
      tags: tags || [],
      thumbnail: thumbnail || '',
      createdAt: new Date().toISOString(),
      views: 0,
    }),
    [title, category, excerpt, content, tags, thumbnail]
  );

  /** 모달 열린 동안 body 스크롤 잠금 */
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

  return (
    <div className="policy-news-preview-overlay" onClick={onClose}>
      {/* 상단 컨트롤 바 */}
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

      {/* 실제 detail 컴포넌트를 previewPost 로 그대로 호출 → 100% 동일 렌더 */}
      <div className="policy-news-preview-stage" onClick={(e) => e.stopPropagation()}>
        <PolicyNewsDetail previewPost={previewPost} />
      </div>
    </div>
  );
}
