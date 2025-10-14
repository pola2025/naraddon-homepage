'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Examiner } from '@/types/examiner';
import styles from './ExaminerCard.module.css';

interface ExaminerCardProps {
  examiner: Examiner;
  variant?: 'featured' | 'grid';
}

export default function ExaminerCard({ examiner, variant = 'grid' }: ExaminerCardProps) {
  const categoryLabels = {
    funding: '정책자금',
    export: '수출지원',
    certification: '기업인증',
    manufacturing: '제조업',
    startup: '창업지원'
  };

  /**
   * 이미지 URL 처리
   *
   * @purpose MongoDB에 저장된 imageUrl 사용 (Cloudflare R2 또는 외부 URL)
   * @context 관리자 대시보드에서 업로드한 이미지 표시
   * @decision imageUrl이 없으면 기본 placeholder 표시
   */
  const imageUrl = examiner.imageUrl || '/images/default-examiner.jpg';

  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.naraddonBadge}>
        <i className="fas fa-medal"></i>
        <span>나라똔 인증</span>
      </div>

      <div className={styles.cardImage}>
        <img
          src={imageUrl}
          alt={`${examiner.name} - ${examiner.companyName}`}
          loading="lazy"
          onError={(e) => {
            // 이미지 로드 실패 시 기본 이미지로 대체
            const target = e.target as HTMLImageElement;
            target.src = '/images/default-examiner.jpg';
          }}
        />
      </div>

      <div className={styles.infoBlock}>
        <div className={styles.nameBlock}>{examiner.name}</div>
        <div className={styles.companyBlock}>{examiner.companyName}</div>

        <button
          className={styles.premiumCta}
          onClick={() => window.location.href = '/consultation-request'}
        >
          상담 신청하기
        </button>
      </div>
    </div>
  );
}