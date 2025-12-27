'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import './page.css';

import { certifiedExaminers } from '@/data/certifiedExaminers';
import { VERIFIED_EXPERT_PROFILES } from '@/data/expertsShowcase';

interface TtontokPost {
  id: string;
  title: string;
  content: string;
  nickname: string;
  category: string;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Reply {
  id: string;
  nickname: string;
  companyName?: string;
  content: string;
  role?: string;
  createdAt: string;
}

type ProfessionalRole = 'certified_examiner' | 'expert';

interface ProfessionalProfile {
  name: string;
  companyName: string;
  role: ProfessionalRole;
}

const PROFESSIONAL_SUFFIX_PATTERNS: RegExp[] = [
  /(수석|선임|책임)?\s*(인증)?\s*(기업)?\s*심사관$/u,
  /\s*전문가$/u,
  /\s*멘토$/u,
  /\s*위원$/u,
  /\s*대표$/u,
  /\s*소장$/u,
  /\s*센터장$/u,
  /\s*원장$/u,
  /\s*단장$/u,
  /\s*감독$/u,
  /\s*연구원$/u,
  /\s*코치$/u,
  /\s*강사$/u,
  /\s*교수$/u,
  /\s*박사$/u,
  /\s*변호사$/u,
  /\s*회계사$/u,
  /\s*세무사$/u,
  /\s*노무사$/u,
  /\s*컨설턴트$/u,
];

const stripRoleDecorations = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '';
  }

  let result = value.replace(/\(.*?\)/g, ' ').replace(/\[.*?]/g, ' ').trim();

  result = result.replace(/\s*님$/u, '').trim();

  for (const pattern of PROFESSIONAL_SUFFIX_PATTERNS) {
    result = result.replace(pattern, '').trim();
  }

  result = result.replace(/\s*님$/u, '').trim();

  return result.replace(/\s+/g, ' ').trim();
};

const normalizeProfessionalKey = (value: string | null | undefined): string =>
  stripRoleDecorations(value).replace(/\s+/g, '').toLowerCase();

const isProfessionalRole = (role?: string | null): role is ProfessionalRole =>
  role === 'certified_examiner' || role === 'expert';

const CATEGORY_LABELS: Record<string, string> = {
  funding: '자금',
  tax: '세무',
  hr: '노무',
  marketing: '마케팅',
  strategy: '전략',
  tech: '기술',
  legal: '법무',
  etc: '기타',
};

