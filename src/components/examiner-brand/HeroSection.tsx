'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  examiner: {
    _id: string;
    name: string;
    position: string;
    companyName?: string;
    imageUrl?: string;
    specialties: string[];
    views?: number;
    likes?: number;
  };
}

export default function HeroSection({ examiner }: HeroSectionProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(examiner.likes || 0);

  /**
   * 좋아요 처리 함수
   *
   * @purpose 심사관에 대한 좋아요 증가 및 상태 업데이트
   * @security IP 기반 24시간 내 1회 제한 (서버에서 검증)
   * @ux 429 에러 시 사용자에게 친절한 안내 메시지 표시
   */
  const handleLike = async () => {
    if (liked) return; // 이미 좋아요를 눌렀으면 무시

    try {
      const response = await fetch(`/api/certified-examiners/${examiner._id}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setLikesCount(data.likes);
        setLiked(true);
      } else if (response.status === 429) {
        // 24시간 제한 에러 처리
        alert(data.message || '24시간에 한 번만 좋아요를 누를 수 있습니다.');
        setLiked(true); // UI에서도 비활성화
      } else {
        console.error('좋아요 처리 실패:', data.error);
        alert('좋아요 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleConsultation = () => {
    window.location.href = '/consultation-request#form-section';
  };

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.profileCardWrapper}>
          <div className={styles.certifiedBadge}>
            <i className="fas fa-medal"></i>
            <span>나라똔 인증</span>
          </div>

          <button 
            className={liked ? `${styles.floatingLikeBtn} ${styles.liked}` : styles.floatingLikeBtn}
            onClick={handleLike}
          >
            <i className={liked ? 'fas fa-heart' : 'far fa-heart'}></i>
          </button>

          <div className={styles.cardImageContainer}>
            {examiner.imageUrl ? (
              <Image
                src={examiner.imageUrl}
                alt={examiner.name + ' 프로필'}
                width={800}
                height={600}
                className={styles.profileImage}
                priority
              />
            ) : (
              <div className={styles.cardImagePlaceholder}>
                <i className="fas fa-user-tie"></i>
              </div>
            )}
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.infoBlock}>
              <div className={styles.nameBlock}>{examiner.name}</div>
              {examiner.companyName && (
                <div className={styles.companyBlock}>{examiner.companyName}</div>
              )}
            </div>

            <p className={styles.positionText}>{examiner.position}</p>

            {examiner.specialties && examiner.specialties.length > 0 && (
              <div className={styles.hashtags}>
                {examiner.specialties.map((specialty, index) => (
                  <span key={index} className={styles.hashtag}>
                    #{specialty}
                  </span>
                ))}
              </div>
            )}

            {/* 조회수 / 좋아요 */}
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <i className="fas fa-eye"></i>
                <span>{(examiner.views || 0).toLocaleString()}</span>
              </div>
              <div className={styles.statItem} onClick={handleLike} style={{ cursor: 'pointer' }}>
                <i className={liked ? 'fas fa-heart' : 'far fa-heart'} style={{ color: liked ? '#d4af37' : 'inherit' }}></i>
                <span>{likesCount.toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.ctaButtons}>
              <button className={styles.btnPrimary} onClick={handleConsultation}>
                <i className="fas fa-comments"></i>
                <span>상담 신청하기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
