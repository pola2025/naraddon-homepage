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
  likes?: number;
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
  const [mounted, setMounted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Hydration 오류 방지: 서버에서는 원본 데이터 사용, 클라이언트에서만 랜덤 정렬
  const [allExaminers] = useState<Examiner[]>(initialExaminers);
  const [featuredExaminers, setFeaturedExaminers] = useState<Examiner[]>(initialExaminers);
  const [gridExaminers, setGridExaminers] = useState<Examiner[]>(initialExaminers);

  // 좋아요 상태 관리: 심사관 ID별로 추적
  const [likedExaminers, setLikedExaminers] = useState<Set<string>>(new Set());
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  // 마운트 후 클라이언트에서만 랜덤 정렬
  useEffect(() => {
    setMounted(true);
    setFeaturedExaminers(shuffleArray(initialExaminers));
    setGridExaminers(shuffleArray(initialExaminers));

    // 초기 likes 카운트 설정
    const initialLikes: Record<string, number> = {};
    initialExaminers.forEach(examiner => {
      if (examiner._id) {
        initialLikes[examiner._id] = examiner.likes || 0;
      }
    });
    setLikesCount(initialLikes);
  }, [initialExaminers]);

  /**
   * 좋아요 처리 함수
   *
   * @purpose 심사관에 대한 좋아요 증가 및 상태 업데이트
   * @security IP 기반 24시간 내 1회 제한 (서버에서 검증)
   * @ux 429 에러 시 사용자에게 친절한 안내 메시지 표시
   */
  const handleLike = async (examinerId: string) => {
    if (!examinerId || likedExaminers.has(examinerId)) return;

    try {
      const response = await fetch(`/api/certified-examiners/${examinerId}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setLikesCount(prev => ({
          ...prev,
          [examinerId]: data.likes
        }));
        setLikedExaminers(prev => new Set(prev).add(examinerId));
      } else if (response.status === 429) {
        // 24시간 제한 에러 처리
        alert(data.message || '24시간에 한 번만 좋아요를 누를 수 있습니다.');
        setLikedExaminers(prev => new Set(prev).add(examinerId)); // UI에서도 비활성화
      } else {
        console.error('좋아요 처리 실패:', data.error);
        alert('좋아요 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 무한스크롤: 스크롤 시 더 많은 카드 로드
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // 페이지 하단 300px 전에 더 로드
      if (scrollTop + windowHeight >= docHeight - 300) {
        if (visibleCount < gridExaminers.length) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + 4, gridExaminers.length));
            setLoadingMore(false);
          }, 300);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, gridExaminers.length, loadingMore]);

  const handleConsultationClick = () => {
    // 100문100답 섹션으로 이동
    window.location.href = '/consultation-request#qna-section';
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
            <span>나라똔 인증</span>
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

      {/* Main Carousel - 제목 없이 카드만 표시 */}
      <section className="main-carousel-section">
        <div className="container">
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
            grabCursor={false}
            allowTouchMove={false}
            className="main-swiper"
          >
            {featuredExaminers.map((examiner, index) => (
              <SwiperSlide key={index}>
                <div className="main-card hover-lift">
                  <div className="main-card-image">
                    <img
                      src={examiner.imageUrl || '/images/default-examiner.png'}
                      alt={`${examiner.name}_${examiner.companyName}`}
                      loading="lazy"
                    />
                  </div>
                  <div className="info-block">
                    <div className="name-company-row">
                      <div className="name-company-group">
                        <div className="name-block">{examiner.name}</div>
                        <div className="company-block">{examiner.companyName}</div>
                      </div>
                      {mounted && examiner._id && (
                        <button
                          className={likedExaminers.has(examiner._id) ? 'like-btn main-card-like liked' : 'like-btn main-card-like'}
                          onClick={() => handleLike(examiner._id!)}
                          aria-label="좋아요"
                        >
                          <i className={likedExaminers.has(examiner._id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                        </button>
                      )}
                    </div>
                    <div className="button-group">
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

      {/* Grid Section - 제목 없이 카드만 표시 */}
      <section className="grid-section">
        <div className="container">
          <div className="cards-grid">
            {gridExaminers.slice(0, visibleCount).map((examiner, index) => (
              <div key={index} className="grid-card hover-lift fade-in">
                <div className="grid-card-image">
                  <img
                    src={examiner.imageUrl || '/images/default-examiner.png'}
                    alt={`${examiner.name}_${examiner.companyName}`}
                  />
                </div>
                <div className="info-block">
                  <div className="name-company-row">
                    <div className="name-company-group">
                      <div className="name-block">{examiner.name}</div>
                      <div className="company-block">{examiner.companyName}</div>
                    </div>
                    {mounted && examiner._id && (
                      <button
                        className={likedExaminers.has(examiner._id) ? 'like-btn liked' : 'like-btn'}
                        onClick={() => handleLike(examiner._id!)}
                        aria-label="좋아요"
                      >
                        <i className={likedExaminers.has(examiner._id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                      </button>
                    )}
                  </div>
                  <div className="button-group">
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

          {/* 무한스크롤 로딩 인디케이터 */}
          {loadingMore && (
            <div className="infinite-scroll-loader">
              <div className="loader-spinner"></div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}