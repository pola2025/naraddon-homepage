'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import './page.css';

interface Comment {
  _id?: string;
  author: string;
  content: string;
  createdAt: string;
  authorCompany?: string;
}

interface TtontokPost {
  _id: string;
  title: string;
  content: string;
  author: string;
  company: string;
  category: string;
  viewCount: number;
  likes: number;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
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

// 사전 정의된 작성자 목록 (admin 페이지와 동일)
const PREDEFINED_AUTHORS = {
  examiners: [
    '권혁중 (기업심사관)',
    '길진영 (기업심사관)',
    '김범준 (기업심사관)',
    '김수빈 (기업심사관)',
    '김영희 (기업심사관)',
    '김태수 (기업심사관)',
    '김태은 (기업심사관)',
    '박민재 (기업심사관)',
    '박성훈 (기업심사관)',
    '박현숙 (기업심사관)',
    '손지숙 (기업심사관)',
    '양미진 (기업심사관)',
    '이용흔 (기업심사관)',
    '전예진 (기업심사관)',
    '전윤지 (기업심사관)',
    '전지선 (기업심사관)',
    '천명숙 (기업심사관)',
    '태건호 (기업심사관)',
    '팽성희 (기업심사관)',
    '황만규 (기업심사관)'
  ],
  experts: [
    '백경우 (전문가)',
    '성민석 (전문가)',
    '전기홍 (전문가)',
    '최일현 (전문가)'
  ],
  general: [
    '커피한잔',
    '빵굽는사람',
    '꽃집사장',
    '행복가득',
    '스타트업꿈나무',
    '청년사업가'
  ]
};

export default function DDonTalkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<TtontokPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPost, setEditedPost] = useState<TtontokPost | null>(null);
  const [examinersMap, setExaminersMap] = useState<Record<string, string>>({});
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    // admin 인증 상태 확인
    const authStatus = localStorage.getItem('ttontokAdminAuth');
    setIsAdmin(authStatus === 'authenticated');

    // 좋아요 상태 확인
    const likedPosts = JSON.parse(localStorage.getItem('ttontokLikedPosts') || '[]');
    setIsLiked(likedPosts.includes(params.id));

    fetchPost();
    fetchExaminers();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/ddontalk/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setPost(data.post);
        setEditedPost(data.post);
      } else {
        alert('게시글을 찾을 수 없습니다.');
        router.push('/business-voice#ttontok-section');
      }
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExaminers = async () => {
    try {
      const response = await fetch('/api/naraddon-tube/examiners');
      const data = await response.json();

      if (data.examiners) {
        const map: Record<string, string> = {};
        const examinersList: string[] = [];

        data.examiners.forEach((examiner: any) => {
          // 회사명이 있으면 회사명 사용, 없으면 '기업심사관' 사용
          const authorName = examiner.companyName ?
            `${examiner.name} (${examiner.companyName})` :
            `${examiner.name} (기업심사관)`;

          examinersList.push(authorName);
          map[authorName] = examiner.companyName || '';
        });

        // PREDEFINED_AUTHORS 업데이트
        PREDEFINED_AUTHORS.examiners = examinersList;
        setExaminersMap(map);
      }
    } catch (error) {
      console.error('심사관 정보 불러오기 실패:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editedPost) return;

    try {
      const response = await fetch(`/api/ddontalk/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedPost)
      });

      const data = await response.json();
      if (data.success) {
        alert('게시글이 수정되었습니다.');
        setPost(data.post);
        setEditMode(false);
      }
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정에 실패했습니다.');
    }
  };

  const handleLike = async () => {
    if (isLiking || !post) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/ddontalk/${params.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isLiked ? 'unlike' : 'like' })
      });

      const data = await response.json();
      if (data.success) {
        setPost({ ...post, likes: data.likes });
        setIsLiked(!isLiked);

        // 로컬스토리지에 좋아요 상태 저장
        const likedPosts = JSON.parse(localStorage.getItem('ttontokLikedPosts') || '[]');
        if (isLiked) {
          const filtered = likedPosts.filter((id: string) => id !== params.id);
          localStorage.setItem('ttontokLikedPosts', JSON.stringify(filtered));
        } else {
          likedPosts.push(params.id);
          localStorage.setItem('ttontokLikedPosts', JSON.stringify(likedPosts));
        }
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/ddontalk/${params.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('게시글이 삭제되었습니다.');
        router.push('/business-voice#ttontok-section');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleAddComment = () => {
    if (!editedPost) return;

    const newComment = {
      author: '새 댓글 작성자',
      content: '댓글 내용을 입력하세요',
      createdAt: new Date().toISOString()
    };

    setEditedPost({
      ...editedPost,
      comments: [...(editedPost.comments || []), newComment]
    });
  };

  const handleDeleteComment = (index: number) => {
    if (!editedPost) return;

    const updatedComments = editedPost.comments.filter((_, i) => i !== index);
    setEditedPost({ ...editedPost, comments: updatedComments });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
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

  if (isLoading) {
    return (
      <div className="ddontalk-detail-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="ddontalk-detail-container">
        <div className="error">게시글을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="ddontalk-detail-container">
      <div className="ddontalk-detail-wrapper">
        {/* 헤더 */}
        <div className="detail-header">
          <Link href="/business-voice#ttontok-section" className="back-button">
            <i className="fas fa-arrow-left" /> 목록으로
          </Link>
        </div>

        {/* 게시글 본문 */}
        <div className="detail-post">
          {editMode ? (
            <div className="edit-form">
              <input
                type="text"
                value={editedPost?.title}
                onChange={(e) => setEditedPost({ ...editedPost!, title: e.target.value })}
                placeholder="제목"
              />
              <input
                type="text"
                value={editedPost?.author}
                onChange={(e) => setEditedPost({ ...editedPost!, author: e.target.value })}
                placeholder="작성자"
              />
              <input
                type="text"
                value={editedPost?.company}
                onChange={(e) => setEditedPost({ ...editedPost!, company: e.target.value })}
                placeholder="회사"
              />
              <select
                value={editedPost?.category}
                onChange={(e) => setEditedPost({ ...editedPost!, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <textarea
                value={editedPost?.content}
                onChange={(e) => setEditedPost({ ...editedPost!, content: e.target.value })}
                placeholder="내용"
                rows={10}
              />
            </div>
          ) : (
            <>
              <div className="post-header">
                <h1 className="post-title">
                  <span className={`category-badge category-${post.category}`}>
                    {CATEGORY_LABELS[post.category]}
                  </span>
                  {post.title}
                </h1>
                <div className="post-meta">
                  <span className="author">{post.author}</span>
                  {post.company && <span className="company">({post.company})</span>}
                  <span className="date">{formatDate(post.createdAt)}</span>
                  <div className="post-stats">
                    <span>👁 {post.viewCount}</span>
                    <span>👍 {post.likes}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="post-content">
                {post.content.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>

              <div className="post-actions">
                <button
                  className={`like-button ${isLiked ? 'liked' : ''}`}
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  {isLiked ? '❤️' : '🤍'} 좋아요 {post.likes > 0 && `(${post.likes})`}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 댓글 섹션 */}
        <div className="detail-comments">
          <h3 className="comments-title">댓글 {editMode ? editedPost?.comments?.length : post.comments?.length || 0}</h3>

          {editMode ? (
            <div className="comments-editor">
              {editedPost?.comments?.map((comment, index) => (
                <div key={index} className="comment-edit-item">
                  <select
                    value={comment.author}
                    onChange={(e) => {
                      const updatedComments = [...editedPost.comments];
                      updatedComments[index] = { ...comment, author: e.target.value };
                      setEditedPost({ ...editedPost, comments: updatedComments });
                    }}
                  >
                    <option value={comment.author}>{comment.author}</option>
                    <optgroup label="기업심사관">
                      {PREDEFINED_AUTHORS.examiners.map(author => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </optgroup>
                    <optgroup label="전문가">
                      {PREDEFINED_AUTHORS.experts.map(author => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </optgroup>
                    <optgroup label="일반 사용자">
                      {PREDEFINED_AUTHORS.general.map(author => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </optgroup>
                  </select>
                  <textarea
                    value={comment.content}
                    onChange={(e) => {
                      const updatedComments = [...editedPost.comments];
                      updatedComments[index] = { ...comment, content: e.target.value };
                      setEditedPost({ ...editedPost, comments: updatedComments });
                    }}
                    rows={2}
                  />
                  <button
                    className="delete-comment-btn"
                    onClick={() => handleDeleteComment(index)}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button className="add-comment-btn" onClick={handleAddComment}>
                댓글 추가
              </button>
            </div>
          ) : (
            <div className="comments-list">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment, index) => {
                  // 회사명이 포함되었는지 또는 기업심사관인지 확인
                  const hasCompanyName = comment.author.match(/\(([^)]+)\)$/);
                  const isExaminer = hasCompanyName && hasCompanyName[1] !== '전문가' && hasCompanyName[1] !== '일반';
                  const isExpert = comment.author.includes('(전문가)');

                  return (
                    <div
                      key={comment._id || index}
                      className={`comment-item ${isExaminer ? 'comment-examiner' : isExpert ? 'comment-expert' : ''}`}
                    >
                      <div className="comment-header">
                        <span className="comment-author">
                          {isExaminer && '🏆 '}
                          {isExpert && '⭐ '}
                          {comment.author}
                        </span>
                        <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  );
                })
              ) : (
                <div className="no-comments">아직 댓글이 없습니다.</div>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="detail-actions">
          <Link href="/business-voice#ttontok-section" className="list-button">
            목록으로
          </Link>
          {isAdmin && (
            <Link href="/business-voice/admin" className="admin-button">
              관리자 페이지
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}