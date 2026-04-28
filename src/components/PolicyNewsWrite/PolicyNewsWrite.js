'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PolicyNewsEditor from './PolicyNewsEditor';
import PolicyNewsPreview from './PolicyNewsPreview';
import './PolicyNewsWrite.css';

const categories = [
  { value: '', label: '카테고리를 선택해주세요' },
  { value: '정부지원', label: '정부지원' },
  { value: '중소기업', label: '중소기업' },
  { value: '창업지원', label: '창업지원' },
  { value: '연구개발', label: '연구개발' },
  { value: '금융지원', label: '금융지원' },
  { value: '세제지원', label: '세제지원' },
  { value: '고용지원', label: '고용지원' },
  { value: '지역정책', label: '지역정책' },
  { value: '환경정책', label: '환경정책' },
  { value: '기타', label: '기타' },
];

const defaultFormData = {
  title: '',
  category: '',
  excerpt: '',
  content: '',
  tags: '',
  thumbnail: '',
  isMainNews: false,
};

const PolicyNewsWrite = ({ postId = null, mode = 'create' }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(true); // 관리자 세션으로 인증되어 있다고 가정
  const [formData, setFormData] = useState(defaultFormData);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  // 라이브 미리보기 모달 상태
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);

  const isEditMode = mode === 'edit' && postId;

  // 관리자 세션은 관리자 대시보드에서 이미 확인됨
  useEffect(() => {
    // 바로 인증된 상태로 설정
    setIsAuthorized(true);
  }, []);

  // 수정 모드일 때 게시글 데이터 불러오기
  useEffect(() => {
    if (isEditMode) {
      const fetchPost = async () => {
        setIsLoadingPost(true);
        try {
          const response = await fetch(`/api/policy-news/${postId}`);
          if (response.ok) {
            const data = await response.json();
            const post = data.post;
            setFormData({
              title: post.title || '',
              category: post.category || '',
              excerpt: post.excerpt || '',
              content: post.content || '',
              tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
              thumbnail: post.thumbnail || '',
              isMainNews: post.isMain || false,
            });
            if (post.thumbnail) {
              setImagePreview(post.thumbnail);
            }
          } else {
            alert('게시글을 불러오지 못했습니다.');
            router.back();
          }
        } catch (error) {
          console.error('Failed to fetch post:', error);
          alert('게시글을 불러오는 중 오류가 발생했습니다.');
          router.back();
        } finally {
          setIsLoadingPost(false);
        }
      };
      fetchPost();
    }
  }, [isEditMode, postId, router]);

  useEffect(() => {
    if (!isAuthorized || typeof window === 'undefined') {
      return;
    }
    // 수정 모드가 아닐 때만 draft 불러오기
    if (!isEditMode) {
      const draft = localStorage.getItem('policyNewsDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormData({ ...defaultFormData, ...parsed });
          if (parsed.thumbnail) {
            setImagePreview(parsed.thumbnail);
          }
        } catch (error) {
          console.warn('임시 저장된 데이터를 불러오지 못했습니다.', error);
        }
      }
    }
    // 인증 성공 시 게시글 목록 가져오기 (작성 모드일 때만)
    if (!isEditMode) {
      fetchPosts();
    }
  }, [isAuthorized, isEditMode]);

  const fetchPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const response = await fetch('/api/policy-news?limit=50');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleDeletePost = async (postId, postTitle) => {
    if (!window.confirm(`"${postTitle}" 게시글을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/policy-news/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        // 관리자 페이지에서 오는 요청은 비밀번호 불필요
        body: JSON.stringify({}),
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

  const handleEditPost = (postId) => {
    // 수정 페이지로 이동
    window.location.href = `/policy-news/${postId}/edit`;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors[name];
        return nextErrors;
      });
    }
  };

  const handleImageUrlChange = (event) => {
    const url = event.target.value;
    setFormData((prev) => ({ ...prev, thumbnail: url }));

    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }

    if (errors.thumbnail) {
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors.thumbnail;
        return nextErrors;
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert('이미지 파일 크기는 3MB 이하여야 합니다.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/policy-news/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload failed:', errorData);
        throw new Error(errorData.message || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, thumbnail: data.url }));
      setImagePreview(data.url);

      if (errors.thumbnail) {
        setErrors((prev) => {
          const nextErrors = { ...prev };
          delete nextErrors.thumbnail;
          return nextErrors;
        });
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // insertFormatting 함수는 ReactQuill 사용으로 더 이상 필요없음

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.title.trim()) {
      nextErrors.title = '제목을 입력해주세요.';
    }
    if (!formData.category) {
      nextErrors.category = '카테고리를 선택해주세요.';
    }
    // 요약(excerpt) 필수 검증 제거 — 상세 페이지 노출 안 하므로 선택 입력
    // (목록 카드/SEO 에만 사용. 비워두면 본문 일부 자동 추출 가능 여지)
    if (!formData.content.trim()) {
      nextErrors.content = '내용을 입력해주세요.';
    }
    if (!formData.thumbnail.trim()) {
      nextErrors.thumbnail = '표지 이미지를 입력해주세요.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    const tagsArray = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const payload = {
      title: formData.title,
      category: formData.category,
      excerpt: formData.excerpt,
      content: formData.content,
      thumbnail: formData.thumbnail,
      tags: tagsArray,
      isMain: formData.isMainNews,
    };

    try {
      setIsSubmitting(true);

      // 수정 모드면 PUT, 작성 모드면 POST
      const url = isEditMode ? `/api/policy-news/${postId}` : '/api/policy-news';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(result?.message || `게시글 ${isEditMode ? '수정' : '등록'}에 실패했습니다.`);
        return;
      }

      localStorage.removeItem('policyNewsDraft');
      alert(`정책소식이 ${isEditMode ? '수정' : '등록'}되었습니다.`);
      router.push(`/policy-news/${result.post._id}`);
    } catch (error) {
      console.error(`정책소식 ${isEditMode ? '수정' : '등록'} 실패`, error);
      alert(`게시글 ${isEditMode ? '수정' : '등록'} 중 오류가 발생했습니다.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('작성 중인 내용을 취소하시겠습니까?')) {
      router.back();
    }
  };

  /**
   * 임시저장 - DB에 isDraft=true로 저장
   * 저장 후 관리자 목록 페이지로 이동하여 사용자가 직관적으로 확인/수정 가능
   */
  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      alert('임시저장하려면 제목을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const payload = {
        title: formData.title,
        category: formData.category || '기타',
        excerpt: formData.excerpt || '',
        content: formData.content || '',
        thumbnail: formData.thumbnail || '',
        tags: tagsArray,
        isMain: false, // 임시저장은 메인 노출 안됨
        isDraft: true, // 임시저장 플래그
      };

      // 수정 모드면 PUT, 작성 모드면 POST
      const url = isEditMode ? `/api/policy-news/${postId}` : '/api/policy-news';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(result?.message || '임시저장에 실패했습니다.');
        return;
      }

      // localStorage 임시저장 삭제
      localStorage.removeItem('policyNewsDraft');

      alert('임시저장되었습니다. 관리자 목록에서 확인하세요.');
      // 관리자 목록 페이지로 이동
      router.push('/policy-news/admin');
    } catch (error) {
      console.error('임시저장 실패:', error);
      alert('임시저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadDraft = () => {
    const draft = localStorage.getItem('policyNewsDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setFormData({ ...defaultFormData, ...parsed });
      if (parsed.thumbnail) {
        setImagePreview(parsed.thumbnail);
      }
      alert('임시 저장된 내용을 불러왔습니다.');
    } else {
      alert('임시 저장된 데이터가 없습니다.');
    }
  };

  // 로딩 중 표시
  if (isLoadingPost) {
    return (
      <div className="policy-news-write">
        <div className="loading-container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: '#64748b' }}>게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-news-write">
      <div className="write-header" style={{ position: 'relative' }}>
        {imagePreview && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              borderRadius: '8px',
              zIndex: 0,
            }}
          >
            <img
              src={imagePreview}
              alt="배경 이미지"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.7)',
              }}
              onError={(e) => {
                console.error('Image load failed:', imagePreview);
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
        <div
          style={{
            position: 'relative',
            background: imagePreview ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
            padding: '3rem 2rem',
            borderRadius: '8px',
            minHeight: imagePreview ? '300px' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <h1 style={{ color: imagePreview ? '#fff' : '#1e293b', marginBottom: '1rem' }}>
            {isEditMode ? '정책소식 수정' : '정책소식 작성'}
          </h1>
          <p style={{ color: imagePreview ? '#fff' : '#64748b' }}>
            관리자 세션으로 인증되었습니다.
          </p>
        </div>
      </div>

      <form className="write-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">
              제목 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="게시글 제목을 입력해주세요"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">
              카테고리 <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? 'error' : ''}
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="excerpt">
            요약{' '}
            <span className="optional-hint">
              (선택 · 목록 카드/SEO 메타용, 상세 페이지 노출 안 함)
            </span>
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            placeholder="게시글 요약을 입력해주세요"
            rows={3}
            className={errors.excerpt ? 'error' : ''}
          />
          {errors.excerpt && <span className="error-message">{errors.excerpt}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="content">
            내용 <span className="required">*</span>
          </label>
          {/*
            ReactQuill 기반 리치 에디터로 교체 (와이어 ③ 사양)
            - 폰트 크기 / 정렬 / 색상 / 인용 / 목록 / 이미지 업로드(R2 webp) 지원
            - HTML 출력 → 상세 페이지에서 dangerouslySetInnerHTML 로 렌더
          */}
          <PolicyNewsEditor
            value={formData.content}
            hasError={!!errors.content}
            onChange={(html) => {
              setFormData((prev) => ({ ...prev, content: html }));
              if (errors.content) {
                setErrors((prev) => {
                  const nextErrors = { ...prev };
                  delete nextErrors.content;
                  return nextErrors;
                });
              }
            }}
          />
          {errors.content && <span className="error-message">{errors.content}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="thumbnail">
            표지 이미지 <span className="required">*</span>
          </label>
          <div className="image-upload-area">
            <div
              className="upload-options"
              style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}
            >
              <input
                type="url"
                id="thumbnail"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleImageUrlChange}
                placeholder="https://example.com/thumbnail.jpg"
                className={errors.thumbnail ? 'error' : ''}
                style={{ flex: 1 }}
              />
              <div className="upload-divider" style={{ padding: '0 10px', color: '#999' }}>
                또는
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                  opacity: isUploadingImage ? 0.6 : 1,
                }}
              >
                {isUploadingImage ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> 업로드 중...
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload"></i> 파일 선택
                  </>
                )}
              </button>
            </div>
            {errors.thumbnail && <span className="error-message">{errors.thumbnail}</span>}

            <div className="upload-box">
              <i className="fas fa-cloud-upload-alt"></i>
              <p>이미지 URL 입력 또는 파일 업로드 (최대 3MB, 권장 1200x630px)</p>
            </div>

            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="미리보기" />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, thumbnail: '' }));
                    setImagePreview(null);
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tags">태그</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="정책, 지원사업, 정부지원"
            />
            <p className="help-text">쉼표로 구분해 입력하면 됩니다.</p>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isMainNews"
                checked={formData.isMainNews}
                onChange={handleChange}
              />
              <span>메인 슬라이드에 노출</span>
            </label>
            <p className="help-text">선택 시 정책소식 슬라이드 영역에 노출됩니다.</p>
          </div>
        </div>

        <div className="form-actions">
          <div className="left-actions">
            <button type="button" className="btn-draft" onClick={handleSaveDraft}>
              <i className="fas fa-save"></i> 임시 저장
            </button>
            <button type="button" className="btn-load" onClick={handleLoadDraft}>
              <i className="fas fa-folder-open"></i> 불러오기
            </button>
          </div>

          <div className="right-actions">
            {/* 라이브 미리보기 — 실제 detail 페이지와 동일한 레이아웃으로 모달에서 확인 */}
            <button type="button" className="btn-preview" onClick={() => setIsPreviewOpen(true)}>
              <i className="fas fa-eye"></i> 미리보기
            </button>
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              <i className="fas fa-times"></i> 취소
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              <i className="fas fa-check"></i> {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </form>

      {/*
        라이브 미리보기 모달
        @purpose 작성 중인 글이 detail 페이지(/policy-news/[id])에 어떻게 보일지 즉시 확인
        @decision 모달이 열린 상태에서 form 변경 시 닫고 다시 열면 갱신 (props 기반)
      */}
      <PolicyNewsPreview
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={formData.title}
        category={formData.category}
        excerpt={formData.excerpt}
        content={formData.content}
        thumbnail={formData.thumbnail}
        tags={formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)}
      />

      {/* 관리자 게시글 목록 */}
      {isAuthorized && (
        <div className="admin-posts-section">
          <h2 className="section-title">
            <i className="fas fa-list"></i> 등록된 게시글 관리
          </h2>

          {isLoadingPosts ? (
            <div className="loading-message">게시글을 불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div className="no-posts-message">
              <i className="fas fa-inbox"></i>
              <p>등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="posts-table-wrapper">
              <table className="posts-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>제목</th>
                    <th>카테고리</th>
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
                        <a
                          href={`/policy-news/${post._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {post.title}
                          {post.isPinned && <span className="badge pinned">고정</span>}
                          {post.isMain && <span className="badge main">메인</span>}
                        </a>
                      </td>
                      <td>{post.category}</td>
                      <td>{post.views.toLocaleString()}</td>
                      <td>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="action-cell">
                        <button
                          onClick={() => handleEditPost(post._id)}
                          className="btn-edit-small"
                          title="수정"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeletePost(post._id, post.title)}
                          className="btn-delete-small"
                          title="삭제"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PolicyNewsWrite;
