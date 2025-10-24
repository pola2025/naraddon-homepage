'use client';

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './certified-examiners.css';

// 심사관 인터페이스
interface Examiner {
  _id?: string;
  name: string;
  companyName: string;
  imageUrl: string;
  position?: string;
  category?: string;
  specialties?: string[];
}

interface CertifiedExaminersPageProps {
  initialExaminers: Examiner[];
}

// Fisher-Yates 셔플 알고리즘
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function CertifiedExaminersPage({ initialExaminers = [] }: CertifiedExaminersPageProps) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false); // 이제 로딩 없음

  // Hydration 오류 방지: 서버에서는 원본 데이터 사용, 클라이언트에서만 랜덤 정렬
  const [allExaminers] = useState<Examiner[]>(initialExaminers);
  const [featuredExaminers, setFeaturedExaminers] = useState<Examiner[]>(initialExaminers);
  const [gridExaminers, setGridExaminers] = useState<Examiner[]>(initialExaminers);

  // 마운트 후 클라이언트에서만 랜덤 정렬
  useEffect(() => {
    setMounted(true);
    setFeaturedExaminers(shuffleArray(initialExaminers));
    setGridExaminers(shuffleArray(initialExaminers));
  }, [initialExaminers]);

  const handleShowMore = () => {
    if (visibleCount < gridExaminers.length) {
      setVisibleCount(prev => Math.min(prev + 6, gridExaminers.length));
    }
    if (visibleCount + 6 >= gridExaminers.length) {
      setIsExpanded(true);
    }
  };

  const handleShowLess = () => {
    setVisibleCount(6);
    setIsExpanded(false);
  };

  const handleConsultationClick = () => {
    // 상담신청 페이지로 이동 후 form-section으로 스크롤
    window.location.href = '/consultation-request#form-section';
  };
  useEffect(() => {
    // 별빛 배경 효과 생성
    const createStars = () => {
      const starsContainer = document.getElementById('stars');
      if (!starsContainer) return;

      for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 10 + 's';
        starsContainer.appendChild(star);
      }

      for (let i = 0; i < 5; i++) {
        const movingStar = document.createElement('div');
        movingStar.className = 'moving-star';
        movingStar.style.left = Math.random() * 100 + '%';
        movingStar.style.top = Math.random() * 100 + '%';
        movingStar.style.animationDelay = Math.random() * 60 + 's';
        starsContainer.appendChild(movingStar);
      }
    };

    // 로딩 화면 숨기기
    const hideLoader = () => {
      const loader = document.getElementById('loader');
      if (loader) {
        setTimeout(() => {
          loader.classList.add('hidden');
        }, 1000);
      }
    };

    createStars();
    hideLoader();

    // 마우스 추적 glow 효과
    const buttons = document.querySelectorAll('.premium-cta');
    buttons.forEach(button => {
      const handleMouseMove = (e: any) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        target.style.setProperty('--mx', x + 'px');
        target.style.setProperty('--my', y + 'px');
      };

      // Ripple 효과 및 페이지 이동
      const handleClick = (e: any) => {
        const target = e.currentTarget as HTMLElement;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        target.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
        }, 600);

        // 상담 신청 페이지 폼 섹션으로 이동
        window.location.href = '/consultation-request#form-section';
      };

      button.addEventListener('mousemove', handleMouseMove);
      button.addEventListener('click', handleClick);
    });
  }, []);

  return (
    <div className="certified-examiners-wrapper">
      {/* Loading Screen */}
      <div className="loader-wrapper" id="loader">
        <div className="loader">
          <div className="loader-ring"></div>
        </div>
      </div>

      {/* Stars Background */}
      <div className="stars parallax-layer parallax-layer-2" id="stars"></div>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="premium-badge fade-in">
            <i className="fas fa-award"></i>
            <span>Premium Certification</span>
          </div>
          <h1 className="fade-in fade-in-delay-1">
            <span className="desktop-title">인증 기업심사관과 함께하는</span>
            <span className="mobile-title">인증 기업심사관과<br/>함께하는</span><br/>
            <span className="gold-text">
              <span className="desktop-title">프리미엄 비즈니스 컨설팅</span>
              <span className="mobile-title">프리미엄<br/>비즈니스 컨설팅</span>
            </span>
          </h1>
          <p className="fade-in fade-in-delay-2">
            나라똔이 엄선한 최고의 전문가들이<br/>
            귀사의 성공을 위한 맞춤 솔루션을 제공합니다
          </p>
        </div>
      </section>

      {/* Main Carousel */}
      <section className="main-carousel-section">
        <div className="container">
          <p className="section-title">Featured Examiner</p>

          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            speed={800}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            loop={featuredExaminers.length >= 2}
            effect="slide"
            grabCursor={true}
            className="main-swiper"
          >
            {featuredExaminers.map((examiner, index) => (
              <SwiperSlide key={index}>
                <div className="main-card hover-lift">
                  <div className="naraddon-badge">
                    <i className="fas fa-medal"></i>
                    <span>나라똔 인증</span>
                  </div>
                  <div className="main-card-image">
                    <img
                      src={examiner.imageUrl || '/images/default-examiner.png'}
                      alt={`${examiner.name}_${examiner.company}`}
                      loading="lazy"
                    />
                  </div>
                  <div className="info-block">
                    <div className="name-block">{examiner.name}</div>
                    <div className="company-block">{examiner.companyName}</div>
                    <div className="button-group">
                      <button className="premium-cta" onClick={handleConsultationClick}>
                        <span className="button-text">상담 신청하기</span>
                      </button>
                      {/* 브랜드 페이지 공개: 자세히보기 버튼 활성화 */}
                      {examiner._id && (
                        <a href={`/certified-examiners/${examiner._id}`} className="detail-btn">
                          자세히보기
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Grid Section */}
      <section className="grid-section">
        <div className="container">
          <p className="section-title">Certified Professionals</p>

          <div className="cards-grid">
            {gridExaminers.slice(0, visibleCount).map((examiner, index) => (
              <div key={index} className="grid-card hover-lift fade-in">
                <div className="naraddon-badge">
                  <i className="fas fa-certificate"></i>
                  <span>나라똔 인증</span>
                </div>
                <div className="grid-card-image">
                  <img
                    src={examiner.imageUrl || '/images/default-examiner.png'}
                    alt={`${examiner.name}_${examiner.company}`}
                  />
                </div>
                <div className="info-block">
                  <div className="name-block">{examiner.name}</div>
                  <div className="company-block">{examiner.companyName}</div>
                  <div className="button-group">
                    <button className="premium-cta" onClick={handleConsultationClick}>
                      <span className="button-text">상담 신청하기</span>
                    </button>
                    {/* 브랜드 페이지 공개: 자세히보기 버튼 활성화 */}
                    {examiner._id && (
                      <a href={`/certified-examiners/${examiner._id}`} className="detail-btn">
                        자세히보기
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show More / Show Less Button */}
          <div className="show-more-container">
            {!isExpanded && visibleCount < gridExaminers.length && (
              <button className="show-more-btn" onClick={handleShowMore}>
                <span>더보기</span>
                <i className="fas fa-chevron-down"></i>
              </button>
            )}
            {isExpanded && (
              <button className="show-more-btn" onClick={handleShowLess}>
                <span>접기</span>
                <i className="fas fa-chevron-up"></i>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}