export default function TtontokDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<TtontokPost | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyNickname, setReplyNickname] = useState('');
  const [replyCompanyName, setReplyCompanyName] = useState('');
  const [replyRole, setReplyRole] = useState('general');
  const [professionalDirectory, setProfessionalDirectory] = useState<Record<string, ProfessionalProfile>>({});

  const hasProfessionalReplies = useMemo(
    () => replies.some((reply) => isProfessionalRole(reply.role)),
    [replies]
  );

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/business-voice/ttontok/${postId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // API가 직접 post 데이터를 반환함 (data.post가 아니라 data 자체가 post)
      if (data.id) {
        setPost(data);
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasProfessionalReplies) {
      return;
    }

    let isActive = true;

    const loadProfessionalDirectory = async () => {
      const directory: Record<string, ProfessionalProfile> = {};

      const ingestRecords = (items: unknown[], role: ProfessionalRole) => {
        items.forEach((item) => {
          if (!item || typeof item !== 'object') {
            return;
          }

          const record = item as { name?: unknown; companyName?: unknown };
          const rawName = typeof record.name === 'string' ? record.name.trim() : '';
          if (!rawName) {
            return;
          }

          const name = stripRoleDecorations(rawName) || rawName;
          const companyName = typeof record.companyName === 'string' ? record.companyName.trim() : '';
          const profile: ProfessionalProfile = { name, companyName, role };

          const keys = new Set<string>();
          const rawKey = normalizeProfessionalKey(rawName);
          if (rawKey) {
            keys.add(rawKey);
          }
          const nameKey = normalizeProfessionalKey(name);
          if (nameKey) {
            keys.add(nameKey);
          }

          // variant 키 제거 - 이름만 사용
          // 역할 접미사는 표시할 때 CSS로 처리됨

          keys.forEach((key) => {
            if (key && !directory[key]) {
              directory[key] = profile;
            }
          });
        });
      };

      try {
        const [examinersResult, expertsResult] = await Promise.allSettled([
          fetch('/api/expert-services/examiners', { cache: 'force-cache' }),
          fetch('/api/expert-services/experts', { cache: 'force-cache' }),
        ]);

        if (examinersResult.status === 'fulfilled') {
          if (examinersResult.value.ok) {
            const data = await examinersResult.value.json().catch(() => null);
            const list = Array.isArray(data?.examiners) ? data.examiners : [];
            ingestRecords(list, 'certified_examiner');
          } else {
            console.warn('[ttontok] examiner directory request failed', examinersResult.value.status);
          }
        }

        if (expertsResult.status === 'fulfilled') {
          if (expertsResult.value.ok) {
            const data = await expertsResult.value.json().catch(() => null);
            const list = Array.isArray(data?.experts) ? data.experts : [];
            ingestRecords(list, 'expert');
          } else {
            console.warn('[ttontok] expert directory request failed', expertsResult.value.status);
          }
        }
      } catch (error) {
        console.error('[ttontok] failed to load professional directory', error);
      }

      const fallbackExaminers = certifiedExaminers.map((examiner) => ({
        name: stripRoleDecorations(examiner.name) || examiner.name,
        companyName: typeof examiner.companyName === 'string' ? examiner.companyName.trim() : '',
      }));
      ingestRecords(fallbackExaminers, 'certified_examiner');

      const fallbackExperts = VERIFIED_EXPERT_PROFILES.map((expert) => ({
        name: stripRoleDecorations(expert.name) || expert.name,
        companyName: typeof expert.companyName === 'string' ? expert.companyName.trim() : '',
      }));
      ingestRecords(fallbackExperts, 'expert');

      if (isActive) {
        setProfessionalDirectory((prev) =>
          Object.keys(directory).length > 0 ? directory : prev
        );
      }
    };

    void loadProfessionalDirectory();

    return () => {
      isActive = false;
    };
  }, [hasProfessionalReplies]);

  const handleLike = async () => {
    if (!post || liked) return;

    try {
      const response = await fetch(`/api/business-voice/ttontok/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likeCount: post.likeCount + 1
        }),
      });

      if (response.ok) {
        setPost({ ...post, likeCount: post.likeCount + 1 });
        setLiked(true);
      }
    } catch (error) {
      console.error('좋아요 실패:', error);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 로그인 체크
    alert('회원가입 후 댓글 작성이 가능합니다.');
    return;

    if (!replyContent.trim() || !replyNickname.trim()) {
      alert('닉네임과 내용을 입력해주세요.');
      return;
    }

    // For professional roles, company name is required
    if ((replyRole === 'certified_examiner' || replyRole === 'expert') && !replyCompanyName.trim()) {
      alert('전문가/검증자의 경우 회사명을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/business-voice/ttontok/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: replyNickname,
          companyName: replyCompanyName,
          content: replyContent,
          role: replyRole,
        }),
      });

      if (response.ok) {
        const newReply = await response.json();
        setReplies([...replies, newReply]);
        setReplyContent('');
        setReplyNickname('');
        setReplyCompanyName('');
        setReplyRole('general');
        if (post) {
          setPost({ ...post, replyCount: post.replyCount + 1 });
        }
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <div className="ttontok-detail-loading">
        <div className="loading-spinner">로딩 중...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="ttontok-detail-error">
        <h2>게시글을 찾을 수 없습니다</h2>
        <Link href="/business-voice" className="back-to-list">목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="ttontok-detail-container">
      <div className="ttontok-detail-wrapper">
        {/* 헤더 */}
        <div className="detail-header">
          <div className="header-top">
            <span className={`category-badge category-${post.category}`}>
              {CATEGORY_LABELS[post.category]}
            </span>
            {post.isPinned && <span className="pinned-badge">📌 고정됨</span>}
          </div>
          <h1 className="detail-title">{post.title}</h1>
          <div className="detail-meta">
            <div className="meta-left">
              <span className="author">{post.nickname}</span>
              <span className="date">{formatDate(post.createdAt)}</span>
            </div>
            <div className="meta-right">
              <span className="views">조회 {post.viewCount.toLocaleString()}</span>
              <span className="likes">좋아요 {post.likeCount}</span>
              <span className="replies">댓글 {post.replyCount}</span>
            </div>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="detail-tags">
              {post.tags.map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* 본문 */}
        <div className="detail-content">
          <div className="content-text" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* 액션 버튼 */}
        <div className="detail-actions">
          <button
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={liked}
          >
            <i className={`${liked ? 'fas' : 'far'} fa-thumbs-up`} />
            <span>좋아요 {post.likeCount}</span>
          </button>
          <button className="share-btn">
            <i className="fas fa-share-alt" />
            <span>공유하기</span>
          </button>
        </div>

        {/* 댓글 섹션 */}
        <div className="replies-section">
          <h3 className="replies-title">댓글 {replies.length}</h3>

          {/* 댓글 작성 폼 */}
          <form className="reply-form" onSubmit={handleReplySubmit}>
            <div className="reply-form-header">
              <div className="reply-inputs-row">
                <input
                  type="text"
                  placeholder="닉네임"
                  value={replyNickname}
                  onChange={(e) => setReplyNickname(e.target.value)}
                  className="reply-nickname-input"
                  maxLength={20}
                />
              </div>
            </div>
            <textarea
              placeholder="댓글을 입력해주세요..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="reply-textarea"
              rows={3}
            />
            <button type="submit" className="reply-submit-btn">
              댓글 작성
            </button>
          </form>

          {/* 댓글 목록 */}
          <div className="replies-list">
            {replies.map((reply) => {
              const isExaminer = reply.role === 'certified_examiner';
              const isExpert = reply.role === 'expert';
              const professionalClass = isExaminer ? 'reply-examiner' : isExpert ? 'reply-expert' : '';
              const itemClassName = professionalClass ? 'reply-item ' + professionalClass : 'reply-item';
              const profileKey = normalizeProfessionalKey(reply.nickname);
              const professionalProfile = professionalDirectory[profileKey];
              const fallbackName = stripRoleDecorations(reply.nickname) || reply.nickname || '익명';
              const displayName = professionalProfile?.name || fallbackName;
              const displayCompany = (professionalProfile?.companyName || reply.companyName || '').trim();
              const showCompany = (isExaminer || isExpert) && displayCompany.length > 0;

              return (
                <div key={reply.id} className={itemClassName}>
                  <div className="reply-header">
                    <div className="reply-author">
                      <div className="reply-author-info">
                        {showCompany && (
                          <span className="reply-company">{displayCompany}</span>
                        )}
                        <span className="reply-name">{displayName}</span>
                      </div>
                    </div>
                    <span className="reply-date">{formatDate(reply.createdAt)}</span>
                  </div>
                  <div className="reply-content">{reply.content}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 목록 버튼 */}
        <div className="detail-footer">
          <Link href="/business-voice" className="back-btn">
            <i className="fas fa-list" /> 목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}