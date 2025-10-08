'use client';

import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';
import {
  LEGAL_BUSINESS_INFO,
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  type LegalModalType,
  type LegalSection,
} from '@/lib/legalContent';

type ProviderId = 'naver' | 'kakao';

type SocialProvider = {
  id: ProviderId;
  label: string;
  helper: string;
  className: string;
  icon: ReactNode;
  helperClass: string;
  ctaClass: string;
};


const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: 'naver',
    label: '네이버 로그인',
    helper: '네이버 아이디로 간편하게 시작하세요',
    className:
      'bg-[#03C75A] text-white hover:bg-[#02b351] hover:shadow-[0_12px_40px_rgba(3,199,90,0.35)] focus-visible:ring-[#02b351]',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        role="img"
        aria-hidden="true"
        className="rounded-lg"
      >
        <rect width="28" height="28" rx="6" fill="#03C75A" />
        <path
          fill="#fff"
          d="M8 6.5h4.4l4.4 6.3V6.5h4.9v15h-4.4l-4.4-6.3v6.3H8z"
        />
      </svg>
    ),
    helperClass: 'text-xs text-white/80 sm:text-sm',
    ctaClass: 'text-white/80 group-hover:text-white',
  },
  {
    id: 'kakao',
    label: '카카오 로그인',
    helper: '카카오톡으로 쉽고 빠른 인증',
    className:
      'bg-[#FEE500] text-[#191600] hover:bg-[#f5dc00] hover:shadow-[0_12px_40px_rgba(254,229,0,0.35)] focus-visible:ring-[#3c1e1e] focus-visible:ring-offset-[#fbe403]',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 56 56"
        role="img"
        aria-hidden="true"
        className="rounded-lg"
      >
        <path
          fill="#391B1B"
          d="M28 8C15.85 8 6 16.12 6 26.08c0 6.23 4.24 11.66 10.67 14.62l-2.22 8.15a1 1 0 0 0 1.52 1.09l9.43-6.01a29 29 0 0 0 2.6.12c12.15 0 22-8.11 22-18.95C50 16.12 40.15 8 28 8z"
        />
      </svg>
    ),
    helperClass: 'text-xs text-[#2c2100] sm:text-sm',
    ctaClass: 'text-[#191600]/70 group-hover:text-[#191600]',
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const [modalProvider, setModalProvider] = useState<SocialProvider | null>(null);
  const [legalModal, setLegalModal] = useState<LegalModalType | null>(null);
  const redirect = searchParams.get('redirect') || '/';
  const legalModalSections: LegalSection[] = legalModal
    ? legalModal === 'terms'
      ? TERMS_SECTIONS
      : PRIVACY_SECTIONS
    : [];
  const legalModalTitle =
    legalModal === 'terms'
      ? '나라똔 서비스 이용약관'
      : legalModal === 'privacy'
        ? '나라똔 개인정보 처리방침'
        : '';
  const legalModalDescription =
    legalModal === 'terms'
      ? '나라똔 서비스 이용에 앞서 반드시 확인해야 할 이용약관 전문입니다.'
      : legalModal === 'privacy'
        ? '나라똔이 수집하고 이용하는 개인정보의 처리 기준과 이용자 권리를 안내합니다.'
        : '';
  const handleOpenLegalModal = (type: LegalModalType) => {
    setModalProvider(null);
    setLegalModal(type);
  };
  const handleCloseLegalModal = () => setLegalModal(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    // 네이버는 실제 로그인 진행
    if (provider.id === 'naver') {
      const { signIn } = await import('next-auth/react');
      signIn('naver', { callbackUrl: redirect });
    } else {
      // 다른 공급자는 모달 표시
      setModalProvider(provider);
      console.info('[login]', provider.id, 'button clicked; redirect target:', redirect);
    }
  };

  return (
    <div className={styles.loginPage}>
      {/* Hero Section - Left Side */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            나라똔과 함께하는
            <br />
            스마트한 정책 관리
          </h1>
          <p className={styles.heroSubtitle}>
            정부 지원사업, 정책 자금, 상담 서비스를
            <br />
            한 곳에서 편리하게 이용하세요
          </p>
        </div>
      </div>

      {/* Form Section - Right Side */}
      <div className={styles.formSection}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>로그인</h2>
            <p className={styles.formSubtitle}>
              SNS 계정으로 간편하게 시작하세요
            </p>
          </div>

          <div className={styles.socialButtons}>
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleSocialLogin(provider)}
                className={`${styles.socialButton} ${
                  provider.id === 'naver' ? styles.naverButton : styles.kakaoButton
                }`}
              >
                {provider.icon}
                <span>{provider.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerText}>소셜 로그인으로 간편 가입</span>
          </div>

          <div className={styles.legalLinks}>
            <button
              type="button"
              onClick={() => handleOpenLegalModal('terms')}
              className="link-button"
            >
              이용약관
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleOpenLegalModal('privacy')}
              className="link-button"
            >
              개인정보 처리방침
            </button>
            <span>·</span>
            <Link href="/">홈으로</Link>
          </div>
        </div>
      </div>

      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            aria-describedby="login-modal-description"
            className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="login-modal-title" className="text-lg font-semibold text-slate-900">
                서비스 준비 중입니다
              </h2>
              <button
                type="button"
                onClick={() => setModalProvider(null)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="모달 닫기"
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>
            <p id="login-modal-description" className="mt-4 text-sm leading-6 text-slate-600">
              {modalProvider.label} 기능은 현재 준비 중입니다. 정식 오픈 후 다시 안내드릴게요.
              곧 편리한 소셜 로그인을 제공할 예정입니다.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalProvider(null)}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            aria-describedby={legalModalDescription ? 'legal-modal-description' : undefined}
            className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="legal-modal-title" className="text-lg font-semibold text-slate-900">
                  {legalModalTitle}
                </h2>
                {legalModalDescription && (
                  <p id="legal-modal-description" className="mt-1 text-sm text-slate-500">
                    {legalModalDescription}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseLegalModal}
                className="self-start rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="모달 닫기"
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 max-h-[70vh] space-y-6 overflow-y-auto pr-1 text-sm leading-6 text-slate-600">
              {legalModalSections.map((section) => (
                <section key={section.title} className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                  <p>{section.description}</p>
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-slate-600">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                <h4 className="font-semibold text-slate-700">사업자 정보</h4>
                <dl className="mt-2 space-y-1">
                  {LEGAL_BUSINESS_INFO.map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="font-medium text-slate-600">{item.label}</dt>
                      <dd className="text-slate-500 sm:text-slate-600">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-slate-400">시행일자: {LEGAL_EFFECTIVE_DATE}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCloseLegalModal}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
