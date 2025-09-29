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

  // 이미지 경로 처리 - public 폴더의 이미지 사용
  const imageName = `${examiner.name}_${examiner.companyName}.jpg`;

  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.naraddonBadge}>
        <i className="fas fa-medal"></i>
        <span>나라똔 인증</span>
      </div>

      <div className={styles.cardImage}>
        <img
          src={`/${imageName}`}
          alt={`${examiner.name}_${examiner.companyName}`}
          loading="lazy"
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