'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import './page.css';

interface SuccessCase {
  title: string;
  category: string;
  description: string;
  result: string;
  period: string;
}

interface ExpertProfile {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  imageUrl: string;
  specialties: string[];
  introduction: string;
  detailedIntro: string;
  career: string[];
  certifications: string[];
  services: string[];
  successCases?: SuccessCase[];
  galleryImages?: string[];
  phone?: string;
  email?: string;
}

/**
 * 전문가 대시보드 메인 컴포넌트 (Suspense 내부)
 * @purpose URL 파라미터를 사용하므로 Suspense로 감싸야 함
 */
function ExpertDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expertId = searchParams.get('expertId'); // URL 파라미터로 전문가 ID 받기

  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // 전문가 또는 관리자 권한 확인 및 프로필 로드
  useEffect(() => {
    if (status === 'loading') return;

    if (!session || (session.user.role !== 'expert' && session.user.role !== 'admin')) {
      router.push('/');
      return;
    }

    fetchProfile();
  }, [session, status, router, expertId]);

  const fetchProfile = async () => {
    try {
      // URL 파라미터로 expertId가 있으면 해당 전문가 프로필 조회 (관리자용)
      // expertId가 없으면 본인 프로필 조회 (전문가 본인용)
      const url = expertId
        ? `/api/expert/profile?expertId=${expertId}`
        : '/api/expert/profile';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
      } else {
        setMessage({ type: 'error', text: '프로필을 불러올 수 없습니다.' });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setMessage({ type: 'error', text: '프로필 로딩 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/expert/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '프로필이 저장되었습니다.' });
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ExpertProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const addArrayItem = (field: 'career' | 'certifications' | 'services' | 'specialties') => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: [...(profile[field] || []), '']
    });
  };

  const updateArrayItem = (field: 'career' | 'certifications' | 'services' | 'specialties', index: number, value: string) => {
    if (!profile) return;
    const newArray = [...(profile[field] || [])];
    newArray[index] = value;
    setProfile({ ...profile, [field]: newArray });
  };

  const removeArrayItem = (field: 'career' | 'certifications' | 'services' | 'specialties', index: number) => {
    if (!profile) return;
    const newArray = (profile[field] || []).filter((_, i) => i !== index);
    setProfile({ ...profile, [field]: newArray });
  };

  // 이미지 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // 10MB 크기 제한 체크
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      setMessage({
        type: 'error',
        text: `이미지 크기는 최대 10MB까지 업로드 가능합니다. (${oversizedFiles.length}개 파일 초과)`
      });
      return;
    }

    setSelectedFiles(files);
    setMessage(null);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: '업로드할 이미지를 선택해주세요.' });
      return;
    }

    setUploadingImages(true);
    setMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/expert/upload-images', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // 프로필에 이미지 URL 추가
        setProfile(prev => prev ? {
          ...prev,
          galleryImages: [...(prev.galleryImages || []), ...data.imageUrls]
        } : null);

        setSelectedFiles([]);
        setMessage({ type: 'success', text: `${data.imageUrls.length}개 이미지가 업로드되었습니다.` });
      } else {
        setMessage({ type: 'error', text: data.error || '이미지 업로드에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
      setMessage({ type: 'error', text: '이미지 업로드 중 오류가 발생했습니다.' });
    } finally {
      setUploadingImages(false);
    }
  };

  // 갤러리 이미지 삭제 핸들러
  const handleRemoveGalleryImage = (index: number) => {
    if (!profile) return;
    const newGalleryImages = (profile.galleryImages || []).filter((_, i) => i !== index);
    setProfile({ ...profile, galleryImages: newGalleryImages });
  };

  // 성공케이스 추가
  const addSuccessCase = () => {
    if (!profile) return;
    const newCase: SuccessCase = {
      title: '',
      category: '',
      description: '',
      result: '',
      period: ''
    };
    setProfile({
      ...profile,
      successCases: [...(profile.successCases || []), newCase]
    });
  };

  // 성공케이스 업데이트
  const updateSuccessCase = (index: number, field: keyof SuccessCase, value: string) => {
    if (!profile) return;
    const newCases = [...(profile.successCases || [])];
    newCases[index] = { ...newCases[index], [field]: value };
    setProfile({ ...profile, successCases: newCases });
  };

  // 성공케이스 삭제
  const removeSuccessCase = (index: number) => {
    if (!profile) return;
    const newCases = (profile.successCases || []).filter((_, i) => i !== index);
    setProfile({ ...profile, successCases: newCases });
  };

  if (isLoading) {
    return (
      <div className="expert-dashboard">
        <div className="loading-container">
          <div className="spinner" />
          <p>프로필을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="expert-dashboard">
        <div className="error-container">
          <p>프로필을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expert-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>전문가 프로필 관리</h1>
          <p>고객에게 보여질 프로필 정보를 관리하세요</p>
        </header>

        {message && (
          <div className={`message ${message.type}`}>
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            <span>{message.text}</span>
          </div>
        )}

        <div className="dashboard-content">
          {/* 탭 네비게이션 */}
          <div className="tab-nav">
            <button
              className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              <i className="fas fa-user" />
              기본 정보
            </button>
            <button
              className={`tab-button ${activeTab === 'intro' ? 'active' : ''}`}
              onClick={() => setActiveTab('intro')}
            >
              <i className="fas fa-file-alt" />
              소개
            </button>
            <button
              className={`tab-button ${activeTab === 'career' ? 'active' : ''}`}
              onClick={() => setActiveTab('career')}
            >
              <i className="fas fa-briefcase" />
              경력 및 자격
            </button>
            <button
              className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              <i className="fas fa-cogs" />
              제공 서비스
            </button>
            <button
              className={`tab-button ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              <i className="fas fa-images" />
              갤러리
            </button>
            <button
              className={`tab-button ${activeTab === 'cases' ? 'active' : ''}`}
              onClick={() => setActiveTab('cases')}
            >
              <i className="fas fa-star" />
              성공케이스
            </button>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            {/* 기본 정보 탭 */}
            {activeTab === 'basic' && (
              <div className="form-section">
                <h2>기본 정보</h2>

                <div className="form-group">
                  <label htmlFor="name">이름 *</label>
                  <input
                    type="text"
                    id="name"
                    value={profile.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="position">직책 *</label>
                  <input
                    type="text"
                    id="position"
                    value={profile.position}
                    onChange={(e) => updateField('position', e.target.value)}
                    placeholder="예: 대표 변리사"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="companyName">회사명 *</label>
                  <input
                    type="text"
                    id="companyName"
                    value={profile.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">연락처</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="예: 010-1234-5678"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">이메일</label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="예: expert@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>전문 분야</label>
                  {(profile.specialties || []).map((specialty, index) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => updateArrayItem('specialties', index, e.target.value)}
                        placeholder="예: 특허 출원"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('specialties', index)}
                        className="btn-remove"
                        aria-label="삭제"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('specialties')}
                    className="btn-add"
                  >
                    <i className="fas fa-plus" />
                    전문 분야 추가
                  </button>
                </div>
              </div>
            )}

            {/* 소개 탭 */}
            {activeTab === 'intro' && (
              <div className="form-section">
                <h2>소개</h2>

                <div className="form-group">
                  <label htmlFor="introduction">간단 소개 *</label>
                  <textarea
                    id="introduction"
                    value={profile.introduction}
                    onChange={(e) => updateField('introduction', e.target.value)}
                    rows={3}
                    placeholder="전문가 카드에 표시될 2-3줄 분량의 간단한 소개"
                    required
                  />
                  <span className="help-text">전문가 목록 카드에 표시됩니다 (2-3줄 권장)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="detailedIntro">상세 소개</label>
                  <textarea
                    id="detailedIntro"
                    value={profile.detailedIntro || ''}
                    onChange={(e) => updateField('detailedIntro', e.target.value)}
                    rows={8}
                    placeholder="회사 소개 탭에 표시될 상세한 소개 내용"
                  />
                  <span className="help-text">상세 페이지 회사 소개 탭에 표시됩니다</span>
                </div>
              </div>
            )}

            {/* 경력 및 자격 탭 */}
            {activeTab === 'career' && (
              <div className="form-section">
                <h2>경력 및 자격</h2>

                <div className="form-group">
                  <label>경력 사항</label>
                  <p className="help-text" style={{ marginBottom: '12px' }}>
                    연도와 경력 내용을 함께 입력해주세요 (예: 2012년 행정사 자격 취득)
                  </p>
                  {(profile.career || []).map((item, index) => (
                    <div key={index} className="career-input-row">
                      <input
                        type="text"
                        className="career-input-full"
                        value={item}
                        onChange={(e) => updateArrayItem('career', index, e.target.value)}
                        placeholder="예: 2012년 행정사 자격 취득"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('career', index)}
                        className="btn-remove"
                        aria-label="삭제"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('career')}
                    className="btn-add"
                  >
                    <i className="fas fa-plus" />
                    경력 추가
                  </button>
                </div>

                <div className="form-group">
                  <label>자격 및 인증</label>
                  {(profile.certifications || []).map((cert, index) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={cert}
                        onChange={(e) => updateArrayItem('certifications', index, e.target.value)}
                        placeholder="예: 변리사 자격증"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('certifications', index)}
                        className="btn-remove"
                        aria-label="삭제"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('certifications')}
                    className="btn-add"
                  >
                    <i className="fas fa-plus" />
                    자격/인증 추가
                  </button>
                </div>
              </div>
            )}

            {/* 제공 서비스 탭 */}
            {activeTab === 'services' && (
              <div className="form-section">
                <h2>제공 서비스</h2>

                <div className="form-group">
                  <label>핵심 서비스</label>
                  {(profile.services || []).map((service, index) => (
                    <div key={index} className="array-item">
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => updateArrayItem('services', index, e.target.value)}
                        placeholder="예: 특허 출원 및 등록 대행"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('services', index)}
                        className="btn-remove"
                        aria-label="삭제"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('services')}
                    className="btn-add"
                  >
                    <i className="fas fa-plus" />
                    서비스 추가
                  </button>
                </div>
              </div>
            )}

            {/* 갤러리 탭 */}
            {activeTab === 'gallery' && (
              <div className="form-section">
                <h2>갤러리 이미지 관리</h2>
                <p className="section-description">
                  상세 페이지의 '정보' 탭에 표시될 이미지를 업로드하세요.
                  이미지는 WebP 형식으로 자동 압축됩니다.
                </p>

                <div className="form-group">
                  <label htmlFor="gallery-upload">이미지 업로드</label>
                  <div className="upload-zone">
                    <input
                      type="file"
                      id="gallery-upload"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="file-input"
                    />
                    <div className="upload-info">
                      <i className="fas fa-cloud-upload-alt" />
                      <p>
                        {selectedFiles.length > 0
                          ? `${selectedFiles.length}개 파일 선택됨`
                          : '이미지를 선택하거나 드래그하세요'}
                      </p>
                      <span className="help-text">최대 10MB, 여러 파일 선택 가능</span>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      className="btn-upload"
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? (
                        <>
                          <span className="spinner-small" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload" />
                          {selectedFiles.length}개 이미지 업로드
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>현재 갤러리 이미지 ({(profile.galleryImages || []).length}개)</label>
                  {(profile.galleryImages || []).length > 0 ? (
                    <div className="gallery-preview">
                      {(profile.galleryImages || []).map((imageUrl, index) => (
                        <div key={index} className="gallery-preview-item">
                          <img src={imageUrl} alt={`갤러리 ${index + 1}`} />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="btn-remove-image"
                            aria-label="이미지 삭제"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-gallery">
                      <i className="fas fa-images" />
                      <p>업로드된 갤러리 이미지가 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 성공케이스 탭 */}
            {activeTab === 'cases' && (
              <div className="form-section">
                <h2>성공 케이스 관리</h2>
                <p className="section-description">
                  상세 페이지의 '성공케이스' 탭에 표시될 프로젝트 실적을 입력하세요.
                </p>

                <div className="form-group">
                  <label>성공 케이스 목록</label>
                  {(profile.successCases || []).length > 0 ? (
                    (profile.successCases || []).map((successCase, index) => (
                      <div key={index} className="success-case-item">
                        <div className="case-item-header">
                          <span className="case-number">케이스 {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSuccessCase(index)}
                            className="btn-remove"
                            aria-label="케이스 삭제"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>

                        <div className="case-fields">
                          <div className="case-field-row">
                            <div className="case-field">
                              <label>카테고리</label>
                              <input
                                type="text"
                                value={successCase.category}
                                onChange={(e) => updateSuccessCase(index, 'category', e.target.value)}
                                placeholder="예: 제조업 인허가"
                              />
                            </div>
                            <div className="case-field">
                              <label>기간</label>
                              <input
                                type="text"
                                value={successCase.period}
                                onChange={(e) => updateSuccessCase(index, 'period', e.target.value)}
                                placeholder="예: 2024년 상반기"
                              />
                            </div>
                          </div>

                          <div className="case-field">
                            <label>제목</label>
                            <input
                              type="text"
                              value={successCase.title}
                              onChange={(e) => updateSuccessCase(index, 'title', e.target.value)}
                              placeholder="예: 중소 제조업체 특허청 인허가 성공"
                            />
                          </div>

                          <div className="case-field">
                            <label>설명</label>
                            <textarea
                              value={successCase.description}
                              onChange={(e) => updateSuccessCase(index, 'description', e.target.value)}
                              rows={3}
                              placeholder="프로젝트에 대한 상세 설명을 입력하세요"
                            />
                          </div>

                          <div className="case-field">
                            <label>성과</label>
                            <input
                              type="text"
                              value={successCase.result}
                              onChange={(e) => updateSuccessCase(index, 'result', e.target.value)}
                              placeholder="예: 인허가 기간 2주 단축, 100% 승인"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-cases">
                      <i className="fas fa-star" />
                      <p>등록된 성공 케이스가 없습니다</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addSuccessCase}
                    className="btn-add"
                  >
                    <i className="fas fa-plus" />
                    성공 케이스 추가
                  </button>
                </div>
              </div>
            )}

            {/* 저장 버튼 */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn-save"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-small" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" />
                    저장하기
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * 전문가 대시보드 페이지 Wrapper
 * @purpose useSearchParams를 Suspense로 감싸기 위한 Wrapper 컴포넌트
 */
export default function ExpertDashboardPage() {
  return (
    <Suspense fallback={
      <div className="expert-dashboard">
        <div className="loading-container">
          <div className="spinner" />
          <p>페이지를 불러오는 중입니다...</p>
        </div>
      </div>
    }>
      <ExpertDashboardContent />
    </Suspense>
  );
}
