'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './PolicyAnalysisWrite.css';

const PolicyAnalysisEdit = ({ postId, initialData }) => {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    // password 제거 - NextAuth 세션 기반 인증 사용
    title: initialData?.title || '',
    content: initialData?.content || '',
    category: initialData?.category || 'government',
    excerpt: initialData?.excerpt || '',
    thumbnail: initialData?.thumbnail || '',
    tags: initialData?.tags?.join(', ') || '',
    examinerKey: initialData?.examiner?.key || '',
    isStructured: initialData?.isStructured !== false,
    sections: initialData?.sections || [],
    images: initialData?.images || []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [examiners, setExaminers] = useState([]);
  const [imagePreview, setImagePreview] = useState(initialData?.thumbnail || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    const fetchExaminers = async () => {
      try {
        const response = await fetch('/api/expert-services/examiners');
        if (response.ok) {
          const data = await response.json();
          setExaminers(data.examiners || []);
        }
      } catch (error) {
        console.error('Failed to fetch examiners:', error);
      }
    };

    fetchExaminers();
  }, []);

  const defaultSections = [
    { id: 'target', title: '지원대상', content: '' },
    { id: 'scale', title: '지원규모', content: '' },
    { id: 'eligibility', title: '신청자격', content: '' },
    { id: 'method', title: '신청방법', content: '' },
    { id: 'documents', title: '제출서류', content: '' },
    { id: 'criteria', title: '선정기준', content: '' },
    { id: 'period', title: '지원기간', content: '' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSectionChange = (sectionId, content) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, content } : section
      )
    }));
  };

  const toggleStructuredMode = () => {
    const newIsStructured = !formData.isStructured;
    if (newIsStructured && formData.sections.length === 0) {
      setFormData(prev => ({
        ...prev,
        isStructured: newIsStructured,
        sections: defaultSections
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isStructured: newIsStructured
      }));
    }
  };

  /**
   * 이미지 업로드 핸들러
   *
   * @purpose 썸네일 이미지 파일 업로드 및 미리보기
   * @context Cloudflare R2에 업로드 후 URL 반환
   */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB를 초과할 수 없습니다.');
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
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);

      const response = await fetch('/api/policy-analysis/upload-image', {
        method: 'POST',
        body: formDataToUpload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, thumbnail: data.url }));
      setImagePreview(data.url);
      alert('이미지가 업로드되었습니다.');
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

  /**
   * 이미지 삭제 핸들러
   *
   * @purpose 썸네일 이미지 제거 및 URL 초기화
   */
  const handleImageDelete = () => {
    if (confirm('썸네일 이미지를 삭제하시겠습니까?')) {
      setFormData(prev => ({ ...prev, thumbnail: '' }));
      setImagePreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // password 검증 제거 - NextAuth 세션 기반 인증 사용

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    }

    if (!formData.isStructured && !formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요.';
    }

    if (formData.isStructured) {
      const hasContent = formData.sections.some(section => section.content.trim());
      if (!hasContent) {
        newErrors.sections = '최소 하나의 섹션에 내용을 입력해주세요.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const payload = {
        // password 제거 - NextAuth 세션 기반 인증 사용
        title: formData.title,
        content: formData.isStructured ?
          formData.sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n') :
          formData.content,
        category: formData.category,
        excerpt: formData.excerpt,
        thumbnail: formData.thumbnail,
        tags: tagsArray,
        examinerKey: formData.examinerKey,
        isStructured: formData.isStructured,
        sections: formData.isStructured ? formData.sections : [],
        images: formData.images
      };

      console.log('[정책분석 수정] 요청 시작:', { postId, payload });

      const response = await fetch(`/api/policy-analysis/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 세션 쿠키 전송
        body: JSON.stringify(payload)
      });

      console.log('[정책분석 수정] 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        let result;
        try {
          result = await response.json();
        } catch (e) {
          result = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[정책분석 수정] 에러 응답:', result);
        throw new Error(result.message || '게시글 수정에 실패했습니다.');
      }

      const result = await response.json();

      alert('게시글이 성공적으로 수정되었습니다!');
      router.push(`/policy-analysis/${postId}`);

    } catch (error) {
      console.error('Update error:', error);
      alert(error.message || '게시글 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="policy-analysis-write">
      <div className="write-container">
        <div className="write-header">
          <h1>정책분석 게시글 수정</h1>
          <p>기존 정책분석 게시글을 수정합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="write-form">
          {/* password 필드 제거 - NextAuth 세션 기반 인증 사용 */}

          <div className="form-group">
            <label htmlFor="examinerKey">인증기업심사관</label>
            <select
              id="examinerKey"
              name="examinerKey"
              value={formData.examinerKey}
              onChange={handleChange}
            >
              <option value="">선택하세요</option>
              {examiners.map((examiner) => (
                <option
                  key={examiner._id || examiner.id}
                  value={examiner.legacyKey || examiner.imageKey || examiner._id}
                >
                  {examiner.name} {examiner.companyName && `(${examiner.companyName})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="category" className="required">카테고리</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="government">정부지원정책</option>
              <option value="support">중소·창업지원</option>
              <option value="manufacturing">제조혁신정책</option>
              <option value="other">기타정책</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="title" className="required">제목</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="게시글 제목을 입력하세요"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="excerpt">요약</label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="게시글 요약을 입력하세요 (목록에 표시됩니다)"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={formData.isStructured}
                onChange={toggleStructuredMode}
              />
              <span>구조화된 정책 정보 입력</span>
            </label>
          </div>

          {formData.isStructured ? (
            <div className="sections-container">
              {formData.sections.map((section) => (
                <div key={section.id} className="section-group">
                  <label htmlFor={`section-${section.id}`}>{section.title}</label>
                  <textarea
                    id={`section-${section.id}`}
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.id, e.target.value)}
                    placeholder={`${section.title} 내용을 입력하세요`}
                    rows="8"
                  />
                </div>
              ))}
              {errors.sections && <span className="error-message">{errors.sections}</span>}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="content" className="required">내용</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="게시글 내용을 입력하세요 (마크다운 지원)"
                rows="15"
                className={errors.content ? 'error' : ''}
              />
              {errors.content && <span className="error-message">{errors.content}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="thumbnail">썸네일 이미지</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="url"
                  id="thumbnail"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={(e) => {
                    handleChange(e);
                    setImagePreview(e.target.value);
                  }}
                  placeholder="이미지 URL을 입력하거나 파일을 업로드하세요"
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    style={{
                      padding: '0.5rem 1rem',
                      background: isUploadingImage ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {isUploadingImage ? '업로드 중...' : '이미지 업로드'}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleImageDelete}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      이미지 삭제
                    </button>
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
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tags">태그</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="태그1, 태그2, 태그3 (쉼표로 구분)"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => router.push(`/policy-analysis/${postId}`)}
              className="btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? '수정 중...' : '게시글 수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PolicyAnalysisEdit;