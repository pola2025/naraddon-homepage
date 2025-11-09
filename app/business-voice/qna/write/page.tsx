'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import './page.css';

interface FormData {
  title: string;
  category: string;
  content: string;
  businessType: string;
  region: string;
  needsExpertReply: boolean;
}

interface FormErrors {
  title?: string;
  category?: string;
  content?: string;
}

const CATEGORY_OPTIONS = [
  { value: '', label: '카테고리를 선택해주세요' },
  { value: 'tax', label: '세무' },
  { value: 'funding', label: '자금' },
  { value: 'hr', label: '노무' },
  { value: 'legal', label: '법무' },
  { value: 'marketing', label: '마케팅' },
];

export default function QnAWritePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    content: '',
    businessType: '',
    region: '',
    needsExpertReply: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return; // 로딩 중에는 대기

    if (status === 'unauthenticated') {
      alert('로그인이 필요합니다.');
      router.push('/auth/login?callbackUrl=/business-voice/qna/write');
      return;
    }

    // 기업심사관 제한 (댓글만 작성 가능, 게시글 작성 불가)
    if (session?.user?.role === 'examiner') {
      alert('이 게시판은 사업자가 질문을 하는 게시판입니다.\n기업심사관은 댓글로 작성 바랍니다.');
      router.push('/business-voice');
      return;
    }
  }, [status, session, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    // 에러 클리어
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    } else if (formData.title.length < 5) {
      newErrors.title = '제목은 최소 5자 이상이어야 합니다.';
    } else if (formData.title.length > 200) {
      newErrors.title = '제목은 최대 200자까지 가능합니다.';
    }

    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.';
    }

    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요.';
    } else if (formData.content.length < 10) {
      newErrors.content = '내용은 최소 10자 이상이어야 합니다.';
    } else if (formData.content.length > 5000) {
      newErrors.content = '내용은 최대 5000자까지 가능합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/business-voice/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '질문 등록에 실패했습니다.');
      }

      alert('질문이 등록되었습니다.');
      router.push('/business-voice/qna');
    } catch (error) {
      alert(error instanceof Error ? error.message : '질문 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="qna-write-page">
        <div className="container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="qna-write-page">
      <div className="container">
        <div className="page-header">
          <h1>질문하기</h1>
          <p className="page-description">
            사업 운영 중 궁금한 점을 질문하고 다른 사업자와 전문가의 답변을 받아보세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="qna-write-form">
          <div className="form-group">
            <label htmlFor="category">
              카테고리 <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={errors.category ? 'error' : ''}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="title">
              제목 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="질문 제목을 입력하세요 (5~200자)"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
            <span className="char-count">{formData.title.length}/200</span>
          </div>

          <div className="form-group">
            <label htmlFor="content">
              내용 <span className="required">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="질문 내용을 자세히 작성해주세요 (10~5000자)"
              rows={12}
              className={errors.content ? 'error' : ''}
            />
            {errors.content && <span className="error-message">{errors.content}</span>}
            <span className="char-count">{formData.content.length}/5000</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="businessType">업종</label>
              <input
                type="text"
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                placeholder="예: 음식점, 제조업"
              />
            </div>

            <div className="form-group">
              <label htmlFor="region">지역</label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                placeholder="예: 서울, 부산"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="needsExpertReply"
                checked={formData.needsExpertReply}
                onChange={handleInputChange}
              />
              <span>전문가 답변 요청 (기업심사관 또는 전문가의 답변을 우선적으로 받습니다)</span>
            </label>
          </div>

          <div className="form-actions">
            <Link href="/business-voice/qna" className="btn-cancel">
              취소
            </Link>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '질문 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
