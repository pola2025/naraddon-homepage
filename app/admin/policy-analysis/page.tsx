'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 정책분석 게시글 관리 페이지
 *
 * @purpose 관리자가 정책분석 게시글을 관리하는 페이지
 * @context 관리자가 기업심사관을 선택하여 게시글 작성 가능
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
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // 작성 관련 상태
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    category: '기타',
    excerpt: '',
    content: '',
    tags: '',
    examinerKey: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

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

  /**
   * 게시글 작성 함수
   *
   * @purpose 관리자가 기업심사관을 선택하여 정책분석 게시글 작성
   * @context POLICY_ANALYSIS_PASSWORD로 인증하여 작성
   * @note 선택한 기업심사관이 작성한 것처럼 게시글 등록
   */
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    if (!formData.examinerKey) {
      alert('기업심사관을 선택해주세요.');
      return;
    }
    if (!formData.password.trim()) {
      alert('관리자 비밀번호를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch('/api/policy-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          category: formData.category,
          excerpt: formData.excerpt.trim(),
          content: formData.content.trim(),
          tags: tagsArray,
          examinerKey: formData.examinerKey,
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.post) {
        alert('게시글이 등록되었습니다.');
        setShowWriteModal(false);
        setFormData({
          title: '',
          category: '기타',
          excerpt: '',
          content: '',
          tags: '',
          examinerKey: '',
          password: '',
        });
        fetchPosts();
      } else {
        alert(data.message || '등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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
          <button onClick={() => setShowWriteModal(true)} style={{
            padding: '8px 16px',
            background: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            + 새 게시글 작성
          </button>
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

      {/* 게시글 작성 모달 */}
      {showWriteModal && (
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
          zIndex: 1000,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
              새 정책분석 게시글 작성
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 기업심사관 선택 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  기업심사관 선택 <span style={{ color: '#f44336' }}>*</span>
                </label>
                <select
                  value={formData.examinerKey}
                  onChange={(e) => setFormData({ ...formData, examinerKey: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">기업심사관을 선택하세요</option>
                  {examiners.map((examiner) => (
                    <option key={examiner._id} value={examiner.legacyKey || examiner._id}>
                      {examiner.name} - {examiner.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 제목 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  제목 <span style={{ color: '#f44336' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="제목을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  카테고리
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="기타">기타</option>
                  <option value="금융">금융</option>
                  <option value="세무">세무</option>
                  <option value="노동">노동</option>
                  <option value="환경">환경</option>
                  <option value="산업">산업</option>
                </select>
              </div>

              {/* 요약 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  요약 (선택)
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="게시글 요약을 입력하세요"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* 내용 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  내용 <span style={{ color: '#f44336' }}>*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="내용을 입력하세요"
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* 태그 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="예: 정책, 분석, 금융"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* 관리자 비밀번호 */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  관리자 비밀번호 <span style={{ color: '#f44336' }}>*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="비밀번호를 입력하세요"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowWriteModal(false);
                  setFormData({
                    title: '',
                    category: '기타',
                    excerpt: '',
                    content: '',
                    tags: '',
                    examinerKey: '',
                    password: '',
                  });
                }}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  background: '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? '등록 중...' : '등록'}
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
