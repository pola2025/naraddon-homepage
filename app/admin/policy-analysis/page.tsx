'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 정책분석 게시글 관리 페이지
 *
 * @purpose 관리자가 정책분석 게시글을 관리하는 페이지
 * @context 정책분석은 기업심사관이 작성하므로, 관리자는 조회/삭제만 가능
 * @note 삭제 시 비밀번호 인증 필요 (POLICY_ANALYSIS_PASSWORD 환경변수)
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

export default function AdminPolicyAnalysisPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<PolicyAnalysisPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PolicyAnalysisPost | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

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
    setPassword('');
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/policy-analysis/${selectedPost._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('게시글이 삭제되었습니다.');
        setShowDeleteModal(false);
        setSelectedPost(null);
        setPassword('');
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
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {post.views.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {formatDate(post.createdAt)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                관리자 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !deleting) {
                    handleDelete();
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPost(null);
                  setPassword('');
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
