'use client';

import React, { useState } from 'react';
import styles from './ContactSection.module.css';

/**
 * 연락처 섹션 컴포넌트
 *
 * @purpose 심사관 브랜드 페이지 하단의 연락처 정보 및 상담 신청 CTA
 * @context 원본 디자인(brand-page-dark-gold.html)의 연락처 섹션 재현
 */

interface ContactSectionProps {
  examiner: any;
}

export default function ContactSection({ examiner }: ContactSectionProps) {
  const [copied, setCopied] = useState(false);

  const brandPage = examiner.brandPage || {};
  const contactInfo = brandPage.contactInfo || {};

  const handleCopyWebsite = async () => {
    if (contactInfo.website) {
      try {
        await navigator.clipboard.writeText(contactInfo.website);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleConsultation = () => {
    // 나라똔 상담신청 페이지 폼 섹션으로 이동
    window.location.href = '/consultation-request#form-section';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <section className={styles.contactCta} id="contact">
      <div className={styles.container}>
        <h2 className={styles.title}>연락처 정보</h2>

        <div className={styles.contactInfoGrid}>
          {/* 웹사이트 */}
          {contactInfo.website && (
            <div className={`${styles.contactItem} ${styles.websiteItem}`}>
              <i className="fas fa-globe"></i>
              <span className={styles.label}>웹사이트</span>
              <div className={styles.websiteCopyWrapper}>
                <div className={styles.websiteUrl} id="websiteUrl">
                  {contactInfo.website}
                </div>
                <button
                  className={styles.copyBtn}
                  onClick={handleCopyWebsite}
                  aria-label="웹사이트 주소 복사"
                >
                  <i className={copied ? "fas fa-check" : "fas fa-copy"}></i>
                </button>
              </div>
            </div>
          )}

          {/* 상담 가능 시간 */}
          {contactInfo.consultationHours && (
            <div className={styles.contactItem}>
              <i className="fas fa-clock"></i>
              <span className={styles.label}>상담 가능 시간</span>
              <div className={styles.value}>
                {contactInfo.consultationHours.split('\n').map((line: string, idx: number) => (
                  <React.Fragment key={idx}>
                    {line}
                    {idx < contactInfo.consultationHours.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* 주소 */}
          {contactInfo.address && (
            <div className={styles.contactItem}>
              <i className="fas fa-map-marker-alt"></i>
              <span className={styles.label}>주소</span>
              <div className={styles.value}>
                {contactInfo.address.split('\n').map((line: string, idx: number) => (
                  <React.Fragment key={idx}>
                    {line}
                    {idx < contactInfo.address.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 최종 CTA */}
        <div className={styles.finalCta}>
          <h3>
            상담을 원하시면<br className={styles.mobileBr} />
            아래 버튼을 클릭해주세요
          </h3>
          <p>여러분의 창업 성공을 함께 만들어가겠습니다</p>
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSpotlight}`}
            onClick={handleConsultation}
            onMouseMove={handleMouseMove}
          >
            <i className="fas fa-headset"></i>
            <span>심사 신청하기</span>
          </button>
        </div>
      </div>
    </section>
  );
}
