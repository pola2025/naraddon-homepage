'use client';

import { useEffect, useState } from 'react';

import BrandIntroEditor from '@/components/examiner/BrandIntroEditor';
import CareerEditor from '@/components/examiner/CareerEditor';
import InfoImageEditor from '@/components/examiner/InfoImageEditor';
import SuccessCaseEditor from '@/components/examiner/SuccessCaseEditor';
import ContactInfoEditor from '@/components/examiner/ContactInfoEditor';

/**
 * 회사정보(brandPage) 통합 편집 모달
 *
 * @purpose 관리자가 통합 페이지(/admin/experts) 에서 examiner 의 brandPage 를 직접 편집
 * @context Expert 카드 클릭 → 회사정보 버튼 → email 매칭으로 examiner 조회 → 본 모달
 * @decision
 *   - 5개 examiner Editor 컴포넌트 그대로 재사용 (BrandIntro/Career/InfoImage/SuccessCase/ContactInfo)
 *   - 저장은 PATCH /api/examiner/brand-page 에 examinerId 파라미터로 전달 (관리자 분기)
 *   - 매칭 안 된 케이스는 안내 메시지로 처리 (별도 examiner 등록은 /admin/examiners 에서)
 */

type Career = {
  period: string;
  company: string;
  position: string;
  description?: string;
};

type SuccessCase = {
  title: string;
  client?: string;
  content: string;
  thumbnail?: string;
  date: Date;
};

type ContactInfo = {
  website?: string;
  consultationHours?: string;
  address?: string;
};

type BrandPage = {
  companyLogo?: string;
  companyIntro?: string;
  useDefaultIntro: boolean;
  infoImage?: string;
  careers: Career[];
  successCases: SuccessCase[];
  contactInfo: ContactInfo;
};

