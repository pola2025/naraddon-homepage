'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './page.css';

interface TtontokReply {
  id: string;
  content: string;
  nickname: string;
  role: 'general' | 'certified_examiner' | 'expert';
  isAccepted?: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TtontokPost {
  id: string;
  title: string;
  content: string;
  nickname: string;
  category: 'funding' | 'tax' | 'hr' | 'marketing' | 'strategy' | 'tech' | 'legal' | 'etc';
  tags: string[];
  viewCount: number;
  likeCount: number;
  replyCount: number;
  isBest?: boolean;
  replies?: TtontokReply[];
  createdAt: string;
  updatedAt: string;
}

interface NewPost {
  title: string;
  content: string;
  nickname: string;
  category: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
}

interface NewReply {
  content: string;
  nickname: string;
  role: 'general' | 'certified_examiner' | 'expert';
  likeCount: number;
}

// Admin password is now handled by server-side API

const PREDEFINED_NICKNAMES = {
  examiners: [
    '권혁중 심사관', '길진영 심사관', '김범준 심사관', '김수빈 심사관',
    '김영희 심사관', '김태수 심사관', '김태은 심사관', '박민재 심사관',
    '박성훈 심사관', '박현숙 심사관', '손지숙 심사관', '양미진 심사관',
    '이용흔 심사관', '전예진 심사관', '전윤지 심사관', '전지선 심사관',
    '천명숙 심사관', '태건호 심사관', '팽성희 심사관', '황만규 심사관'
  ],
  experts: [
    '백경우 전문가', '성민석 전문가', '전기홍 전문가', '최일현 전문가'
  ],
  general: [
    '커피한잔', '빵굽는사람', '꽃집사장', '행복가득', '스타트업꿈나무',
    '청년사업가', '도전하는청년', '카페창업준비', '치킨집사장', '편의점운영',
    '카페알바생', '예비창업자', '디저트카페', '베이커리카페', '커피매니아',
    '프랜차이즈관계자', '세무초보', '식당사장', '온라인쇼핑몰', '우산장수',
    '임대인의고민', '응원합니다', '화이팅', '꽃좋아', '마케팅고민', 'SNS전문가'
  ]
};

const formatDate = (date: string) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function BusinessVoiceAdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<TtontokPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<TtontokPost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [newReply, setNewReply] = useState<NewReply>({
    content: '',
    nickname: '',
    role: 'general',
    likeCount: 0
  });
  const [editingReplies, setEditingReplies] = useState<{[key: string]: TtontokReply}>({});

