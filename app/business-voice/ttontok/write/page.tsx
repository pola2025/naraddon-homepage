'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './page.css';

interface FormData {
  title: string;
  category: string;
  content: string;
  tags: string;
  nickname: string;
  password: string;
}

interface FormErrors {
  title?: string;
  category?: string;
  content?: string;
  nickname?: string;
  password?: string;
}

const CATEGORY_OPTIONS = [
  { value: '', label: '카테고리를 선택해주세요' },
  { value: 'funding', label: '자금' },
  { value: 'tax', label: '세무' },
  { value: 'hr', label: '노무' },
  { value: 'marketing', label: '마케팅' },
  { value: 'strategy', label: '전략' },
  { value: 'tech', label: '기술' },
  { value: 'legal', label: '법무' },
  { value: 'etc', label: '기타' },
];

export default function TtontokWritePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    content: '',
    tags: '',
    nickname: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 인증 가드: 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  // 기업심사관인 경우 게시글 작성 불가
  useEffect(() => {
    if (status === 'loading') return; // 로딩 중에는 대기

    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/auth/login?callbackUrl=/business-voice/ttontok/write');
      return;
    }

    // 기업심사관 제한 (댓글만 작성 가능, 게시글 작성 불가)
    if (session.user?.role === 'examiner') {
      alert('이 게시판은 사업자들 간의 커뮤니케이션을 위한 공간입니다.\n기업심사관은 정책분석에 게시글을 남겨주시거나\n이 게시판에서는 댓글로 활동 바랍니다.');
      router.push('/business-voice');
      return;
    }

    // 로그인한 경우 닉네임 자동 입력
    setFormData(prev => ({
      ...prev,
      nickname: session.user?.name || '',
    }));
  }, [session, status, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    } else if (formData.title.length > 200) {
      newErrors.title = '제목은 200자 이하로 입력해주세요.';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.';
    }

    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요.';
    } else if (formData.content.length > 5000) {
      newErrors.content = '내용은 5000자 이하로 입력해주세요.';
    }

    // Nickname validation
    if (!formData.nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    } else if (formData.nickname.length > 24) {
      newErrors.nickname = '닉네임은 24자 이하로 입력해주세요.';
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = '비밀번호를 입력해주세요.';
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
      // Process tags - split by comma and clean up
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const submitData = {
        title: formData.title.trim(),
        category: formData.category,
        content: formData.content.trim(),
        nickname: formData.nickname.trim(),
        tags: tagsArray,
        password: formData.password,
      };

      const response = await fetch('/api/business-voice/ttontok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok) {
        // Redirect to the detail page
        router.push(`/business-voice/ttontok/${result.id}`);
      } else {
        // Handle API errors
        if (response.status === 401) {
          setErrors({ password: '비밀번호가 올바르지 않습니다.' });
        } else {
          alert(result.message || '게시글 작성에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 중일 때 로딩 화면 표시
  if (status === 'loading') {
    return (
      <div className="ttontok-write-container">
        <div className="ttontok-write-wrapper">
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#10b981' }} />
            <p style={{ marginTop: '20px', fontSize: '16px', color: '#64748b' }}>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 빈 화면 (리다이렉트 중)
  if (!session) {
    return null;
  }

  return (
    <div className="ttontok-write-container">
      <div className="ttontok-write-wrapper">
        {/* 헤더 */}
        <div className="write-header">
          <h1 className="write-title">똔톡 작성하기</h1>
          <p className="write-subtitle">사업자 분들과 소중한 정보와 경험을 공유해보세요</p>
        </div>

        {/* 작성 폼 */}
        <form className="write-form" onSubmit={handleSubmit}>
          {/* 제목 */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              제목 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="제목을 입력해주세요 (최대 200자)"
              maxLength={200}
              disabled={isSubmitting}
            />
            <div className="char-count">{formData.title.length}/200</div>
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>

          {/* 카테고리 */}
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              카테고리 <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`form-select ${errors.category ? 'error' : ''}`}
              disabled={isSubmitting}
            >
              {CATEGORY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.category && <div className="error-message">{errors.category}</div>}
          </div>

          {/* 내용 */}
          <div className="form-group">
            <label htmlFor="content" className="form-label">
              내용 <span className="required">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              className={`form-textarea ${errors.content ? 'error' : ''}`}
              placeholder="내용을 입력해주세요 (최대 5000자)&#10;&#10;• 사업 운영 중 궁금한 점이나 고민&#10;• 성공/실패 경험담&#10;• 유용한 정보나 팁 공유&#10;• 정책 관련 질문이나 후기 등"
              rows={12}
              maxLength={5000}
              disabled={isSubmitting}
            />
            <div className="char-count">{formData.content.length}/5000</div>
            {errors.content && <div className="error-message">{errors.content}</div>}
          </div>

          {/* 태그 */}
          <div className="form-group">
            <label htmlFor="tags" className="form-label">
              태그 <span className="optional">(선택사항)</span>
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="form-input"
              placeholder="태그를 쉼표(,)로 구분하여 입력해주세요 (예: 창업, 세무신고, 마케팅)"
              disabled={isSubmitting}
            />
            <div className="form-hint">
              태그는 다른 사업자들이 게시글을 쉽게 찾을 수 있도록 도와줍니다.
            </div>
          </div>

          {/* 닉네임 */}
          <div className="form-group">
            <label htmlFor="nickname" className="form-label">
              닉네임 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              className={`form-input ${errors.nickname ? 'error' : ''}`}
              placeholder="닉네임을 입력해주세요 (최대 24자)"
              maxLength={24}
              disabled={isSubmitting}
              readOnly
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
            <div className="char-count">{formData.nickname.length}/24</div>
            {errors.nickname && <div className="error-message">{errors.nickname}</div>}
            <div className="form-hint">
              로그인한 계정의 닉네임이 자동으로 설정됩니다.
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              작성 비밀번호 <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="게시글 작성을 위한 비밀번호를 입력해주세요"
              disabled={isSubmitting}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
            <div className="form-hint">
              게시글 수정/삭제 시 필요한 비밀번호입니다. 반드시 기억해주세요.
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="form-actions">
            <Link href="/business-voice" className="cancel-btn">
              <i className="fas fa-arrow-left" /> 취소
            </Link>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> 작성 중...
                </>
              ) : (
                <>
                  <i className="fas fa-pen" /> 똔톡 작성하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}