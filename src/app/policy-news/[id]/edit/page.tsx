'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
// React Quill 제거 - 순수 텍스트 에디터 사용

interface PostData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  thumbnail: string;
  tags: string[];
  isPublished: boolean;
  isPinned: boolean;
  isMain: boolean;
}

export default function PolicyNewsEditPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [postAuthor, setPostAuthor] = useState<{ email?: string; name?: string; role?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postData, setPostData] = useState<PostData>({
    title: '',
    excerpt: '',
    content: '',
    category: '정책소식',
    thumbnail: '',
    tags: [],
    isPublished: true,
    isPinned: false,
    isMain: false,
  });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/policy-news/${params.id}`);
        if (!response.ok) {
          throw new Error('게시글을 불러올 수 없습니다.');
        }
        const data = await response.json();
        setPostData({
          title: data.post.title || '',
          excerpt: data.post.excerpt || '',
          content: data.post.content || '',
          category: data.post.category || '정책소식',
          thumbnail: data.post.thumbnail || '',
          tags: data.post.tags || [],
          isPublished: data.post.isPublished !== false,
          isPinned: data.post.isPinned || false,
          isMain: data.post.isMain || false,
        });
        setImagePreview(data.post.thumbnail || '');
        setPostAuthor(data.post.author || null);
      } catch (error) {
        setError(error instanceof Error ? error.message : '게시글을 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [params.id]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('파일 크기는 3MB를 초과할 수 없습니다.');
      return;
    }

    // NextAuth 세션 확인 (로그인 필수)
    if (!session) {
      alert('이미지를 업로드하려면 로그인이 필요합니다.');
      return;
    }

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // password 제거 - NextAuth 세션 기반 인증 사용

      console.log('[이미지 업로드] 요청 시작:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        hasSession: !!session
      });

      const response = await fetch('/api/policy-news/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include', // 세션 쿠키 명시적 전송
      });

      console.log('[이미지 업로드] 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[이미지 업로드] 에러 응답:', errorData);
        throw new Error(errorData.message || errorData.details || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      console.log('[이미지 업로드] 성공:', data);
      setPostData((prev) => ({ ...prev, thumbnail: data.url }));
      setImagePreview(data.url);
    } catch (error) {
      console.error('[이미지 업로드] 최종 에러:', error);
      const errorMessage = error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.';
      alert(`업로드 실패: ${errorMessage}\n\n콘솔(F12)에서 상세 내용을 확인하세요.`);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/policy-news/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...postData,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '수정에 실패했습니다.');
      }

      alert('게시글이 수정되었습니다.');
      router.push(`/policy-news/${params.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>게시글을 불러오는 중...</p>
      </div>
    );
  }

  if (error && !postData.title) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => router.back()}>돌아가기</button>
      </div>
    );
  }

  // 권한 체크 (UI용 - 실제 권한은 서버에서 확인)
  const userRole = (session?.user as any)?.role;
  const userEmail = session?.user?.email;
  const isAuthor = postAuthor?.email === userEmail;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const canEdit = isAdmin || (userRole === 'examiner' && isAuthor);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>정책소식 수정</h1>

      {/* 권한 안내 메시지 */}
      {session && postAuthor && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: canEdit ? '#e3f2fd' : '#fff3e0',
          border: `1px solid ${canEdit ? '#2196F3' : '#ff9800'}`,
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            <strong>작성자:</strong> {postAuthor.name || postAuthor.email}
            {postAuthor.role && ` (${postAuthor.role})`}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            <strong>현재 사용자:</strong> {session.user?.name || session.user?.email}
            {userRole && ` (${userRole})`}
          </div>
          {!canEdit && (
            <div style={{ marginTop: '0.5rem', color: '#f57c00', fontWeight: 'bold' }}>
              ⚠️ 본인이 작성한 게시글만 수정할 수 있습니다. 관리자에게 문의하세요.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="title">제목 *</label>
          <input
            id="title"
            type="text"
            value={postData.title}
            onChange={(e) => setPostData({ ...postData, title: e.target.value })}
            required
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="excerpt">요약</label>
          <textarea
            id="excerpt"
            value={postData.excerpt}
            onChange={(e) => setPostData({ ...postData, excerpt: e.target.value })}
            rows={3}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            value={postData.category}
            onChange={(e) => setPostData({ ...postData, category: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          >
            <option value="정책소식">정책소식</option>
            <option value="공지사항">공지사항</option>
            <option value="이벤트">이벤트</option>
            <option value="기타">기타</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="thumbnail">썸네일</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                id="thumbnail"
                type="text"
                value={postData.thumbnail}
                onChange={(e) => {
                  setPostData({ ...postData, thumbnail: e.target.value });
                  setImagePreview(e.target.value);
                }}
                placeholder="이미지 URL을 입력하거나 파일을 업로드하세요"
                style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage || !session || sessionStatus === 'loading'}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || !session || sessionStatus === 'loading'}
                  style={{
                    padding: '0.5rem 1rem',
                    background: isUploadingImage || !session || sessionStatus === 'loading' ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isUploadingImage || !session || sessionStatus === 'loading' ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {isUploadingImage ? '업로드 중...' : '이미지 업로드'}
                </button>
                {sessionStatus === 'loading' && (
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>
                    (세션 확인 중...)
                  </span>
                )}
                {sessionStatus !== 'loading' && !session && (
                  <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>
                    (로그인 필요)
                  </span>
                )}
              </div>
            </div>
            {imagePreview && (
              <div style={{ width: '150px', flexShrink: 0 }}>
                <img
                  src={imagePreview}
                  alt="썸네일 미리보기"
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>내용 *</label>
          <textarea
            value={postData.content}
            onChange={(e) => setPostData({ ...postData, content: e.target.value })}
            style={{
              width: '100%',
              height: '400px',
              padding: '0.75rem',
              fontSize: '1rem',
              lineHeight: '1.6',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            placeholder="내용을 입력해주세요..."
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="tags">태그 (쉼표로 구분)</label>
          <input
            id="tags"
            type="text"
            value={postData.tags.join(', ')}
            onChange={(e) => setPostData({
              ...postData,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            })}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem' }}>
          <label>
            <input
              type="checkbox"
              checked={postData.isPublished}
              onChange={(e) => setPostData({ ...postData, isPublished: e.target.checked })}
            />
            게시
          </label>
          <label>
            <input
              type="checkbox"
              checked={postData.isPinned}
              onChange={(e) => setPostData({ ...postData, isPinned: e.target.checked })}
            />
            고정
          </label>
          <label>
            <input
              type="checkbox"
              checked={postData.isMain}
              onChange={(e) => setPostData({ ...postData, isMain: e.target.checked })}
            />
            메인 표시
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">비밀번호 *</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="게시글 수정 비밀번호"
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={isSaving || !canEdit}
            style={{
              padding: '0.75rem 2rem',
              background: isSaving || !canEdit ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving || !canEdit ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {isSaving ? '수정 중...' : !canEdit ? '수정 권한 없음' : '수정하기'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSaving}
            style={{
              padding: '0.75rem 2rem',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}