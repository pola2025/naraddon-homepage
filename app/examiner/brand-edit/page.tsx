'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BrandIntroEditor from '@/components/examiner/BrandIntroEditor';
import CareerEditor from '@/components/examiner/CareerEditor';
import SuccessCaseEditor from '@/components/examiner/SuccessCaseEditor';
import ContactInfoEditor from '@/components/examiner/ContactInfoEditor';
import InfoImageEditor from '@/components/examiner/InfoImageEditor';

/**
 * 심사관 브랜드 페이지 편집
 *
 * @purpose 심사관이 본인 브랜드 페이지의 회사소개, 경력, 성공케이스 등을 직접 편집
 * @context 사용자 요청: "회사소개 소개내용 전문영역 지원목표 부분을 직접 작성할 수 있도록
 *          경력도 작성 성공케이스는 게시판 형태로 작성 (이미지 업로드 1:1 썸네일 사이즈)"
 * @decision 탭 형식으로 섹션별 편집 제공 (회사소개, 경력, 성공케이스)
 */

interface ExaminerProfile {
  _id: string;
  name: string;
  companyName?: string;
  brandPage?: {
    companyIntro?: string;
    companyLogo?: string;
    useDefaultIntro: boolean;
    careers: Array<{
      period: string;
      company: string;
      position: string;
      description?: string;
    }>;
    successCases: Array<{
      title: string;
      client?: string;
      content: string;
      thumbnail?: string;
      date: Date;
    }>;
    contactInfo?: {
      website?: string;
      consultationHours?: string;
      address?: string;
    };
  };
}

type TabType = 'intro' | 'career' | 'successCase' | 'contact' | 'info';

