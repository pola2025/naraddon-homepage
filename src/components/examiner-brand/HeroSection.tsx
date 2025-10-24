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
  };
}

export default function HeroSection({ examiner }: HeroSectionProps) {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
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
