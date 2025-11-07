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
   * 브랜드 페이지 기능 활성화 여부
   *
   * @purpose 프로덕션 배포 시 환경변수로 제어
   * @context 개발 환경에서는 활성화, 프로덕션에서는 환경변수 설정 필요
   * @decision NEXT_PUBLIC_ENABLE_BRAND_PAGE=true 설정 시에만 "자세히보기" 버튼 표시
   * @note 브랜드 페이지 공개: 사용자가 자세히보기 버튼으로 접근 가능
   */
  const enableBrandPage = true; // 브랜드 페이지 공개

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
      <div className={styles.badgeWrapper}>
        <div className={styles.naraddonBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <span>나라똔 인증</span>
        </div>
      </div>

      {/**
       * 활동 점수 배지
       *
       * @purpose 심사관의 활동 점수를 시각적으로 표시
       * @context 활동 점수가 있을 때만 표시
       * @score 로그인(2) + 페이지방문(1) + 게시글(10) + 댓글(5)
       */}
      {examiner.activityScore !== undefined && examiner.activityScore > 0 && (
        <div className={styles.activityBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 23C7.03 23 3 18.97 3 14C3 10.9 4.5 8.1 6.9 6.4C6.6 7.6 6.5 8.8 6.7 10.1C7.1 12.3 8.4 14.2 10.3 15.3C10.5 13.1 11.4 11 13 9.4C14.6 7.8 16.7 6.9 18.9 6.7C18.3 9.2 16.9 11.4 14.8 12.8C13.9 13.4 12.9 13.8 11.8 14C11.8 14.7 11.9 15.4 12.2 16.1C12.8 17.6 14.1 18.7 15.7 19.1C14.6 21.3 12.4 23 12 23Z"/>
          </svg>
          <span>{examiner.activityScore}점</span>
        </div>
      )}

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

        {/**
         * 활동 통계 표시
         *
         * @purpose 심사관의 최근 활동 정보 제공
         * @context 게시글/댓글 수 표시로 신뢰도 향상
         */}
        {examiner.activityStats && (
          <div className={styles.activityStats}>
            {examiner.activityStats.postsCreated > 0 && (
              <span className={styles.stat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2M18 20H6V4H13V9H18V20M16 11H8V13H16V11M16 15H8V17H16V15Z"/>
                </svg>
                게시글 {examiner.activityStats.postsCreated}
              </span>
            )}
            {examiner.activityStats.commentsCreated > 0 && (
              <span className={styles.stat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M9 22C8.4 22 8 21.6 8 21V18H4C2.9 18 2 17.1 2 16V4C2 2.9 2.9 2 4 2H20C21.1 2 22 2.9 22 4V16C22 17.1 21.1 18 20 18H13.9L10.2 21.7C10 21.9 9.8 22 9.5 22H9M10 16V19.1L13.1 16H20V4H4V16H10Z"/>
                </svg>
                댓글 {examiner.activityStats.commentsCreated}
              </span>
            )}
          </div>
        )}

        <div className={styles.buttonGroup}>
          {enableBrandPage && examiner._id && (
            <Link href={`/certified-examiners/${examiner._id}`} className={styles.detailBtn}>
              자세히보기
            </Link>
          )}
          <button
            className={styles.premiumCta}
            onClick={() => window.location.href = '/consultation-request#form-section'}
          >
            상담 신청하기
          </button>
        </div>
      </div>
    </div>
  );
}