'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './ttontok-compact.css';

interface TtontokPost {
  id: string;
  title: string;
  content?: string;
  nickname: string;
  category: string;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  tags?: string[];
  isBest?: boolean;
  replies?: TtontokComment[];
  createdAt: string;
  updatedAt: string;
}

interface TtontokComment {
  _id?: string;
  author: string;
  content: string;
  createdAt: string;
}


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

export default function TtontokCompact() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<TtontokPost[]>([]);
  const [bestPosts, setBestPosts] = useState<TtontokPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/business-voice/ttontok');
      const data = await response.json();

      if (data.items) {
        setPosts(data.items);
        // isBest 플래그가 있는 게시글만 베스트로 표시
        const bestItems = data.items.filter((post: TtontokPost) => post.isBest);
        setBestPosts(bestItems.slice(0, 2)); // 최대 2개만 표시
      }
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
      setPosts([]);
      setBestPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays}일 전`;
    if (diffHours > 0) return `${diffHours}시간 전`;
    if (diffMins > 0) return `${diffMins}분 전`;
    return '방금 전';
  };

  const formatDate = (dateString: string, fullFormat = false): string => {
    const date = new Date(dateString);

    if (fullFormat) {
      // 테이블용 전체 형식
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    }

    // 간단한 형식
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleWriteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // 로그인 상태 확인
    if (!session) {
      alert('로그인 후 작성 가능합니다.');
      router.push('/auth/login?callbackUrl=/business-voice/ttontok/write');
      return;
    }

    // 로그인한 경우 작성 페이지로 이동
    router.push('/business-voice/ttontok/write');
  };

  return (
    <section id="ttontok-section" className="ttontok-compact">
      <div className="ttontok-container">
        {/* 헤더 */}
        <div className="section-header">
          <h2>똔톡 - 실시간 사업자 이야기</h2>
          <p>사업자 고충과 정보를 공유하는 톡게시판</p>
        </div>

        {/* 베스트 똔톡 2개 */}
        <div className="ttontok-best-section">
          <h3 className="section-title">🔥 베스트 똔톡</h3>
          <div className="ttontok-best-grid">
            {bestPosts.map((post) => {
              return (
                <Link key={post.id} href={`/business-voice/ttontok/${post.id}`} className="ttontok-best-card">
                  <div className="best-badge">BEST</div>
                  <div className="best-header-title">
                    <span className={`category-badge category-${post.category}`}>
                      {CATEGORY_LABELS[post.category]}
                    </span>
                    <h4 className="best-title">{post.title}</h4>
                  </div>
                  <div className="best-author">
                    <span className="author-date">{formatDate(post.createdAt)}</span>
                    <span className="author-name">{post.nickname}</span>
                    <div className="best-stats">
                      <span>👍 {post.likeCount}</span>
                      <span>👁 {post.viewCount.toLocaleString()}</span>
                      <span>💬 {post.replyCount || 0}</span>
                    </div>
                  </div>
                  <p className="best-content">{post.content || ''}</p>

                  {/* 댓글 영역 */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="best-replies">
                      <div className="replies-header">
                        <span className="replies-title">댓글 {post.replies.length}</span>
                      </div>
                      {(expandedComments[post.id] ? post.replies : post.replies.slice(0, 5)).map((comment, idx) => {
                        const isExaminer = comment.author.includes('김태수') || comment.author.includes('박성훈') || comment.author.includes('이정민');
                        const isExpert = comment.author.includes('양미진') || comment.author.includes('전예진') || comment.author.includes('최서연');
                        return (
                          <div key={idx} className={`reply-item ${isExaminer ? 'reply-certified_examiner' : isExpert ? 'reply-expert' : ''}`}>
                            <span className="reply-author">
                              {isExaminer && '🏆 '}
                              {isExpert && '⭐ '}
                              {comment.author}
                            </span>
                            <span className="reply-content">{comment.content}</span>
                            <span className="reply-time">{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                        );
                      })}
                      {post.replies.length > 5 && !expandedComments[post.id] && (
                        <div className="more-replies" onClick={() => setExpandedComments({...expandedComments, [post.id]: true})}>
                          + {post.replies.length - 5}개 더보기
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 목록형 게시판 */}
        <div className="ttontok-table-section">
          <div className="section-header-row">
            <h3 className="section-title">전체 똔톡</h3>
            <Link href="/ttontok" className="view-all-link">
              전체보기 →
            </Link>
          </div>

          <div className="ttontok-table-wrapper">
            <table className="ttontok-table">
              <thead>
                <tr>
                  <th width="60">번호</th>
                  <th width="80">카테고리</th>
                  <th>제목</th>
                  <th width="100">작성자</th>
                  <th width="120">작성일</th>
                  <th width="60">조회</th>
                  <th width="80">좋아요</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, index) => {
                  const isPinned = index === 0;
                  return (
                    <tr key={post.id} className="ttontok-row">
                      <td className="number-cell">
                        {post.isPinned ? <span className="pin-badge">📌</span> : posts.length - index}
                      </td>
                      <td>
                        <span className={`category-badge category-${post.category}`}>
                          {CATEGORY_LABELS[post.category]}
                        </span>
                      </td>
                      <td className="title-cell">
                        <Link href={`/business-voice/ttontok/${post.id}`} className="title-link">
                          {post.title}
                          {post.replyCount > 0 && (
                            <span className="reply-count">[{post.replyCount}]</span>
                          )}
                          {post.likeCount > 100 && <span className="hot-badge">🔥</span>}
                        </Link>
                      </td>
                      <td className="author-cell">{post.nickname}</td>
                      <td className="date-cell">{formatDate(post.createdAt, true)}</td>
                      <td className="number-cell">{post.viewCount}</td>
                      <td className="number-cell like-cell">{post.likeCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="pagination">
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn">3</button>
            <button className="page-btn">4</button>
            <button className="page-btn">5</button>
            <button className="page-btn next">다음 ›</button>
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="ttontok-actions">
          <a href="#" onClick={handleWriteClick} className="write-btn">
            <i className="fas fa-edit" /> 똔톡 작성하기
          </a>
        </div>
      </div>
    </section>
  );
}