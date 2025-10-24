'use client';

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import ExaminerCard from './ExaminerCard';
import { Examiner } from '@/types/examiner';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from './CertifiedExaminersSection.module.css';

/**
 * 인증 기업심사관 섹션 컴포넌트
 *
 * @purpose MongoDB에서 공개된 심사관 목록을 가져와 표시
 * @context 관리자 대시보드에서 추가/수정된 심사관 실시간 반영
 * @decision 정적 JSON 대신 API를 호출하여 최신 데이터 유지
 */
export default function CertifiedExaminersSection() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 심사관 데이터 가져오기
   *
   * @purpose API를 통해 MongoDB에서 공개된 심사관 목록 조회
   * @context isPublished=true인 심사관만 표시
   */
  useEffect(() => {
    const fetchExaminers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/certified-examiners');

        if (!response.ok) {
          throw new Error('Failed to fetch examiners');
        }

        const data = await response.json();

        if (data.success && data.examiners) {
          // sortOrder로 정렬
          const sortedExaminers = data.examiners.sort((a: Examiner, b: Examiner) =>
            (a.sortOrder || 0) - (b.sortOrder || 0)
          );
          setExaminers(sortedExaminers);
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (error) {
        console.error('Failed to fetch examiners:', error);
        setError(error instanceof Error ? error.message : 'Failed to load examiners');
      } finally {
        setLoading(false);
      }
    };

    fetchExaminers();
  }, []);

  const filteredExaminers = examiners.filter(examiner => {
    const matchesSearch = examiner.name.includes(searchTerm) ||
                          examiner.companyName.includes(searchTerm) ||
                          examiner.position.includes(searchTerm) ||
                          examiner.specialties.some(s => s.includes(searchTerm));

    const matchesCategory = selectedCategory === 'all' || examiner.category === selectedCategory;

    return matchesSearch && matchesCategory && examiner.isPublished;
  });

  const featuredExaminers = filteredExaminers.slice(0, 7);
  const gridExaminers = filteredExaminers;

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'funding', label: '정책자금' },
    { value: 'export', label: '수출지원' },
    { value: 'certification', label: '기업인증' },
    { value: 'manufacturing', label: '제조업' },
    { value: 'startup', label: '창업지원' }
  ];

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderRing}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>심사관 목록을 불러오는데 실패했습니다.</p>
        <button onClick={() => window.location.reload()} className={styles.retryBtn}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Stars Background */}
      <div className={styles.stars} aria-hidden="true"></div>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.premiumBadge}>
            <i className="fas fa-award"></i>
            <span>Premium Certification</span>
          </div>
          <h1 className={styles.title}>
            <span className={styles.desktopTitle}>인증 기업심사관과 함께하는</span>
            <span className={styles.mobileTitle}>인증 기업심사관과<br/>함께하는</span>
            <br />
            <span className={styles.goldText}>
              <span className={styles.desktopTitle}>프리미엄 비즈니스 컨설팅</span>
              <span className={styles.mobileTitle}>프리미엄<br/>비즈니스 컨설팅</span>
            </span>
          </h1>
          <p className={styles.subtitle}>
            나라똔이 엄선한 최고의 전문가들이<br />
            귀사의 성공을 위한 맞춤 솔루션을 제공합니다
          </p>
        </div>
      </section>

      {/* Search and Filter */}
      <section className={styles.filterSection}>
        <div className={styles.filterContainer}>
          <div className={styles.searchBox}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="심사관 이름, 회사, 전문분야 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.categoryFilter}>
            {categories.map(category => (
              <button
                key={category.value}
                className={`${styles.categoryBtn} ${selectedCategory === category.value ? styles.active : ''}`}
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Carousel */}
      <section className={styles.carouselSection}>
        <div className={styles.sectionTitle}>Featured Examiner</div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
            1400: {
              slidesPerView: 3,
            },
          }}
          className={styles.swiper}
        >
          {featuredExaminers.map((examiner) => (
            <SwiperSlide key={examiner._id}>
              <ExaminerCard examiner={examiner} variant="featured" />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Grid Section */}
      <section className={styles.gridSection}>
        <div className={styles.sectionTitle}>All Certified Examiners</div>

        <div className={styles.grid}>
          {gridExaminers.map((examiner) => (
            <ExaminerCard key={examiner._id} examiner={examiner} variant="grid" />
          ))}
        </div>

        {filteredExaminers.length === 0 && (
          <div className={styles.noResults}>
            <p>검색 결과가 없습니다.</p>
            <button
              className={styles.resetBtn}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
            >
              검색 초기화
            </button>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBanner}>
          <h3 className={styles.ctaTitle}>
            나라똔 100% 인증 기업심사관과<br />
            맞춤형 성장 전략을 수립하세요
          </h3>
          <p className={styles.ctaDescription}>
            상담 신청 후 24시간 이내에 전문가가 연락드립니다
          </p>
          <a href="/consultation-request#form-section" className={styles.ctaPrimaryBtn}>
            지금 상담 신청하기
          </a>
        </div>
      </section>
    </div>
  );
}