export default function BrandEditPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('intro');
  const [profile, setProfile] = useState<ExaminerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 개발 환경: URL 파라미터로 테스트 ID 받기
  const [testExaminerId, setTestExaminerId] = useState<string | null>(null);

  useEffect(() => {
    // URL에서 id 또는 testId 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const examinerId = params.get('id') || params.get('testId');
    if (examinerId) {
      setTestExaminerId(examinerId);
    }
    fetchProfile(examinerId);
  }, []);

  /**
   * 심사관 프로필 조회
   *
   * @purpose 현재 로그인한 심사관의 브랜드 페이지 데이터 조회
   * @context MongoDB expert-examiners 컬렉션에서 현재 사용자 정보 조회
   * @note 개발 환경: testId 파라미터가 있으면 해당 ID로 직접 조회 (인증 우회)
   */
  const fetchProfile = async (testId?: string | null) => {
    try {
      setLoading(true);

      // 개발 환경: testId가 있으면 직접 브랜드 페이지 API 호출
      if (testId) {
        const response = await fetch(`/api/certified-examiners/${testId}`);

        if (!response.ok) {
          throw new Error('심사관 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        if (data.success) {
          setProfile(data.examiner);
        } else {
          throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
        }
      } else {
        // 일반: 로그인한 사용자 프로필 조회
        const response = await fetch('/api/examiner/profile');

        if (!response.ok) {
          throw new Error('프로필을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        if (data.success) {
          setProfile(data.examiner);
        } else {
          throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 브랜드 페이지 저장
   *
   * @purpose 편집한 브랜드 페이지 정보를 서버에 저장
   * @context PATCH /api/examiner/brand-page 엔드포인트 호출
   * @note testExaminerId가 있으면 관리자 편집으로 간주하여 examinerId 전달
   */
  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/examiner/brand-page', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandPage: profile.brandPage,
          examinerId: testExaminerId || undefined, // 관리자 편집 시 특정 심사관 ID 전달
        }),
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        alert('저장되었습니다.');
      } else {
        throw new Error(data.error || '저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : '저장 실패');
      alert(error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 브랜드 페이지 미리보기
   *
   * @purpose 편집 중인 내용을 실제 브랜드 페이지에서 미리보기
   * @context 새 탭에서 /certified-examiners/[id] 페이지 열기
   */
  const handlePreview = () => {
    if (profile?._id) {
      window.open(`/certified-examiners/${profile._id}`, '_blank');
    }
  };

  const tabs = [
    { id: 'intro' as TabType, label: '회사소개', icon: 'fas fa-building' },
    { id: 'info' as TabType, label: '정보', icon: 'fas fa-image' },
    { id: 'career' as TabType, label: '경력', icon: 'fas fa-briefcase' },
    { id: 'successCase' as TabType, label: '성공케이스', icon: 'fas fa-trophy' },
    { id: 'contact' as TabType, label: '연락처', icon: 'fas fa-address-book' },
  ];

  // 메인 컨텐츠 렌더링 함수
  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner message="프로필을 불러오는 중..." fullScreen />;
    }

    if (error || !profile) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">오류</h2>
            <p className="text-gray-700 mb-6">{error || '프로필을 불러올 수 없습니다.'}</p>
            <button
              onClick={() => router.push('/examiner/dashboard')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">브랜드 페이지 편집</h1>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                  회사소개, 경력, 성공케이스를 직접 작성하고 관리하세요
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handlePreview}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  <i className="fas fa-eye sm:mr-2"></i>
                  <span className="hidden sm:inline">미리보기</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm sm:text-base whitespace-nowrap"
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin sm:mr-2"></i>
                      <span className="hidden sm:inline">저장 중...</span>
                      <span className="sm:hidden">저장중</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save sm:mr-2"></i>
                      <span className="hidden sm:inline">저장</span>
                      <span className="sm:hidden">저장</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto -mb-px scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-shrink-0 py-3 sm:py-4 px-3 sm:px-6 text-center border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-1 sm:gap-2
                      ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <i className={tab.icon}></i>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="p-4 sm:p-6">
              {activeTab === 'intro' && (
                <BrandIntroEditor
                  companyIntro={profile.brandPage?.companyIntro || ''}
                  companyLogo={profile.brandPage?.companyLogo || ''}
                  useDefaultIntro={profile.brandPage?.useDefaultIntro ?? true}
                  onChange={(intro, useDefault, logo) => {
                    setProfile({
                      ...profile,
                      brandPage: {
                        ...profile.brandPage,
                        companyIntro: intro,
                        companyLogo: logo,
                        useDefaultIntro: useDefault,
                        careers: profile.brandPage?.careers || [],
                        successCases: profile.brandPage?.successCases || [],
                        contactInfo: profile.brandPage?.contactInfo || {},
                      },
                    });
                  }}
                  onSave={handleSave}
                />
              )}

              {activeTab === 'career' && (
                <CareerEditor
                  careers={profile.brandPage?.careers || []}
                  onChange={(careers) => {
                    setProfile({
                      ...profile,
                      brandPage: {
                        ...profile.brandPage,
                        companyIntro: profile.brandPage?.companyIntro || '',
                        companyLogo: profile.brandPage?.companyLogo || '',
                        useDefaultIntro: profile.brandPage?.useDefaultIntro ?? true,
                        careers,
                        successCases: profile.brandPage?.successCases || [],
                        contactInfo: profile.brandPage?.contactInfo || {},
                      },
                    });
                  }}
                />
              )}

              {activeTab === 'successCase' && (
                <SuccessCaseEditor
                  successCases={profile.brandPage?.successCases || []}
                  onChange={(successCases) => {
                    setProfile({
                      ...profile,
                      brandPage: {
                        ...profile.brandPage,
                        companyIntro: profile.brandPage?.companyIntro || '',
                        companyLogo: profile.brandPage?.companyLogo || '',
                        useDefaultIntro: profile.brandPage?.useDefaultIntro ?? true,
                        careers: profile.brandPage?.careers || [],
                        successCases,
                        contactInfo: profile.brandPage?.contactInfo || {},
                      },
                    });
                  }}
                />
              )}

              {activeTab === 'contact' && (
                <ContactInfoEditor
                  website={profile.brandPage?.contactInfo?.website || ''}
                  consultationHours={profile.brandPage?.contactInfo?.consultationHours || ''}
                  address={profile.brandPage?.contactInfo?.address || ''}
                  onChange={(website, consultationHours, address) => {
                    setProfile({
                      ...profile,
                      brandPage: {
                        ...profile.brandPage,
                        companyIntro: profile.brandPage?.companyIntro || '',
                        companyLogo: profile.brandPage?.companyLogo || '',
                        useDefaultIntro: profile.brandPage?.useDefaultIntro ?? true,
                        careers: profile.brandPage?.careers || [],
                        successCases: profile.brandPage?.successCases || [],
                        contactInfo: {
                          website,
                          consultationHours,
                          address,
                        },
                      },
                    });
                  }}
                />
              )}

              {activeTab === 'info' && (
                <InfoImageEditor
                  infoImage={profile.brandPage?.infoImage || ''}
                  onChange={(imageUrl) => {
                    setProfile({
                      ...profile,
                      brandPage: {
                        ...profile.brandPage,
                        companyIntro: profile.brandPage?.companyIntro || '',
                        companyLogo: profile.brandPage?.companyLogo || '',
                        useDefaultIntro: profile.brandPage?.useDefaultIntro ?? true,
                        careers: profile.brandPage?.careers || [],
                        successCases: profile.brandPage?.successCases || [],
                        contactInfo: profile.brandPage?.contactInfo || {},
                        infoImage: imageUrl,
                      },
                    });
                  }}
                  onSave={handleSave}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 개발 환경: testId 파라미터가 있으면 인증 우회
  if (testExaminerId) {
    return renderContent();
  }

  // 일반 환경: ProtectedRoute로 감싸기
  return (
    <ProtectedRoute requiredRole="examiner">
      {renderContent()}
    </ProtectedRoute>
  );
}
