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
          {/* 웹사이트 - 숨김 처리 */}

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

        {/* 최종 CTA - 심사 신청하기 숨김 처리 */}
      </div>
    </section>
  );
}
