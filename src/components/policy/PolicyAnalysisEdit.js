'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './PolicyAnalysisWrite.css';

const PolicyAnalysisEdit = ({ postId, initialData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: '',
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password.trim()) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }

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
        password: formData.password,
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

      const response = await fetch(`/api/policy-analysis/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '게시글 수정에 실패했습니다.');
      }

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
          <div className="form-group">
            <label htmlFor="password" className="required">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="게시글 수정 비밀번호를 입력하세요"
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

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
                    rows="4"
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
            <label htmlFor="thumbnail">썸네일 URL</label>
            <input
              type="url"
              id="thumbnail"
              name="thumbnail"
              value={formData.thumbnail}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
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