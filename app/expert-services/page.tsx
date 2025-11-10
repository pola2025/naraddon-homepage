'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { StandardBottomCta } from '@/components/ui/StandardBottomCta';
import {
  consultFields,
  expertServiceCta,
  expertServiceHero,
  privacyNotice,
  successMessage,
  timingOptions,
} from '@/data/expertServices';
import './page.css';

const MAX_CONTENT_LENGTH = 500;

const defaultFormState = {
  name: '',
  phone: '',
  email: '',
  companyName: '',
  content: '',
};

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  imageUrl: string;
  imageAlt?: string;
  legacyKey?: string;
  specialties?: string[];
  introduction?: string;
}

export default function ExpertServicesPage() {
  const [form, setForm] = useState(defaultFormState);
  const [selectedField, setSelectedField] = useState('');
  const [selectedTiming, setSelectedTiming] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Expert state
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mount state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 해시 기반 스크롤 처리 (전문가 로딩 완료 후)
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted || isLoading) return;

    const scrollToForm = () => {
      const hash = window.location.hash;
      if (hash === '#expert-consultation-form') {
        // DOM이 완전히 렌더링될 때까지 대기
        setTimeout(() => {
          // "상담이 필요한 분야" 섹션을 화면 중앙에 배치
          const targetElement = document.getElementById('consultation-field-section');
          if (targetElement) {
            const elementPosition = targetElement.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            const elementHeight = targetElement.offsetHeight;

            // 요소가 화면 중앙에 오도록 계산
            const offsetPosition = elementPosition + window.pageYOffset - (windowHeight / 2) + (elementHeight / 2);

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }, 500); // 500ms 지연 (전문가 카드 렌더링 대기)
      }
    };

    // 페이지 로드 시 실행
    scrollToForm();

    // 해시 변경 감지
    window.addEventListener('hashchange', scrollToForm);

    return () => {
      window.removeEventListener('hashchange', scrollToForm);
    };
  }, [isMounted, isLoading]);

  // Load experts from API
  useEffect(() => {
    const abortController = new AbortController();

    fetch('/api/experts', {
      signal: abortController.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.experts)) {
          setExperts(data.experts);
        }
        setIsLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load experts:', err);
        }
        setIsLoading(false);
      });

    return () => abortController.abort();
  }, []);

  const heroSubtitle = { __html: expertServiceHero.subtitleHtml };

  const resetForm = () => {
    setForm(defaultFormState);
    setSelectedField('');
    setSelectedTiming('');
    setAgreePrivacy(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.companyName.trim()) {
      window.alert('필수 정보를 모두 입력해 주세요.');
      return;
    }

    if (!selectedField) {
      window.alert('상담이 필요한 분야를 선택해 주세요.');
      return;
    }

    if (!selectedTiming) {
      window.alert('희망 상담 시기를 선택해 주세요.');
      return;
    }

    if (!form.content.trim()) {
      window.alert('상담 요청 내용을 입력해 주세요.');
      return;
    }

    if (!agreePrivacy) {
      window.alert('개인정보 수집 및 이용에 동의해 주세요.');
      return;
    }

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: form.name,
          userPhone: form.phone,
          userEmail: form.email,
          companyName: form.companyName,
          consultationType: '전문가 상담',
          consultationField: selectedField,
          message: form.content,
          preferredTime: selectedTiming,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        window.alert(result.message || successMessage);
        resetForm();
      } else {
        window.alert(result.error || '상담 신청 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('상담 신청 실패:', error);
      window.alert('상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const charCount = form.content.length;

  // Prevent hydration errors
  if (!isMounted) {
    return null;
  }

  return (
    <div className="expert-services-page" style={{background: 'var(--bg-cream)'}}>
      <section className="expert-hero layout-hero relative overflow-hidden">
        <div className="layout-container">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full px-8 py-3" style={{background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--green-dark) 100%)', boxShadow: 'var(--shadow-green)'}}>
              <i className="fas fa-award" style={{color: 'white', fontSize: '18px'}} />
              <span style={{color: 'white', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase'}}>
                {expertServiceHero.badge}
              </span>
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {expertServiceHero.title}
              <span className="block" style={{background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--green-dark) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>{expertServiceHero.highlight}</span>
            </h1>
            <p
              className="mt-6 text-lg leading-7 text-slate-600"
              dangerouslySetInnerHTML={heroSubtitle}
            />
            <div className="mt-10 flex flex-wrap items-center gap-6">
              {expertServiceHero.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white px-6 py-4 shadow ring-1 ring-slate-100"
                >
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                </div>
              ))}
              <a
                href="#expert-consultation-form"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg transition"
                style={{background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--green-dark) 100%)'}}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-headset" aria-hidden="true" /> 상담 요청하기
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="expert-services__experts layout-section" id="expert-cards" style={{background: 'var(--bg-cream)'}}>
        <div className="layout-container">
          <div className="expert-services__experts-header" style={{textAlign: 'center'}}>
            <span style={{display: 'inline-block', padding: '6px 12px', background: 'var(--bg-light)', color: 'var(--green-dark)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '16px'}}>
              Expert Network
            </span>
            <h2 className="expert-services__experts-title">
              검증된 전문가를 만나보세요
            </h2>
            <p className="expert-services__experts-description">
              각 분야 최고의 전문성을 갖춘<br />나라똔 인증 전문가들입니다
            </p>
          </div>

          <div className="expert-carousel-horizontal">
            {isLoading ? (
              <div className="expert-carousel__empty">
                전문가 정보를 불러오는 중입니다.
              </div>
            ) : experts.length === 0 ? (
              <div className="expert-carousel__empty">
                등록된 전문가가 없습니다.
              </div>
            ) : (
              <>
                <div className="expert-carousel__track">
                  {experts.map((expert) => (
                    <article
                      key={expert._id}
                      className="expert-card-horizontal"
                    >
                      <div className="card-inner">
                        <div className="card-image-section">
                          <img
                            src={expert.imageUrl}
                            alt={expert.imageAlt || `${expert.name} 프로필`}
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const placeholder = img.parentElement?.querySelector('.image-placeholder-new');
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                          <div className="image-placeholder-new hidden" style={{display: 'none', alignItems: 'center', justifyContent: 'center', height: '120px', background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)', borderRadius: '20px'}}>
                            <i className="fas fa-user-tie" style={{fontSize: '48px', color: 'white', opacity: 0.5}} />
                          </div>
                          <span className="expert-badge">인증 전문가</span>
                        </div>

                        <div className="card-content-section">
                          <div className="expert-header">
                            <h3 className="expert-name">
                              {expert.name} {expert.position && <span className="expert-position">{expert.position}</span>}
                            </h3>
                            <p className="expert-company">{expert.companyName}</p>
                          </div>
                        </div>
                      </div>

                      {expert.introduction && (
                        <p className="expert-intro" style={{fontSize: '15px', color: 'var(--text-gray)', lineHeight: '1.7', marginBottom: '20px'}}>
                          {expert.introduction}
                        </p>
                      )}

                      {expert.specialties && expert.specialties.length > 0 && (
                        <div className="expert-specialties">
                          {expert.specialties.map((specialty, idx) => (
                            <span key={idx} className="specialty-tag">{specialty}</span>
                          ))}
                        </div>
                      )}

                      <Link
                        href={`/expert-services/${expert._id}`}
                        className="consult-cta"
                      >
                        자세히 보기
                        <i className="fas fa-arrow-right" aria-hidden="true" />
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="layout-section">
        <div className="layout-container max-w-4xl">
          <div className="max-w-2xl" id="expert-consultation-form">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Consultation
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">전문가 상담 신청서</h2>
            <p className="mt-3 text-slate-600">
              연락 받을 정보를 남겨주시면 하루 이내 맞춤형 전문가를 매칭해 드립니다.
            </p>
          </div>

          <form
            className="mt-12 space-y-10 rounded-3xl bg-white p-8 shadow ring-1 ring-slate-100"
            onSubmit={handleSubmit}
          >
            <div className="space-y-3">
              <h3 className="flex items-center text-lg font-semibold text-slate-900">
                <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  1
                </span>
                기본 정보
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="이름 *"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  required
                />
                <input
                  type="tel"
                  placeholder="연락처 *"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  required
                />
                <input
                  type="email"
                  placeholder="이메일 *"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  required
                />
                <input
                  type="text"
                  placeholder="회사명 *"
                  value={form.companyName}
                  onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-3" id="consultation-field-section">
              <h3 className="flex items-center text-lg font-semibold text-slate-900">
                <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  2
                </span>
                상담이 필요한 분야
              </h3>
              <div className="max-w-md space-y-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    상담 분야 선택 <span className="text-blue-600">*</span>
                  </span>
                  <select
                    value={selectedField}
                    onChange={(event) => setSelectedField(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    required
                  >
                    <option value="">상담이 필요한 분야를 선택해 주세요</option>
                    {consultFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500">
                  복수 분야가 필요하면 아래 상담 요청 내용에 함께 적어 주세요.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center text-lg font-semibold text-slate-900">
                <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  3
                </span>
                희망 상담 시기
              </h3>
              <div className="max-w-md">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    상담 시기 선택 <span className="text-blue-600">*</span>
                  </span>
                  <select
                    value={selectedTiming}
                    onChange={(event) => setSelectedTiming(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    required
                  >
                    <option value="">희망하시는 상담 시기를 선택해 주세요</option>
                    {timingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center text-lg font-semibold text-slate-900">
                <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  4
                </span>
                상담 요청 내용
              </h3>
              <div>
                <textarea
                  value={form.content}
                  onChange={(event) => {
                    const next = event.target.value.slice(0, MAX_CONTENT_LENGTH);
                    setForm((prev) => ({ ...prev, content: next }));
                  }}
                  rows={5}
                  placeholder="필요한 서비스와 현재 상황을 구체적으로 적어주세요."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {charCount}/{MAX_CONTENT_LENGTH}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(event) => setAgreePrivacy(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-violet-500"
                />
                <span>
                  개인정보 수집 및 이용에 동의합니다.{' '}
                  <button
                    type="button"
                    onClick={() => setPrivacyOpen(true)}
                    className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                  >
                    자세히 보기
                  </button>
                </span>
              </label>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="submit"
                  disabled={!agreePrivacy}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  상담 요청하기
                </button>
                <a
                  href="#expert-cards"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-violet-300 hover:text-blue-600"
                >
                  전문가 소개 다시 보기
                </a>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="certified-examiners__cta-section">
        <div className="layout-container">
          <StandardBottomCta
            eyebrow="Ready to Consult"
            title={expertServiceCta.title}
            subtitle={expertServiceCta.subtitle}
            buttonHref="#expert-consultation-form"
            buttonLabel={expertServiceCta.primaryLabel}
            buttonAriaLabel={expertServiceCta.primaryLabel}
          />
        </div>
      </section>

      {isPrivacyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setPrivacyOpen(false)}
              className="absolute right-6 top-6 text-slate-400 transition hover:text-slate-600"
              aria-label="닫기"
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
            <h4 className="text-xl font-semibold text-slate-900">개인정보 수집 및 이용 안내</h4>
            <div className="mt-6 space-y-4">
              {privacyNotice.sections.map((section) => (
                <div key={section.title}>
                  <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{section.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {privacyNotice.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
