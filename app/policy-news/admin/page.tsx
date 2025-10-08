'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<PolicyNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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