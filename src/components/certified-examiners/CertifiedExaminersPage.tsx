'use client';

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './certified-examiners.css';

// 심사관 데이터 - 16명 전체
const allExaminers = [
  { name: '이용흔', company: '제이제이에스 기업지원센터', filename: '이용흔_제이제이에스 기업지원센터.jpg' },
  { name: '김수빈', company: '주식회사 유에스이노웨이브', filename: '김수빈_주식회사 유에스이노웨이브.jpg' },
  { name: '태건호', company: '경영지원컨설팅', filename: '태건호_경영지원컨설팅.jpg' },
  { name: '박민재', company: '푸른중소기업경영컨설팅', filename: '박민재_푸른중소기업경영컨설팅.jpg' },
  { name: '양미진', company: '에스제이파트너스', filename: '양미진_에스제이파트너스.jpg' },
  { name: '전예진', company: '비젠파트너스', filename: '전예진_비젠파트너스.jpg' },
  { name: '전지선', company: '제이티엘파트너스', filename: '전지선_제이티엘파트너스.jpg' },
  { name: '김범준', company: '에스제이파트너스', filename: '김범준_에스제이파트너스.jpg' },
  { name: '김영희', company: '세움기업지원센터', filename: '김영희_세움기업지원센터.jpg' },
  { name: '김태은', company: '가나안 기업지원센터', filename: '김태은_가나안 기업지원센터.jpg' },
  { name: '박성훈', company: '비즈스카이', filename: '박성훈_비즈스카이.jpg' },
  { name: '박현숙', company: '케이피제이', filename: '박현숙_케이피제이.jpg' },
  { name: '손지숙', company: '손스타컴퍼니', filename: '손지숙_손스타컴퍼니.jpg' },
  { name: '전윤지', company: '열린정책자금연구소', filename: '전윤지_열린정책자금연구소.jpg' },
  { name: '팽성희', company: '기업성장지원플랫폼', filename: '팽성희_기업성장지원플랫폼.jpg' },
  { name: '황만규', company: '바른경영지원센터', filename: '황만규_바른경영지원센터.jpg' }
];

// Fisher-Yates 셔플 알고리즘
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function CertifiedExaminersPage() {
  const [visibleCount, setVisibleCount] = useState(6);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서만 랜덤 정렬
  const [featuredExaminers, setFeaturedExaminers] = useState(allExaminers);
  const [gridExaminers, setGridExaminers] = useState(allExaminers);

  useEffect(() => {
    setMounted(true);
    // 클라이언트에서만 랜덤 정렬 실행
    setFeaturedExaminers(shuffleArray(allExaminers));
    setGridExaminers(shuffleArray(allExaminers));
  }, []);

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

    // Ripple 효과
    const buttons = document.querySelectorAll('.premium-cta');
    buttons.forEach(button => {
      button.addEventListener('click', function(e: any) {
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

        // 상담 신청 페이지로 이동
        window.location.href = '/consultation-request';
      });
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
            loop={true}
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
                      src={`/images/examiners/${examiner.filename}`}
                      alt={`${examiner.name}_${examiner.company}`}
                      loading="lazy"
                    />
                  </div>
                  <div className="info-block">
                    <div className="name-block">{examiner.name}</div>
                    <div className="company-block">{examiner.company}</div>
                    <button className="premium-cta" onClick={handleConsultationClick}>상담 신청하기</button>
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
                    src={`/images/examiners/${examiner.filename}`}
                    alt={`${examiner.name}_${examiner.company}`}
                  />
                </div>
                <div className="info-block">
                  <div className="name-block">{examiner.name}</div>
                  <div className="company-block">{examiner.company}</div>
                  <button className="premium-cta">상담 신청하기</button>
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