  useEffect(() => {
    const authStatus = localStorage.getItem('ttontokAdminAuth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [isAuthenticated, currentPage, selectedCategory, sortBy]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/business-voice/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('ttontokAdminAuth', 'authenticated');
        fetchPosts();
      } else {
        alert(data.message || '비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ttontokAdminAuth');
    setPassword('');
  };

  const fetchPosts = async () => {
    if (!isAuthenticated && localStorage.getItem('ttontokAdminAuth') !== 'authenticated') {
      return;
    }

    setIsLoading(true);
    try {
      let url = `/api/business-voice/ttontok?page=${currentPage}&limit=20&sort=${sortBy}`;
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setPosts(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPostDetail = async (postId: string) => {
    try {
      const response = await fetch(`/api/business-voice/ttontok/${postId}?includeReplies=true`);
      const data = await response.json();
      setSelectedPost(data);
      setEditMode(false);
      // Initialize editing state for replies
      if (data.replies) {
        const repliesMap: {[key: string]: TtontokReply} = {};
        data.replies.forEach((reply: TtontokReply) => {
          repliesMap[reply.id] = reply;
        });
        setEditingReplies(repliesMap);
      }
    } catch (error) {
      console.error('게시글 상세 불러오기 실패:', error);
    }
  };

  const handleCreatePost = async () => {
    const newPost = {
      title: '새 게시글',
      content: '내용을 입력하세요',
      nickname: '작성자',
      category: 'etc',
      tags: [],
      viewCount: 0,
      likeCount: 0
    };

    try {
      const response = await fetch('/api/business-voice/ttontok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify(newPost)
      });

      if (response.ok) {
        alert('새 게시글이 생성되었습니다.');
        fetchPosts();
      } else {
        const error = await response.json();
        alert(error.message || '게시글 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 생성 실패:', error);
      alert('게시글 생성에 실패했습니다.');
    }
  };

  const handleUpdatePost = async () => {
    if (!selectedPost) return;

    try {
      const response = await fetch(`/api/business-voice/ttontok/${selectedPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify({
          title: selectedPost.title,
          content: selectedPost.content,
          nickname: selectedPost.nickname,
          category: selectedPost.category,
          tags: selectedPost.tags,
          viewCount: selectedPost.viewCount,
          likeCount: selectedPost.likeCount,
          isBest: selectedPost.isBest,
          createdAt: selectedPost.createdAt
        })
      });

      if (response.ok) {
        alert('게시글이 수정되었습니다.');
        setEditMode(false);
        fetchPosts();
        fetchPostDetail(selectedPost.id);
      } else {
        const result = await response.json();
        alert(result.message || '게시글 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      alert('게시글 수정에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/business-voice/ttontok/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-auth': 'true'
        }
      });

      if (response.ok) {
        alert('게시글이 삭제되었습니다.');
        setSelectedPost(null);
        fetchPosts();
      }
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const handleCreateReply = async () => {
    if (!selectedPost || !newReply.content || !newReply.nickname) {
      alert('댓글 내용과 작성자를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/business-voice/ttontok/${selectedPost.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReply)
      });

      if (response.ok) {
        alert('댓글이 추가되었습니다.');
        setNewReply({ content: '', nickname: '', role: 'general', likeCount: 0 });
        fetchPostDetail(selectedPost.id);
      }
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      alert('댓글 추가에 실패했습니다.');
    }
  };

  const handleUpdateReply = async (replyId: string, updates: Partial<TtontokReply>) => {
    try {
      const response = await fetch(`/api/business-voice/ttontok/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        alert('댓글이 수정되었습니다.');
        if (selectedPost) {
          fetchPostDetail(selectedPost.id);
        }
      }
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleToggleBest = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const currentBestCount = posts.filter(p => p.isBest).length;

    // 현재 베스트가 아닌 게시글을 베스트로 만들려고 할 때, 2개 제한 체크
    if (!post.isBest && currentBestCount >= 2) {
      alert('베스트 똠톡은 최대 2개까지만 선택할 수 있습니다.');
      return;
    }

    try {
      const response = await fetch(`/api/business-voice/ttontok/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBest: !post.isBest })
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('베스트 토글 실패:', error);
      alert('베스트 설정에 실패했습니다.');
    }
  };

  const moveReplyUp = (index: number) => {
    if (!selectedPost || !selectedPost.replies || index === 0) return;

    const newReplies = [...selectedPost.replies];
    [newReplies[index - 1], newReplies[index]] = [newReplies[index], newReplies[index - 1]];
    setSelectedPost({ ...selectedPost, replies: newReplies });
  };

  const moveReplyDown = (index: number) => {
    if (!selectedPost || !selectedPost.replies || index >= selectedPost.replies.length - 1) return;

    const newReplies = [...selectedPost.replies];
    [newReplies[index], newReplies[index + 1]] = [newReplies[index + 1], newReplies[index]];
    setSelectedPost({ ...selectedPost, replies: newReplies });
  };

  const saveReplyOrder = async () => {
    if (!selectedPost || !selectedPost.replies) return;

    try {
      const repliesOrder = selectedPost.replies.map(reply => reply.id);

      const response = await fetch('/api/business-voice/replies/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: selectedPost.id,
          repliesOrder: repliesOrder
        })
      });

      if (response.ok) {
        alert('댓글 순서가 저장되었습니다.');
        fetchPostDetail(selectedPost.id);
      } else {
        const error = await response.json();
        throw new Error(error.error || '댓글 순서 저장 실패');
      }
    } catch (error) {
      console.error('댓글 순서 저장 실패:', error);
      alert('댓글 순서 저장에 실패했습니다.');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/business-voice/ttontok/replies/${replyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('댓글이 삭제되었습니다.');
        if (selectedPost) {
          fetchPostDetail(selectedPost.id);
        }
      }
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="login-box">
          <h1>똔톡 관리자 페이지</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="관리자 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit">로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>똔톡 관리자 페이지</h1>
        <div className="header-controls">
          <button onClick={() => router.push('/business-voice')} className="view-site-btn">
            사용자 페이지 보기
          </button>
          <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </div>

      <div className="admin-content">
        <div className="posts-section">
          <div className="posts-header">
            <h2>게시글 목록</h2>
            <div className="posts-controls">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-filter"
              >
                <option value="">전체 카테고리</option>
                <option value="funding">자금</option>
                <option value="tax">세무</option>
                <option value="hr">노무</option>
                <option value="marketing">마케팅</option>
                <option value="strategy">전략</option>
                <option value="tech">기술</option>
                <option value="legal">법무</option>
                <option value="etc">기타</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-filter"
              >
                <option value="latest">최신순</option>
                <option value="popular">인기순</option>
                <option value="discussed">댓글순</option>
              </select>
              <button className="new-post-btn" onClick={handleCreatePost}>
                새 게시글 작성
              </button>
            </div>
          </div>

          <div className="posts-table">
            {isLoading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>카테고리</th>
                    <th>베스트</th>
                    <th>조회수</th>
                    <th>좋아요</th>
                    <th>댓글</th>
                    <th>작성일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className={selectedPost?.id === post.id ? 'selected' : ''}>
                      <td className="title-cell">
                        {post.isBest && <span className="best-badge">⭐</span>}
                        {post.title}
                      </td>
                      <td>{post.nickname}</td>
                      <td>{post.category}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={post.isBest || false}
                          onChange={() => handleToggleBest(post.id)}
                          className="best-checkbox"
                        />
                      </td>
                      <td>{post.viewCount}</td>
                      <td>{post.likeCount}</td>
                      <td>{post.replyCount}</td>
                      <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => fetchPostDetail(post.id)} className="edit-btn">
                          편집
                        </button>
                        <button onClick={() => handleDeletePost(post.id)} className="delete-btn">
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </div>

        {selectedPost && (
          <div className="post-editor">
            <div className="editor-header">
              <h2>게시글 편집</h2>
              <div className="editor-controls">
                <button onClick={() => setEditMode(!editMode)} className="edit-toggle">
                  {editMode ? '미리보기' : '수정 모드'}
                </button>
                {editMode && (
                  <button onClick={handleUpdatePost} className="save-btn">
                    변경사항 저장
                  </button>
                )}
              </div>
            </div>

            {editMode ? (
              <div className="edit-form">
                <div className="form-row">
                  <label>제목</label>
                  <input
                    type="text"
                    value={selectedPost.title}
                    onChange={(e) => setSelectedPost({ ...selectedPost, title: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <label>작성자</label>
                  <select
                    value={selectedPost.nickname}
                    onChange={(e) => setSelectedPost({ ...selectedPost, nickname: e.target.value })}
                  >
                    <option value={selectedPost.nickname}>{selectedPost.nickname}</option>
                    <optgroup label="일반 사용자">
                      {PREDEFINED_NICKNAMES.general.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="form-row">
                  <label>카테고리</label>
                  <select
                    value={selectedPost.category}
                    onChange={(e) => setSelectedPost({ ...selectedPost, category: e.target.value as any })}
                  >
                    <option value="funding">자금</option>
                    <option value="tax">세무</option>
                    <option value="hr">노무</option>
                    <option value="marketing">마케팅</option>
                    <option value="strategy">전략</option>
                    <option value="tech">기술</option>
                    <option value="legal">법무</option>
                    <option value="etc">기타</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>태그 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={selectedPost.tags.join(', ')}
                    onChange={(e) => setSelectedPost({
                      ...selectedPost,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                    })}
                  />
                </div>

                <div className="form-row">
                  <label>내용</label>
                  <textarea
                    value={selectedPost.content}
                    onChange={(e) => setSelectedPost({ ...selectedPost, content: e.target.value })}
                    rows={10}
                  />
                </div>

                <div className="form-row stats-row">
                  <div className="stat-input">
                    <label>조회수</label>
                    <input
                      type="number"
                      value={selectedPost.viewCount}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        viewCount: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="stat-input">
                    <label>좋아요</label>
                    <input
                      type="number"
                      value={selectedPost.likeCount}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        likeCount: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="stat-input">
                    <label>베스트</label>
                    <input
                      type="checkbox"
                      checked={selectedPost.isBest || false}
                      onChange={(e) => setSelectedPost({
                        ...selectedPost,
                        isBest: e.target.checked
                      })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label>작성일시</label>
                  <input
                    type="datetime-local"
                    value={formatDate(selectedPost.createdAt)}
                    onChange={(e) => setSelectedPost({
                      ...selectedPost,
                      createdAt: new Date(e.target.value).toISOString()
                    })}
                  />
                </div>
              </div>
            ) : (
              <div className="post-preview">
                <h3>{selectedPost.title}</h3>
                <div className="post-meta">
                  <span className="author">{selectedPost.nickname}</span>
                  <span className="category">{selectedPost.category}</span>
                  <span className="date">{new Date(selectedPost.createdAt).toLocaleString()}</span>
                </div>
                <div className="post-stats">
                  <span>조회 {selectedPost.viewCount}</span>
                  <span>좋아요 {selectedPost.likeCount}</span>
                  <span>댓글 {selectedPost.replyCount}</span>
                </div>
                {selectedPost.tags.length > 0 && (
                  <div className="post-tags">
                    {selectedPost.tags.map((tag, idx) => (
                      <span key={idx} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="post-content">{selectedPost.content}</div>
              </div>
            )}

            <div className="replies-section">
              <h3>댓글 관리 ({selectedPost.replies?.length || 0})</h3>

              <div className="new-reply-form">
                <h4>새 댓글 추가</h4>
                <div className="reply-form-row">
                  <select
                    value={newReply.nickname}
                    onChange={(e) => setNewReply({ ...newReply, nickname: e.target.value })}
                  >
                    <option value="">작성자 선택</option>
                    <optgroup label="기업심사관">
                      {PREDEFINED_NICKNAMES.examiners.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="전문가">
                      {PREDEFINED_NICKNAMES.experts.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="일반 사용자">
                      {PREDEFINED_NICKNAMES.general.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <select
                    value={newReply.role}
                    onChange={(e) => setNewReply({ ...newReply, role: e.target.value as any })}
                  >
                    <option value="general">일반</option>
                    <option value="certified_examiner">기업심사관</option>
                    <option value="expert">전문가</option>
                  </select>
                </div>
                <textarea
                  placeholder="댓글 내용"
                  value={newReply.content}
                  onChange={(e) => setNewReply({ ...newReply, content: e.target.value })}
                  rows={3}
                />
                <button onClick={handleCreateReply} className="add-reply-btn">
                  댓글 추가
                </button>
              </div>

              <div className="replies-order-controls">
                <button onClick={saveReplyOrder} className="save-order-btn">
                  댓글 순서 저장
                </button>
                <span className="order-hint">↑↓ 버튼으로 순서 조정 후 저장하세요</span>
              </div>

              <div className="replies-list">
                {selectedPost.replies?.map((reply, index) => (
                  <div key={reply.id} className="reply-item">
                    <div className="reply-header">
                      <span className="reply-author">
                        {reply.nickname}
                        {reply.role === 'certified_examiner' && ' 🏆'}
                        {reply.role === 'expert' && ' ⭐'}
                      </span>
                      <span className="reply-date">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="reply-content">{reply.content}</div>
                    <div className="reply-actions">
                      <span>좋아요 {reply.likeCount}</span>
                      <div className="reply-order-buttons">
                        <button
                          onClick={() => moveReplyUp(index)}
                          disabled={index === 0}
                          className="order-btn"
                          title="위로 이동"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveReplyDown(index)}
                          disabled={index === selectedPost.replies!.length - 1}
                          className="order-btn"
                          title="아래로 이동"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const newContent = prompt('댓글 내용 수정:', reply.content);
                          if (newContent && newContent !== reply.content) {
                            handleUpdateReply(reply.id, { content: newContent });
                          }
                        }}
                        className="edit-reply-btn"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="delete-reply-btn"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}