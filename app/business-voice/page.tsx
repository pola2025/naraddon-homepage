import React from 'react';
import Link from 'next/link';
import InterviewSection from '@/components/business-voice/InterviewSection';
// 숨김 처리된 컴포넌트 (2025-01-08)
// import TtontokCompact from '@/components/business-voice/TtontokCompact';
// import QnASection from '@/components/business-voice/QnASection';
import './page.css';

/**
 * Business Voice 페이지 (서버 컴포넌트)
 *
 * @purpose 사업자 커뮤니티 페이지 - 인터뷰, 똔톡, Q&A
 * @context InterviewSection이 서버 컴포넌트로 변경되어 초기 로딩 개선
 */
export default async function BusinessVoicePage() {
  return (
    <div className="business-voice-container">
      {/* 섹션 1: 나라똔과 함께한 대표님 인터뷰 */}
      <InterviewSection />

      {/* 섹션 2: 똔톡 - 숨김 처리 (2025-01-08) */}
      {/* <TtontokCompact /> */}

      {/* 섹션 3: 묻고 답하기 - 숨김 처리 (2025-01-08) */}
      {/* <QnASection /> */}
    </div>
  );
}