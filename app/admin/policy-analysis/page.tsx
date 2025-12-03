'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 정책분석 게시글 관리 페이지
 *
 * @purpose 관리자가 정책분석 게시글을 관리하는 페이지
 * @context NextAuth 세션 기반 인증으로 관리자만 접근 가능
 * @note 관리자가 기업심사관을 선택하여 게시글 작성/수정/삭제 가능
 */

interface PolicyAnalysisPost {
  _id: string;
  title: string;
  category: string;
  excerpt: string;
  examiner: {
    key: string;
    name: string;
    companyName: string;
  };
  views: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Examiner {
  _id: string;
  name: string;
  companyName: string;
  legacyKey?: string;
}

export default function AdminPolicyAnalysisPage() {
  const router = useRouter();

  // 게시글 목록 관리
  const [posts, setPosts] = useState<PolicyAnalysisPost[]>([]);
  const [loading, setLoading] = useState(false);

  // 삭제 관련 상태
  const [selectedPost, setSelectedPost] = useState<PolicyAnalysisPost | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 기업심사관 목록 (조회용)
  const [examiners, setExaminers] = useState<Examiner[]>([]);

  // 조회수 조정 관련 상태
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [viewsPost, setViewsPost] = useState<PolicyAnalysisPost | null>(null);
  const [newViews, setNewViews] = useState(0);
  const [updatingViews, setUpdatingViews] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchExaminers();
  }, []);

  /**
   * 기업심사관 목록 조회
   *
   * @purpose 게시글 작성 시 기업심사관 선택을 위한 목록 가져오기
   * @context /api/admin/examiners API를 통해 모든 기업심사관 정보 조회
   */
  const fetchExaminers = async () => {
    try {
      const response = await fetch('/api/admin/examiners', {
        headers: {
          'x-admin-auth': 'true'
        }
      });
      const data = await response.json();
      if (data.examiners) {
        setExaminers(data.examiners);
      }
    } catch (error) {
      console.error('Error fetching examiners:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/policy-analysis?limit=100');
      const data = await response.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      alert('게시글 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (post: PolicyAnalysisPost) => {
    setSelectedPost(post);
    setShowDeleteModal(true);
  };

  /**
   * 게시글 삭제
   *
   * @purpose 세션 기반 인증으로 게시글 삭제
   * @context NextAuth 세션을 통해 권한 확인 (관리자만 가능)
   * @note 비밀번호 인증 제거, 세션 기반으로 변경
   */
  const handleDelete = async () => {
    if (!selectedPost) return;

    if (!confirm('정말로 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/policy-analysis/${selectedPost._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert('게시글이 삭제되었습니다.');
        setShowDeleteModal(false);
        setSelectedPost(null);
        fetchPosts();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 조회수 조정 모달 열기
   *
   * @purpose 관리자가 게시글 조회수를 직접 수정할 수 있도록 함
   * @context 조회수를 클릭하면 모달이 열리고 새로운 조회수 입력 가능
   */
  const handleViewsClick = (post: PolicyAnalysisPost) => {
    setViewsPost(post);
    setNewViews(post.views);
    setShowViewsModal(true);
  };

  /**
   * 조회수 업데이트
   *
   * @purpose 입력받은 조회수로 게시글 업데이트
   * @context 세션 기반 인증으로 관리자 권한 확인
   * @note 기존 게시글 데이터를 먼저 조회하고 views만 변경하여 PUT
   */
  const handleViewsUpdate = async () => {
    if (!viewsPost) return;
    if (newViews < 0) {
      alert('조회수는 0 이상이어야 합니다.');
      return;
    }

    setUpdatingViews(true);
    try {
      // 먼저 기존 게시글 전체 데이터 조회
      const getResponse = await fetch(`/api/policy-analysis/${viewsPost._id}`);
      const getData = await getResponse.json();

      if (!getResponse.ok || !getData.post) {
        alert('게시글 정보를 불러오는데 실패했습니다.');
        setUpdatingViews(false);
        return;
      }

      const currentPost = getData.post;

      // 기존 데이터를 유지하면서 views만 변경
      const response = await fetch(`/api/policy-analysis/${viewsPost._id}`, {
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
          examinerKey: currentPost.examiner?.key,
          isStructured: currentPost.isStructured,
          sections: currentPost.sections || [],
          images: currentPost.images || [],
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
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '날짜 없음';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>정책분석 관리</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/policy-analysis/write" style={{
            padding: '8px 16px',
            background: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            + 새 게시글 작성
          </Link>
          <button onClick={fetchPosts} style={{
            padding: '8px 16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            새로고침
          </button>
          <button onClick={() => router.push('/policy-analysis')} style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            사용자 페이지 보기
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          로딩 중...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          등록된 게시글이 없습니다.
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>번호</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>제목</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>작성자</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>카테고리</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>조회수</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>작성일</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, index) => (
                <tr key={post._id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{posts.length - index}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <Link
                      href={`/policy-analysis/${post._id}`}
                      target="_blank"
                      style={{ color: '#2196F3', textDecoration: 'none' }}
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <div>{post.examiner.name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{post.examiner.companyName}</div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{post.category}</td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#2196F3',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    onClick={() => handleViewsClick(post)}
                    title="클릭하여 조회수 수정"
                  >
                    {post.views.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {formatDate(post.createdAt)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Link
                        href={`/policy-analysis/${post._id}/edit`}
                        style={{
                          padding: '6px 12px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(post)}
                        style={{
                          padding: '6px 12px',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        삭제
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
              &quot;{viewsPost.title}&quot;
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

      {/* 삭제 확인 모달 */}
      {showDeleteModal && selectedPost && (
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
              게시글 삭제
            </h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              &quot;{selectedPost.title}&quot; 게시글을 삭제하시겠습니까?
            </p>
            <p style={{ marginBottom: '16px', color: '#f44336', fontSize: '14px' }}>
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPost(null);
                }}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1
                }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1
                }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
