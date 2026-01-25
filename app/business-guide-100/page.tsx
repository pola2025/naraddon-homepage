'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CONSULTATION_FAQ,
  type FaqCategory,
  type FaqQuestion,
} from '../consultation-request/data';
import '../consultation-request/page.css';

function FaqAnswer({ answer }: { answer: string }) {
  return (
    <div className="consultation-request__faq-answer">
      {answer
        .split(/\r?\n\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}

function FaqCard({ category }: { category: FaqCategory }) {
  const [isOpen, setIsOpen] = useState(false); // 카테고리 기본 접힘

  return (
    <article className="consultation-request__faq-card">
      <button
        type="button"
        className="consultation-request__faq-card-header consultation-request__faq-card-header--clickable"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="consultation-request__faq-card-icon" style={{ backgroundColor: `${category.color}1a`, color: category.color }}>
          {category.icon}
        </div>
        <div>
          <p className="consultation-request__faq-card-eyebrow">{category.name}</p>
          <p className="consultation-request__faq-card-count">{category.questions.length}개 질문</p>
        </div>
        <span className={`consultation-request__faq-card-toggle ${isOpen ? 'consultation-request__faq-card-toggle--open' : ''}`} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="consultation-request__faq-card-body">
          {category.questions.map((question: FaqQuestion) => (
            <div key={question.id} className="consultation-request__faq-item consultation-request__faq-item--static">
              <div className="consultation-request__faq-question consultation-request__faq-question--static">
                <span className="consultation-request__faq-question-label">Q</span>
                <span className="consultation-request__faq-question-text">{question.question}</span>
              </div>
              <FaqAnswer answer={question.answer} />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function BusinessGuide100Page() {
  return (
    <div className="consultation-request">
      <section className="consultation-request__faq consultation-request__faq--standalone" id="qna-section">
        <div className="layout-container consultation-request__faq-inner">
          <div className="consultation-request__faq-header">
            <span className="consultation-request__faq-badge">정책자금 100문 100답</span>
            <h1 className="consultation-request__faq-title">사업필독서 100가지</h1>
            <p className="consultation-request__faq-description">
              정책자금 제도, 자격 조건,
              <br />
              준비 서류까지 한눈에 확인하세요.
              <br />
              필요한 내용을 빠르게 찾을 수 있도록
              <br />
              항목별로 정리했습니다.
            </p>
          </div>
          <div id="faq-content" className="consultation-request__faq-grid">
            {CONSULTATION_FAQ.map((category) => (
              <FaqCard key={category.id} category={category} />
            ))}
          </div>

          {/* 무료심사 신청 유도 */}
          <div className="consultation-request__faq-cta">
            <p>더 자세한 상담이 필요하신가요?</p>
            <Link href="/consultation-request#form-section" className="consultation-request__faq-cta-button">
              무료심사 신청하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
