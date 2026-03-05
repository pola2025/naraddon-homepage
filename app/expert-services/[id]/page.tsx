'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/src/components/examiner-brand/Breadcrumb';
import './page.css';

interface SuccessCase {
  title: string;
  category: string;
  description: string;
  result: string;
  period: string;
}

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  imageUrl: string;
  imageAlt?: string;
  specialties?: string[];
  introduction?: string;
  detailedIntro?: string;
  career?: string[];
  certifications?: string[];
  services?: string[];
  successCases?: SuccessCase[];
  galleryImages?: string[];
}

interface ConsultationForm {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  consultationType: string;
  message: string;
  preferredExpert: string;
}

export default function ExpertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [isLiked, setIsLiked] = useState(false);

  // 상담 신청 폼 상태
  const [formData, setFormData] = useState<ConsultationForm>({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    consultationType: '',
    message: '',
    preferredExpert: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        const response = await fetch(`/api/experts/${params.id}`);
        const data = await response.json();

        if (data.success) {
          setExpert(data.expert);
          // 전문가 정보 로드 시 폼에 전문가 이름 자동 설정
          setFormData(prev => ({
            ...prev,
            preferredExpert: data.expert.name
          }));
        } else {
          console.error('Failed to load expert');
        }
      } catch (error) {
        console.error('Error fetching expert:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchExpert();
    }
  }, [params.id]);

  const handleConsultRequest = () => {
    // /expert-services 페이지의 상담 신청 폼으로 이동
    router.push('/expert-services#expert-consultation-form');
  };

  // 탭 활성화 여부 확인
  const hasInfoContent = expert?.galleryImages && expert.galleryImages.length > 0;
  const hasCareerContent = expert?.career && expert.career.length > 0;
  const hasCasesContent = expert?.successCases && expert.successCases.length > 0;

  // 탭 클릭 핸들러 (비활성화된 탭은 클릭 방지)
  const handleTabClick = (tab: string, hasContent: boolean) => {
    if (tab === 'about' || hasContent) {
      setActiveTab(tab);
    }
  };

  // 폼 제출 핸들러
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSubmitMessage({ type: 'success', text: '상담 신청이 완료되었습니다. 빠른 시일 내에 연락드리겠습니다.' });
        // 폼 초기화 (전문가 이름은 유지)
        setFormData({
          companyName: '',
          contactName: '',
          contactPhone: '',
          contactEmail: '',
          consultationType: '',
          message: '',
          preferredExpert: expert?.name || ''
        });
      } else {
        setSubmitMessage({ type: 'error', text: data.error || '상담 신청에 실패했습니다. 다시 시도해주세요.' });
      }
    } catch (error) {
      console.error('Failed to submit consultation:', error);
      setSubmitMessage({ type: 'error', text: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="expert-detail-page">
        <div className="loading-container">
          <p>전문가 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="expert-detail-page">
        <div className="error-container">
          <p>전문가 정보를 찾을 수 없습니다.</p>
          <Link href="/expert-services" className="btn-back">목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  // 브레드크럼 아이템 구성
  const breadcrumbItems = [
    { label: '홈', href: '/' },
    { label: '전문가 서비스', href: '/expert-services' },
    { label: `${expert.name} ${expert.position || '전문가'}` }
  ];

  return (
    <div className="expert-detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb-container">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Tabs Section */}
      <section className="tabs-section">
        <div className="tabs-container">
          {/* Sidebar */}
          <div className="sidebar-card">
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-image">
                  <img
                    src={expert.imageUrl}
                    alt={expert.imageAlt || `${expert.name} 프로필`}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                    }}
                  />
                  <button
                    className={`btn-like ${isLiked ? 'active' : ''}`}
                    onClick={() => setIsLiked(!isLiked)}
                    aria-label="찜하기"
                  >
                    <i className={`fa${isLiked ? 's' : 'r'} fa-heart`} />
                  </button>
                </div>

                <div className="profile-info">
                  <div className="profile-info-top">
                    <span className="profile-badge">
                      {expert.position || '나라똔 인증 전문가'}
                    </span>
                    <h1 className="profile-name">{expert.name}</h1>
                    <p className="profile-company">{expert.companyName}</p>

                    {expert.specialties && expert.specialties.length > 0 && (
                      <div className="profile-specialties">
                        {expert.specialties.map((specialty, idx) => (
                          <span key={idx} className="specialty-tag">{specialty}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="profile-actions">
                    <button className="btn-consult" onClick={handleConsultRequest}>
                      상담 요청하기
                      <i className="fas fa-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="tabs-content">
            {/* Tab Navigation */}
            <div className="tab-nav">
              <button
                className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => handleTabClick('about', true)}
              >
                <i className="fas fa-building" />
                회사소개
              </button>
              <button
                className={`tab-button ${activeTab === 'info' ? 'active' : ''} ${!hasInfoContent ? 'disabled' : ''}`}
                onClick={() => handleTabClick('info', hasInfoContent)}
                disabled={!hasInfoContent}
              >
                <i className="fas fa-info-circle" />
                정보
              </button>
              <button
                className={`tab-button ${activeTab === 'career' ? 'active' : ''} ${!hasCareerContent ? 'disabled' : ''}`}
                onClick={() => handleTabClick('career', hasCareerContent)}
                disabled={!hasCareerContent}
              >
                <i className="fas fa-briefcase" />
                경력
              </button>
              <button
                className={`tab-button ${activeTab === 'cases' ? 'active' : ''} ${!hasCasesContent ? 'disabled' : ''}`}
                onClick={() => handleTabClick('cases', hasCasesContent)}
                disabled={!hasCasesContent}
              >
                <i className="fas fa-star" />
                성공케이스
              </button>
            </div>

            {/* Tab Panels */}
            {/* 회사소개 탭 */}
            <div className={`tab-panel ${activeTab === 'about' ? 'active' : ''}`}>
              <div className="about-section">
                <div className="section-header">
                  <h2>회사 소개</h2>
                </div>

                <div className="about-content">
                  <p>{expert.introduction || '회사 소개가 준비 중입니다.'}</p>
                  {expert.detailedIntro && <p style={{marginTop: '16px'}}>{expert.detailedIntro}</p>}

                  <h4>핵심 서비스</h4>
                  <ul style={{fontSize: '14px'}}>
                    {expert.services && expert.services.length > 0 ? (
                      expert.services.map((service, idx) => (
                        <li key={idx}><strong>{service}</strong></li>
                      ))
                    ) : (
                      <li>서비스 정보가 준비 중입니다.</li>
                    )}
                  </ul>

                  <div className="naraddon-logo-container">
                    <img
                      src="/images/ttontok-logo.png"
                      alt="나라똔"
                      className="naraddon-logo"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 정보 탭 */}
            <div className={`tab-panel ${activeTab === 'info' ? 'active' : ''}`}>
              <div className="info-gallery">
                <div className="image-gallery-grid">
                  {expert.galleryImages && expert.galleryImages.length > 0 ? (
                    expert.galleryImages.map((imageUrl, idx) => (
                      <div key={idx} className="gallery-image-item">
                        <img
                          src={imageUrl}
                          alt={`${expert.name} 자료 ${idx + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="gallery-empty">
                      <i className="fas fa-image"></i>
                      <p>등록된 이미지가 없습니다</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-note">
                <i className="fas fa-info-circle" />
                <p>상담을 원하시면 하단 '상담 요청하기' 버튼을 이용해주세요.</p>
              </div>
            </div>

            {/* 경력 탭 */}
            <div className={`tab-panel ${activeTab === 'career' ? 'active' : ''}`}>
              <div className="career-timeline">
                {expert.career && expert.career.length > 0 ? (
                  expert.career.map((item, idx) => {
                    // 연도 추출 (예: "2012년", "2012" 등)
                    const yearMatch = item.match(/(\d{4})년?/);
                    const year = yearMatch ? yearMatch[1] + '년' : null;
                    // 연도 제거한 나머지 텍스트
                    const content = year ? item.replace(/\d{4}년?\s*/, '').trim() : item;

                    return (
                      <div key={idx} className="career-item">
                        {year && <span className="career-year-badge">{year}</span>}
                        <h3>{content}</h3>
                      </div>
                    );
                  })
                ) : (
                  <div className="career-item">
                    <p>경력 정보가 준비 중입니다.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 성공케이스 탭 */}
            <div className={`tab-panel ${activeTab === 'cases' ? 'active' : ''}`}>
              <div className="case-grid">
                {expert.successCases && expert.successCases.length > 0 ? (
                  expert.successCases.map((successCase, idx) => (
                    <div key={idx} className="case-card">
                      <span className="case-category">{successCase.category}</span>
                      <h3 className="case-title">{successCase.title}</h3>
                      <p className="case-description">{successCase.description}</p>
                      <div className="case-result">
                        <strong>성과:</strong> {successCase.result}
                      </div>
                      <div className="case-period">
                        <i className="far fa-calendar-alt" /> {successCase.period}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="case-card">
                    <span className="case-category">준비 중</span>
                    <h3 className="case-title">성공 케이스 준비 중입니다</h3>
                    <p className="case-description">
                      전문가의 성공 케이스는 현재 준비 중입니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