interface ExaminerBrandModalProps {
  /** 매칭된 examiner _id (없으면 매칭 실패 안내) */
  examinerId: string | null;
  /** 매칭된 examiner 이름 — 헤더 표시 */
  examinerName: string;
  /** 매칭된 examiner 회사명 — 헤더 표시 */
  examinerCompany?: string;
  /** Expert 측 email — 매칭 실패 시 안내용 */
  expertEmail: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const EMPTY_BRAND_PAGE: BrandPage = {
  companyLogo: '',
  companyIntro: '',
  useDefaultIntro: true,
  infoImage: '',
  careers: [],
  successCases: [],
  contactInfo: {
    website: '',
    consultationHours: '',
    address: '',
  },
};

const SECTIONS = [
  { id: 'intro', label: '회사 로고 · 소개' },
  { id: 'info', label: '정보 이미지' },
  { id: 'career', label: '경력' },
  { id: 'success', label: '성공 케이스' },
  { id: 'contact', label: '연락처' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function ExaminerBrandModal({
  examinerId,
  examinerName,
  examinerCompany,
  expertEmail,
  open,
  onClose,
  onSaved,
}: ExaminerBrandModalProps) {
  const [brandPage, setBrandPage] = useState<BrandPage>(EMPTY_BRAND_PAGE);
  const [activeSection, setActiveSection] = useState<SectionId>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  /**
   * 모달 열릴 때 brandPage 데이터 fetch
   *
   * @purpose 매칭된 examiner 의 현재 brandPage 값을 폼에 로드
   * @endpoint GET /api/admin/examiners (전체 목록에서 해당 id 추출)
   *           또는 /api/expert-services/examiners/[id]/profile (기본 정보만 반환, brandPage 없음)
   */
  useEffect(() => {
    if (!open || !examinerId) return;

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/examiners', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('examiner 목록 조회 실패');
        }
        const data = await response.json();
        const list = (data?.examiners ?? data?.data ?? []) as Array<{
          _id: string;
          brandPage?: BrandPage;
        }>;
        const found = list.find((item) => String(item._id) === examinerId);
        if (cancelled) return;
        if (found?.brandPage) {
          setBrandPage({ ...EMPTY_BRAND_PAGE, ...found.brandPage });
        } else {
          setBrandPage(EMPTY_BRAND_PAGE);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ExaminerBrandModal] load failed:', err);
          setError('회사정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, examinerId]);

  if (!open) return null;

  const handleSave = async () => {
    if (!examinerId) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/examiner/brand-page', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examinerId,
          brandPage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || '저장 실패');
      }
      alert('회사정보가 저장되었습니다.');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('[ExaminerBrandModal] save failed:', err);
      alert(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = () => {
    if (activeSection === 'intro') {
      return (
        <BrandIntroEditor
          companyIntro={brandPage.companyIntro || ''}
          companyLogo={brandPage.companyLogo || ''}
          useDefaultIntro={brandPage.useDefaultIntro}
          onChange={(intro, useDefault, logo) =>
            setBrandPage((prev) => ({
              ...prev,
              companyIntro: intro,
              useDefaultIntro: useDefault,
              companyLogo: logo ?? prev.companyLogo,
            }))
          }
        />
      );
    }
    if (activeSection === 'info') {
      return (
        <InfoImageEditor
          infoImage={brandPage.infoImage || ''}
          onChange={(url) => setBrandPage((prev) => ({ ...prev, infoImage: url }))}
          onSave={async () => {}}
        />
      );
    }
    if (activeSection === 'career') {
      return (
        <CareerEditor
          careers={brandPage.careers}
          onChange={(careers) => setBrandPage((prev) => ({ ...prev, careers }))}
        />
      );
    }
    if (activeSection === 'success') {
      return (
        <SuccessCaseEditor
          successCases={brandPage.successCases}
          onChange={(cases) => setBrandPage((prev) => ({ ...prev, successCases: cases }))}
        />
      );
    }
    if (activeSection === 'contact') {
      return (
        <ContactInfoEditor
          website={brandPage.contactInfo?.website || ''}
          consultationHours={brandPage.contactInfo?.consultationHours || ''}
          address={brandPage.contactInfo?.address || ''}
          onChange={(website, consultationHours, address) =>
            setBrandPage((prev) => ({
              ...prev,
              contactInfo: { website, consultationHours, address },
            }))
          }
        />
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <div className="text-xs font-bold text-emerald-700">회사정보 편집 (brandPage)</div>
            <h2 className="text-lg font-bold text-gray-900">
              {examinerName}
              {examinerCompany && (
                <span className="text-sm font-medium text-gray-500 ml-2">· {examinerCompany}</span>
              )}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!examinerId || isSaving || isLoading}
              onClick={handleSave}
              className="px-5 h-9 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 매칭 실패 */}
        {!examinerId && (
          <div className="p-8 text-center">
            <div className="text-amber-600 mb-2 text-2xl">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <p className="text-gray-700 font-medium">
              이 전문가에 매칭되는 examiner 프로필이 없습니다.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              매칭 키 (email):{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded">{expertEmail || '-'}</code>
            </p>
            <p className="text-xs text-gray-400 mt-4">
              먼저{' '}
              <a href="/admin/examiners" className="text-emerald-700 underline">
                심사관 관리
              </a>
              에서 examiner 프로필을 생성하거나, 동일한 이메일로 examiner를 연결해주세요.
            </p>
          </div>
        )}

        {/* 본문 (좌 섹션 메뉴 / 우 폼) */}
        {examinerId && (
          <div className="grid grid-cols-12 flex-1 overflow-hidden">
            <aside className="col-span-3 border-r border-gray-200 bg-gray-50/50 py-3 overflow-y-auto">
              <div className="px-3 text-[10px] font-bold text-gray-400 tracking-widest mb-2">
                EDIT SECTIONS
              </div>
              <ul className="text-[13px]">
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left px-3 py-2 transition ${
                          isActive
                            ? 'bg-emerald-50 border-l-2 border-emerald-600 font-bold text-emerald-800'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {section.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className="col-span-9 p-6 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
              )}
              {isLoading ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  <i className="fas fa-spinner fa-spin mr-2"></i>회사정보를 불러오는 중...
                </div>
              ) : (
                renderSection()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
