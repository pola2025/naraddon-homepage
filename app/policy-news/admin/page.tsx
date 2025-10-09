'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import './admin.css';

/**
 * 정책소식 관리자 페이지
 *
 * @purpose 관리자가 정책소식 게시글 관리 (조회, 삭제, 조회수 조정)
 * @context NextAuth 세션 기반 인증 사용
 */

interface PolicyNewsItem {
  _id: string;
  title: string;
  category: string;
  excerpt: string;
  thumbnail: string;
  views: number;
  likes: number;
  isPinned: boolean;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
  content?: string;
  tags?: string[];
  badge?: string;
}

export default function PolicyNewsAdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<PolicyNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 조회수 조정 관련 상태
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [viewsPost, setViewsPost] = useState<PolicyNewsItem | null>(null);
  const [newViews, setNewViews] = useState(0);
  const [updatingViews, setUpdatingViews] = useState(false);

  // 관리자 권한 체크
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/policy-news/admin');
    } else if (status === 'authenticated' && !isAdmin) {
      alert('관리자 권한이 필요합니다.');
      router.push('/');
    } else if (status === 'authenticated' && isAdmin) {
      fetchPosts();
    }
  }, [status, isAdmin, router]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/policy-news?limit=100');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`"${title}" 게시글을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/policy-news/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result?.message || '삭제에 실패했습니다.');
        return;
      }

      alert('게시글이 삭제되었습니다.');
      fetchPosts(); // 목록 새로고침
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  /**
   * 조회수 조정 모달 열기
   *
   * @purpose 관리자가 게시글 조회수를 직접 수정
   */
  const handleViewsClick = (post: PolicyNewsItem) => {
    setViewsPost(post);
    setNewViews(post.views);
    setShowViewsModal(true);
  };

  /**
   * 조회수 업데이트
   *
   * @purpose 입력받은 조회수로 게시글 업데이트
   * @context 기존 게시글 데이터를 먼저 조회하고 views만 변경
   */
  const handleViewsUpdate = async () => {
    if (!viewsPost) return;
    if (newViews < 0) {
      alert('조회수는 0 이상이어야 합니다.');
      return;
    }

    setUpdatingViews(true);
    try {
      // 기존 게시글 전체 데이터 조회
      const getResponse = await fetch(`/api/policy-news/${viewsPost._id}`);
      const getData = await getResponse.json();

      if (!getResponse.ok || !getData.post) {
        alert('게시글 정보를 불러오는데 실패했습니다.');
        setUpdatingViews(false);
        return;
      }

      const currentPost = getData.post;

      // 기존 데이터 유지하면서 views만 변경
      const response = await fetch(`/api/policy-news/${viewsPost._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentPost.title,
          content: currentPost.content,
          category: currentPost.category,
          excerpt: currentPost.excerpt || '',
          thumbnail: currentPost.thumbnail || '',
          tags: currentPost.tags || [],
          isMain: currentPost.isMain,
          isPinned: currentPost.isPinned,
          badge: currentPost.badge || '',
          views: newViews,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('조회수가 업데이트되었습니다.');
        setShowViewsModal(false);
        setViewsPost(null);
        fetchPosts();
      } else {
        alert(data.message || '조회수 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating views:', error);
      alert('조회수 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdatingViews(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return '날짜 없음';
    }
  };

  // 로딩 중이거나 권한 체크 중
  if (status === 'loading' || (status === 'authenticated' && !isAdmin)) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-form">
          <h1>정책소식 관리자 페이지</h1>
          <p>권한을 확인하는 중...</p>
          <div className="loading">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 처리됨)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>정책소식 관리</h1>
        <div className="admin-actions">
          <Link href="/policy-news/write" className="btn-create">
            <i className="fas fa-plus"></i> 새 게시글 작성
          </Link>
          <button onClick={fetchPosts} className="btn-refresh">
            <i className="fas fa-sync"></i> 새로고침
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">게시글을 불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <p>등록된 게시글이 없습니다.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>제목</th>
                <th>카테고리</th>
                <th>상태</th>
                <th>조회수</th>
                <th>작성일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, index) => (
                <tr key={post._id}>
                  <td>{posts.length - index}</td>
                  <td className="title-cell">
                    <Link href={`/policy-news/${post._id}`} target="_blank">
                      {post.title}
                      {post.isPinned && <span className="badge pinned">고정</span>}
                      {post.isMain && <span className="badge main">메인</span>}
                    </Link>
                  </td>
                  <td>{post.category}</td>
                  <td>
                    <span className="status-badge">게시중</span>
                  </td>
                  <td>
                    <span
                      style={{
                        color: '#2196F3',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onClick={() => handleViewsClick(post)}
                      title="클릭하여 조회수 수정"
                    >
                      {post.views.toLocaleString()}
                    </span>
                  </td>
                  <td>{formatDate(post.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        href={`/policy-news/${post._id}/edit`}
                        className="btn-edit"
                      >
                        <i className="fas fa-edit"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(post._id, post.title)}
                        className="btn-delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 조회수 조정 모달 */}
      {showViewsModal && viewsPost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              조회수 조정
            </h2>
            <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              "{viewsPost.title}"
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                새 조회수
              </label>
              <input
                type="number"
                min="0"
                value={newViews}
                onChange={(e) => setNewViews(parseInt(e.target.value) || 0)}
                placeholder="조회수를 입력하세요"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !updatingViews) {
                    handleViewsUpdate();
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowViewsModal(false);
                  setViewsPost(null);
                }}
                disabled={updatingViews}
                style={{
                  padding: '10px 20px',
                  background: '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: updatingViews ? 'not-allowed' : 'pointer',
                  opacity: updatingViews ? 0.6 : 1
                }}
              >
                취소
              </button>
              <button
                onClick={handleViewsUpdate}
                disabled={updatingViews}
                style={{
                  padding: '10px 20px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: updatingViews ? 'not-allowed' : 'pointer',
                  opacity: updatingViews ? 0.6 : 1
                }}
              >
                {updatingViews ? '업데이트 중...' : '업데이트'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
