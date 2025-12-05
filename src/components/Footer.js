'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './Footer.css';
import {
  LEGAL_BUSINESS_INFO,
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from '@/lib/legalContent';

const Footer = () => {
  const [legalModal, setLegalModal] = useState(null);
  const legalModalSections =
    legalModal === 'terms' ? TERMS_SECTIONS : legalModal === 'privacy' ? PRIVACY_SECTIONS : [];
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
  const handleOpenLegalModal = (type) => {
    setLegalModal(type);
  };
  const handleCloseLegalModal = () => setLegalModal(null);

  return (
    <footer className="footer-wrapper">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-left-column">
            <div className="footer-info">
              <div className="footer-logo">
                <span className="footer-logo-text">나라똔</span>
              </div>
              <p className="footer-desc">
                안심하고 맡길 수 있는 100% 인증 기업심사관
                <br />
                대표님의 든든한 자금계획 파트너
              </p>
            </div>

            <div className="footer-contact">
              <h4 className="footer-title">회사정보</h4>
              <div className="contact-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <path d="M20 8v6"></path>
                  <path d="M23 11h-6"></path>
                </svg>
                <span>대표: 이서영</span>
              </div>
              <div className="contact-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>고객센터: 032-345-9834</span>
              </div>
              <div className="contact-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>사업자등록번호: 203-28-65630</span>
              </div>
              <div className="contact-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>주소: 경기도 광명시 일직로 43, B동 14층 1402호, 1403호</span>
              </div>

              <div className="contact-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>운영시간: 평일 09:00-18:00</span>
              </div>
            </div>
          </div>

          <div className="footer-menu-wrapper">
            <div className="footer-menu">
              <h4 className="footer-title">서비스</h4>
              <ul className="footer-list">
                <li>
                  <Link href="/">나라똔</Link>
                </li>
                <li>
                  <Link href="/policy-analysis">정책분석</Link>
                </li>
                <li>
                  <Link href="/business-voice">사업자 목소리</Link>
                </li>
                <li>
                  <Link href="/certified-examiners">인증 기업심사관</Link>
                </li>
                <li>
                  <Link href="/expert-services">전문가 서비스</Link>
                </li>
                <li>
                  <Link href="/consultation-request">상담신청</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright">© 2025 나라똔. All rights reserved.</p>
          <div className="footer-links">
            <button
            type="button"
            onClick={() => handleOpenLegalModal('terms')}
            className="footer-link-button"
          >
            이용약관
          </button>
          <span className="divider">|</span>
          <button
            type="button"
            onClick={() => handleOpenLegalModal('privacy')}
            className="footer-link-button"
          >
            개인정보처리방침
          </button>
        </div>
        </div>
      </div>
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6" onClick={handleCloseLegalModal}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-legal-modal-title"
            aria-describedby={legalModalDescription ? 'footer-legal-modal-description' : undefined}
            className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h2 id="footer-legal-modal-title" className="text-lg font-semibold text-slate-900">
                  {legalModalTitle}
                </h2>
                {legalModalDescription && (
                  <p id="footer-legal-modal-description" className="mt-1 text-sm text-slate-500">
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
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6 text-sm leading-6 text-slate-600">
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
            <div className="flex-shrink-0 p-6 pt-4 border-t border-slate-100 flex justify-end">
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
    </footer>
  );
};

export default Footer;
