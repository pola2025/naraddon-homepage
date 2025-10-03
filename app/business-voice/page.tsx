'use client';

import React from 'react';
import Link from 'next/link';
import InterviewSection from '@/components/business-voice/InterviewSection';
import TtontokCompact from '@/components/business-voice/TtontokCompact';
import QnASection from '@/components/business-voice/QnASection';
import './page.css';

const BusinessVoicePage = () => {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="business-voice-container">
      {/* 헤더 섹션 */}
      <section className="expert-hero layout-hero relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100">
        <div className="layout-container">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">
              BUSINESS VOICE
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              나라똔과 함께 성장하는
              <span className="block text-blue-600">사업자들의 생생한 목소리</span>
            </h1>
            <p className="mt-6 text-lg leading-7 text-slate-600">
              실제 사업자들의 경험과 노하우를 공유하는 커뮤니티
              <span className="block">성공 사례부터 실패 경험까지, 진솔한 이야기를 만나보세요</span>
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="#ttontok-section"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-600"
              >
                <i className="fas fa-comments" aria-hidden="true" /> 커뮤니티 참여하기
              </Link>
              <Link
                href="/consultation-request#form-section"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-emerald-600 shadow-lg ring-1 ring-emerald-100 transition hover:bg-emerald-50"
              >
                <i className="fas fa-headset" aria-hidden="true" /> 무료 상담 신청
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 1: 나라똔과 함께한 대표님 인터뷰 */}
      <InterviewSection />

      {/* 섹션 2: 똔톡 - MongoDB 실데이터 사용 */}
      <TtontokCompact />

      {/* 섹션 3: 묻고 답하기 - Q&A */}
      <QnASection />

      {/* CTA 섹션 - 나라똔 디자인 스타일 */}
      <section className="business-voice__cta-section" aria-labelledby="business-voice-cta-title">
        <div className="business-voice__cta-container">
          <div className="business-voice__cta-banner">
            <div className="business-voice__cta-content">
              <p className="business-voice__cta-eyebrow">Business Voice</p>
              <h2 id="business-voice-cta-title" className="business-voice__cta-title">
                인증 기업심사관과 함께 사업 고민을
                <br className="business-voice__cta-break" />
                해결하시겠어요?
              </h2>
              <p className="business-voice__cta-description">
                검증된 정책분석 전문가가 1:1로 맞춤 전략을 제안해드립니다.<br />
                대표님의 사업에 필요한 정책을 바로 안내해드립니다.
              </p>
            </div>
            <Link href="/consultation-request#form-section" className="business-voice__cta-button">
              상담 예약하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessVoicePage;