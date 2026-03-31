'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MotionLoader } from '@/components/loading';
import './DDonTalk.css';

interface Comment {
  _id?: string;
  author: string;
  content: string;
  createdAt: string;
}

interface DDonTalkPost {
  _id: string;
  title: string;
  content: string;
  author: string;
  company: string;
  likes: number;
  comments: Comment[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function DDonTalk() {
  const [posts, setPosts] = useState<DDonTalkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState<DDonTalkPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    company: '',
  });
  const [commentForm, setCommentForm] = useState({
    author: '',
    content: '',
  });

  const { user } = useAuth();
  const router = useRouter();

  // 게시글 목록 불러오기
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/ddontalk');
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error('게시글 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 게시글 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('회원가입이 필요합니다.');
      router.push('/login');
      return;
    }

    if (formData.content.length > 200) {
      alert('내용은 200자 이내로 작성해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/ddontalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowWriteForm(false);
        setFormData({ title: '', content: '', author: '', company: '' });
        fetchPosts();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      alert('게시글 작성에 실패했습니다.');
    }
  };

  // 댓글 작성
  const handleCommentSubmit = async (postId: string) => {
    if (!commentForm.author || !commentForm.content) {
      alert('작성자와 내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/ddontalk/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentForm),
      });

      const data = await response.json();
      if (data.success) {
        setCommentForm({ author: '', content: '' });
        fetchPosts();
        if (selectedPost?._id === postId) {
          setSelectedPost(data.data);
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  // 좋아요
  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/ddontalk/${postId}/likes`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        fetchPosts();
      }
    } catch (error) {
      console.error('좋아요 실패:', error);
    }
  };

  // 작성하기 버튼 클릭
  const handleWriteClick = () => {
    if (!user) {
      alert('회원가입이 필요합니다.');
      router.push('/login');
      return;
    }
    setShowWriteForm(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\. /g, '.');
  };

  if (loading) return <MotionLoader variant="typing" message="똔톡 불러오는 중" />;

  return (
    <div className="ddontalk-section">
      <div className="ddontalk-container">
        <div className="ddontalk-header">
          <h2>똔톡</h2>
          <p>사업자들의 생생한 후기와 경험을 공유합니다</p>
        </div>

        <div className="ddontalk-toolbar">
          <button className="ddontalk-write-btn" onClick={handleWriteClick}>
            <span className="write-icon">✍️</span> 작성하기
          </button>
        </div>

        {showWriteForm && (
          <div className="ddontalk-write-modal">
            <div className="ddontalk-write-content">
              <h3>똔톡 작성하기</h3>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="제목을 입력하세요"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <textarea
                  placeholder="내용을 입력하세요 (200자 이내)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  maxLength={200}
                  required
                />
                <div className="char-count">{formData.content.length}/200</div>
                <input
                  type="text"
                  placeholder="작성자"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="회사명"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
                <div className="form-buttons">
                  <button type="button" onClick={() => setShowWriteForm(false)}>
                    취소
                  </button>
                  <button type="submit">등록</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="ddontalk-list">
          {posts.map((post) => (
            <div key={post._id} className="ddontalk-item">
              <div className="ddontalk-main" onClick={() => setSelectedPost(post)}>
                <h3>
                  {post.title}
                  <span className="comment-count">({post.commentCount})</span>
                </h3>
                <p className="ddontalk-content">{post.content}</p>
                <div className="ddontalk-meta">
                  <span className="author">
                    {post.author} · {post.company}
                  </span>
                  <span className="date">{formatDate(post.createdAt)}</span>
                  <button
                    className="like-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post._id);
                    }}
                  >
                    ❤️ {post.likes}
                  </button>
                </div>
              </div>

              {selectedPost?._id === post._id && (
                <div className="ddontalk-detail">
                  <div className="comments-section">
                    <h4>댓글 ({post.commentCount})</h4>

                    <div className="comments-list">
                      {post.comments.map((comment, idx) => (
                        <div key={comment._id || idx} className="comment-item">
                          <strong>{comment.author}</strong>
                          <p>{comment.content}</p>
                          <span className="comment-date">{formatDate(comment.createdAt)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="comment-form">
                      <input
                        type="text"
                        placeholder="이름"
                        value={commentForm.author}
                        onChange={(e) => setCommentForm({ ...commentForm, author: e.target.value })}
                      />
                      <textarea
                        placeholder="댓글을 입력하세요"
                        value={commentForm.content}
                        onChange={(e) =>
                          setCommentForm({ ...commentForm, content: e.target.value })
                        }
                      />
                      <button onClick={() => handleCommentSubmit(post._id)}>댓글 작성</button>
                    </div>
                  </div>

                  <button className="close-detail" onClick={() => setSelectedPost(null)}>
                    닫기
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
