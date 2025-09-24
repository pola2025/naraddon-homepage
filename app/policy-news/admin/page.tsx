'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './admin.css';

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
}

export default function PolicyNewsAdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [posts, setPosts] = useState<PolicyNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 세션 확인
    const cached = sessionStorage.getItem('policyNewsAuthorized');
    if (cached === 'true') {
      setIsAuthorized(true);
      fetchPosts();
    }
  }, []);

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setVerifyError('비밀번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    try {
      const response = await fetch('/api/policy-news/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      if (!response.ok) {
        throw new Error('비밀번호가 올바르지 않습니다.');
      }

      sessionStorage.setItem('policyNewsAuthorized', 'true');
      setIsAuthorized(true);
      fetchPosts();
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : '인증 실패');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmPassword = window.prompt(`"${title}" 게시글을 삭제하시겠습니까?\n\n비밀번호를 입력하세요:`);
    if (!confirmPassword) return;

    try {
      const response = await fetch(`/api/policy-news/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: confirmPassword })
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return '날짜 없음';
    }
  };

  if (!isAuthorized) {
    return (
      <div className="admin-login-container">
        <form className="admin-login-form" onSubmit={handlePasswordSubmit}>
          <h1>정책소식 관리자 페이지</h1>
          <p>관리자 비밀번호를 입력하세요</p>

          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setVerifyError('');
            }}
            placeholder="비밀번호"
            disabled={isVerifying}
            autoFocus
          />

          {verifyError && <div className="error-message">{verifyError}</div>}

          <button type="submit" disabled={isVerifying}>
            {isVerifying ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    );
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
                  <td>{post.views.toLocaleString()}</td>
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
    </div>
  );
}