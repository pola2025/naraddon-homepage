// src/pages/Home.js
import React, { useEffect, useState, useCallback } from 'react';
import './Home.css';
import backgroundVideo from '../assets/videos/Naraddon_main_2nd.mp4';


function Home() {
  const [liveCount, setLiveCount] = useState(23);
  
  // 대한민국 도시 목록
  const cities = [
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '수원', '성남', '고양', '용인', '부천', '안산', '안양', '남양주',
    '화성', '평택', '의정부', '시흥', '파주', '김포', '광명', '광주',
    '군포', '하남', '오산', '양주', '이천', '구리', '안성', '포천',
    '의왕', '양평', '여주', '동두천', '과천', '가평', '연천',
    '춘천', '원주', '강릉', '동해', '태백', '속초', '삼척',
    '청주', '충주', '제천', '천안', '공주', '보령', '아산', '서산',
    '논산', '계룡', '당진', '전주', '군산', '익산', '정읍', '남원',
    '김제', '목포', '여수', '순천', '나주', '광양', '포항', '경주',
    '김천', '안동', '구미', '영주', '영천', '상주', '문경', '경산',
    '창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산',
    '제주', '서귀포'
  ];
  
  // 회사명/대표자명 생성 함수
  const generateCompanyName = () => {
    const prefixes = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
    const suffixes = ['기업', '산업', '테크', '컴퍼니', '코퍼레이션', '그룹', '인더스트리', '솔루션', '시스템', '네트웍스', '파트너스', '벤처스', '이노베이션', '엔터프라이즈', '홀딩스'];
    const types = ['(주)', '㈜', ''];
    
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // 다양한 형태로 생성
    const patterns = [
      `${randomPrefix}○○${randomSuffix}`,
      `○○${randomPrefix}${randomSuffix}`,
      `${randomPrefix}○${randomSuffix}`,
      `${randomType}${randomPrefix}○○`,
      `${randomPrefix}○○${randomType}`,
      `○○${randomSuffix}${randomType}`
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  };
  
  // 대표자명 생성 함수
  const generateCEOName = () => {
    const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
    const titles = ['대표', '대표님', '사장님', '대표이사', '회장님'];
    
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    
    return `${randomLastName}○○${randomTitle}`;
  };
  
  // 알림 메시지 생성 함수
  const generateNotification = () => {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const messageTypes = [
      `${city}시 ${generateCompanyName()}이 매칭을 시작했습니다`,
      `${city}시 ${generateCEOName()}이 정책자금을 확보했습니다`,
      `${city}시 ${generateCompanyName()}가 전문가 상담을 예약했습니다`,
      `${city}시 ${generateCompanyName()}이 성공적으로 매칭되었습니다`,
      `${city}시 ${generateCEOName()}이 서류 심사를 통과했습니다`,
      `${city}시 ${generateCompanyName()}에서 추가 상담을 신청했습니다`,
      `${city}시 ${generateCEOName()}이 정책자금 지원을 받았습니다`
    ];
    
    return messageTypes[Math.floor(Math.random() * messageTypes.length)];
  };

  const [videoError, setVideoError] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [iconSectionVisible, setIconSectionVisible] = useState(false);
  const [servicesVisible, setServicesVisible] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [currentCaption, setCurrentCaption] = useState('');
  const [currentSubCaption, setCurrentSubCaption] = useState('');
  const [isCaptionVisible, setIsCaptionVisible] = useState(false);
  const [showGreenOverlay, setShowGreenOverlay] = useState(false);
  
  // 시작 버튼 클릭 핸들러 - useEffect 밖으로 이동
  const handleStartClick = useCallback(() => {
    console.log('버튼 클릭됨');
    
    // 초록색 오버레이 표시
    setShowGreenOverlay(true);
    
    // 잠시 후 버튼 숨기고 콘텐츠 표시
    setTimeout(() => {
      // 버튼 숨기기
      setShowStartButton(false);
      
      // 콘텐츠 표시
      setContentVisible(true);
      setHeroVisible(true);
      setIconSectionVisible(true);
      setServicesVisible(true);
    
    // 콘텐츠가 렌더링된 후 상단으로 스크롤
    // React의 다음 렌더링 사이클을 기다림
    requestAnimationFrame(() => {
      // 지연 후 스크롤
      setTimeout(() => {
        // 현재 스크롤 위치 확인
        console.log('현재 스크롤 위치:', window.scrollY);
        
        // 여러 방법으로 상단으로 스크롤
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // 비디오 섭션으로 스크롤
        const videoWrapper = document.querySelector('.video-section-wrapper');
        if (videoWrapper) {
          const rect = videoWrapper.getBoundingClientRect();
          console.log('비디오 섭션 위치:', rect.top);
          if (rect.top > 0) {
            window.scrollBy(0, -rect.top);
          }
        }
        
        console.log('스크롤 조정 후 위치:', window.scrollY);
      }, 200);
    });
    }, 300); // 오버레이 효과를 위한 지연
  }, []);
  
  // window에 함수 노출
  // 스크롤 방지를 위한 useEffect
  useEffect(() => {
    const preventScroll = (e) => {
      if (showStartButton) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const preventWheel = (e) => {
      if (showStartButton) {
        e.preventDefault();
        return false;
      }
    };

    if (showStartButton) {
      // 스크롤 이벤트 차단
      window.addEventListener('scroll', preventScroll, { passive: false });
      window.addEventListener('wheel', preventWheel, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
      
      // body 스타일로도 스크롤 방지
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // 스크롤 허용
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      window.removeEventListener('scroll', preventScroll);
      window.removeEventListener('wheel', preventWheel);
      window.removeEventListener('touchmove', preventScroll);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showStartButton]);

  useEffect(() => {
    window.handleStartClick = handleStartClick;
  }, [handleStartClick]);
  
  // 자막 데이터
  const captions = [
    { time: 2, endTime: 5, text: '보이지 않는 곳에서' },
    { time: 5.25, endTime: 8, text: '묵묵히 자리를 지키고' },
    { time: 9, endTime: 13, text: '환한 웃음으로 사람을 맞이하고' },
    { time: 18, endTime: 22, text: '뜨거운 땀으로 실력을 증명하고' },
    { time: 25, endTime: 30, text: '고된 하루의 끝을 버텨내는' },
    { time: 33, endTime: 36, text: '당신의 정성스러운 손길이' },
    { time: 36.25, endTime: 39, text: '오늘의 대한민국을 움직입니다.' },
    { time: 40, endTime: 41, text: '' }, // 화면 암전
    { time: 41, endTime: 43, text: '결과만 기억하는 세상 속에서' },
    { time: 43.25, endTime: 46, text: '나라똔은 당신의 과정을 응원합니다.' },
    { time: 47, endTime: 49, text: '혼자 짊어진 무거운 짐,' },
    { time: 49.25, endTime: 52, text: '가장 든든한 \'내 편\'이 되어 나누겠습니다.' },
    { time: 53, endTime: 60, text: '나라똔' },
    { time: 53, endTime: 60, subText: '대한민국 500만 사장님을 응원합니다.' }
  ];
  
  // 스크롤 자동 트리거를 위한 별도 useEffect
  useEffect(() => {
    let isTriggered = false;
    
    const handleScrollTrigger = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      console.log('현재 스크롤 위치:', scrollY, 'showStartButton:', showStartButton, 'isTriggered:', isTriggered);
      
      if (showStartButton && !isTriggered && scrollY > 0) {
        isTriggered = true;
        console.log('스크롤 감지됨! 콘텐츠를 표시합니다.');
        handleStartClick();
      }
    };
    
    // 키보드 입력 감지
    const handleKeyDown = (e) => {
      if (showStartButton && !isTriggered && e.key !== 'Tab') {
        isTriggered = true;
        console.log('키보드 입력 감지! 콘텐츠를 표시합니다.');
        handleStartClick();
      }
    };
    
    // 디바운스 함수
    let scrollTimeout;
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollTrigger, 10);
    };
    
    // 초기 확인
    console.log('사용자 인터랙션 감지 시작');
    
    // 다양한 이벤트에 대응
    window.addEventListener('scroll', debouncedScroll);
    window.addEventListener('wheel', debouncedScroll);
    window.addEventListener('touchstart', handleScrollTrigger);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      window.removeEventListener('wheel', debouncedScroll);
      window.removeEventListener('touchstart', handleScrollTrigger);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(scrollTimeout);
    };
  }, [showStartButton, handleStartClick]);
  
  useEffect(() => {
    // 영상 경로 로그
    console.log('Imported video path:', backgroundVideo);
    console.log('Video element will use imported path');
    
    // import된 영상 경로가 제대로 로드되는지 확인
    if (backgroundVideo) {
      console.log('Video import successful');
    } else {
      console.error('Video import failed');
    }
    
    // 스크롤 기반 요소 표시
    const handleScroll = () => {
      if (!contentVisible) return; // 콘텐츠가 보이기 전에는 작동 안함
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // 히어로 섹션 체크
      const heroSection = document.querySelector('.new-hero-section');
      if (heroSection && !heroVisible) {
        const heroTop = heroSection.offsetTop;
        if (scrollPosition + windowHeight * 0.8 > heroTop) {
          setHeroVisible(true);
        }
      }
      
      // 아이콘 섹션 체크
      const iconSection = document.querySelector('.icon-menu-section');
      if (iconSection && !iconSectionVisible) {
        const iconTop = iconSection.offsetTop;
        if (scrollPosition + windowHeight * 0.8 > iconTop) {
          setIconSectionVisible(true);
        }
      }
      
      // 서비스 섹션 체크
      const servicesSection = document.querySelector('.services-section');
      if (servicesSection && !servicesVisible) {
        const servicesTop = servicesSection.offsetTop;
        if (scrollPosition + windowHeight * 0.8 > servicesTop) {
          setServicesVisible(true);
        }
      }
    };
    
    // 초기 체크
    handleScroll();
    
    // 스크롤 이벤트 리스너
    window.addEventListener('scroll', handleScroll);
    
    // 처음에는 버튼 클릭을 기다림
    //   setHeroVisible(true);
    // }, 300);
    
    // 모바일 탭 기능 초기화
    function isMobileIcon() {
      return window.innerWidth <= 768;
    }
    
    // 탭 기능 초기화
    function initIconTabs() {
      if (!isMobileIcon()) return;
      
      const items = document.querySelectorAll('.icon-menu-section .icon-menu-item');
      const indicators = document.querySelectorAll('.icon-menu-section .tab-indicator');
      const indicatorContainer = document.querySelector('.icon-menu-section .tab-indicators');
      const grid = document.querySelector('.icon-menu-section .icon-menu-grid');
      
      if (!items.length || !indicators.length || !indicatorContainer || !grid) return;
      
      // 모바일에서 인디케이터 표시
      indicatorContainer.style.display = 'flex';
      
      let currentIndex = 0;
      let autoPlayInterval;
      
      // 터치 관련 변수
      let startX = 0;
      let startY = 0;
      let endX = 0;
      let endY = 0;
      let isMoving = false;
      
      // 탭 전환 함수
      function switchTab(index) {
        if (index < 0 || index >= items.length) return;
        
        // 모든 아이템 숨기기
        items.forEach((item, i) => {
          item.classList.remove('active');
          if (indicators[i]) {
            indicators[i].classList.remove('active');
          }
        });
        
        // 선택된 아이템 표시
        if (items[index]) {
          items[index].classList.add('active');
        }
        if (indicators[index]) {
          indicators[index].classList.add('active');
        }
        
        currentIndex = index;
      }
      
      // 자동 재생
      function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(() => {
          const nextIndex = (currentIndex + 1) % items.length;
          switchTab(nextIndex);
        }, 4000);
      }
      
      // 자동 재생 중지
      function stopAutoPlay() {
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
        }
      }
      
      // 인디케이터 클릭 이벤트
      indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', (e) => {
          e.preventDefault();
          stopAutoPlay();
          switchTab(index);
          setTimeout(startAutoPlay, 3000);
        });
      });
      
      // 터치 시작
      grid.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isMoving = false;
        stopAutoPlay();
      }, { passive: true });
      
      // 터치 이동
      grid.addEventListener('touchmove', function(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        endX = touch.clientX;
        endY = touch.clientY;
        
        const deltaX = Math.abs(endX - startX);
        const deltaY = Math.abs(endY - startY);
        
        // 가로 움직임이 세로 움직임보다 클 때
        if (deltaX > deltaY && deltaX > 15) {
          isMoving = true;
        }
      }, { passive: true });
      
      // 터치 끝
      grid.addEventListener('touchend', function(e) {
        if (!isMoving) {
          startAutoPlay();
          return;
        }
        
        const deltaX = endX - startX;
        const deltaY = Math.abs(endY - startY);
        
        // 최소 이동 거리와 방향 확인
        if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > deltaY) {
          if (deltaX > 0) {
            // 오른쪽 스와이프 - 이전 탭
            const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
            switchTab(prevIndex);
          } else {
            // 왼쪽 스와이프 - 다음 탭
            const nextIndex = (currentIndex + 1) % items.length;
            switchTab(nextIndex);
          }
        }
        
        setTimeout(() => {
          startAutoPlay();
        }, 2000);
        
      }, { passive: true });
      
      // 첫 번째 탭 활성화 및 자동 재생 시작
      switchTab(0);
      startAutoPlay();
      
      // 페이지 벗어날 때 자동 재생 중지
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopAutoPlay();
        } else {
          startAutoPlay();
        }
      });
    }
    
    // DOM 로드 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIconTabs);
    } else {
      initIconTabs();
    }
    
    // 리사이즈 시 재초기화
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const indicatorContainer = document.querySelector('.icon-menu-section .tab-indicators');
        if (indicatorContainer) {
          if (isMobileIcon()) {
            indicatorContainer.style.display = 'flex';
            initIconTabs();
          } else {
            indicatorContainer.style.display = 'none';
            // 데스크톱에서는 모든 아이템 표시
            const items = document.querySelectorAll('.icon-menu-section .icon-menu-item');
            items.forEach(item => {
              item.classList.add('active');
            });
          }
        }
      }, 250);
    });
    
    // 정부기관 로고 터치 지원 (스크롤 방해 없이)
    function initGovLogosSwipe() {
      const logosContainer = document.querySelector('.icon-menu-section .government-logos');
      if (!logosContainer) return;
      
      logosContainer.addEventListener('touchstart', () => {
        logosContainer.style.animationPlayState = 'paused';
      }, { passive: true });
      
      logosContainer.addEventListener('touchend', () => {
        setTimeout(() => {
          logosContainer.style.animationPlayState = 'running';
        }, 2000);
      }, { passive: true });
    }
    
    // 정부기관 로고 스와이프 초기화
    initGovLogosSwipe();
    
    // 새로운 히어로 섹션 슬라이더 기능
    const initHeroSlider = () => {
      // 슬라이드 관련 변수
      var currentSlide = 0;
      var slides = document.querySelectorAll('.new-hero-section .slide');
      var indicators = document.querySelectorAll('.new-hero-section .indicator');
      var imageSlider = document.querySelector('.new-hero-section .image-slider');
      var modal = document.getElementById('imageModal');
      var modalImg = document.getElementById('modalImage');
      var modalClose = modal ? modal.querySelector('.modal-close') : null;
      
      // 요소가 없으면 다시 시도
      if (!slides.length || !indicators.length) {
        setTimeout(initHeroSlider, 500);
        return;
      }
      
      // 초기 슬라이드 활성화
      if (slides[0] && !slides[0].classList.contains('active')) {
        slides[0].classList.add('active');
      }
      if (indicators[0] && !indicators[0].classList.contains('active')) {
        indicators[0].classList.add('active');
      }
      
      var images = [
        document.querySelector('.new-hero-section .slide-container .slide:first-child img')?.src || `${window.location.origin}/images/display1.png`,
        document.querySelector('.new-hero-section .slide-container .slide:last-child img')?.src || `${window.location.origin}/images/display2.png`
      ];

      // 자동 슬라이드
      var autoSlideInterval = setInterval(function() {
        changeSlide(1);
      }, 5000);

      // 슬라이드 변경 함수
      function changeSlide(direction) {
        if (!slides[currentSlide]) return;
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');
        
        currentSlide += direction;
        if (currentSlide >= slides.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slides.length - 1;
        
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
      }

      // 특정 슬라이드로 이동
      function goToSlide(index) {
        if (!slides[currentSlide]) return;
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');
        
        currentSlide = index;
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
      }

      // 모달 열기
      function openModal() {
        if (modal) {
          modal.style.display = 'block';
          modal.classList.add('show');
          modalImg.src = images[currentSlide];
          document.body.style.overflow = 'hidden';
        }
      }

      // 모달 닫기
      function closeModal() {
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('show');
          document.body.style.overflow = 'auto';
        }
      }

      // 모달에서 슬라이드 변경
      function changeModalSlide(direction) {
        currentSlide += direction;
        if (currentSlide >= images.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = images.length - 1;
        
        modalImg.src = images[currentSlide];
        
        // 메인 슬라이드도 동기화
        slides.forEach(function(slide, index) {
          slide.classList.remove('active');
          indicators[index].classList.remove('active');
        });
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
      }

      // 이미지 슬라이더 클릭 이벤트
      if (imageSlider) {
        imageSlider.addEventListener('click', function(e) {
          if (!e.target.closest('.slide-arrow') && !e.target.closest('.indicator')) {
            openModal();
          }
        });
      }

      // 모달 배경 클릭시 닫기
      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal || e.target.classList.contains('modal-content')) {
            closeModal();
          }
        });
      }

      // 닫기 버튼
      if (modalClose) {
        modalClose.addEventListener('click', function() {
          closeModal();
        });
      }

      // 슬라이드 화살표
      var slideArrows = document.querySelectorAll('.new-hero-section .slide-arrow');
      slideArrows.forEach(function(arrow) {
        arrow.addEventListener('click', function(e) {
          e.stopPropagation();
          if (this.classList.contains('prev')) {
            changeSlide(-1);
          } else {
            changeSlide(1);
          }
          clearInterval(autoSlideInterval);
          autoSlideInterval = setInterval(function() {
            changeSlide(1);
          }, 5000);
        });
      });

      // 인디케이터
      indicators.forEach(function(indicator, index) {
        indicator.addEventListener('click', function(e) {
          e.stopPropagation();
          goToSlide(index);
          clearInterval(autoSlideInterval);
          autoSlideInterval = setInterval(function() {
            changeSlide(1);
          }, 5000);
        });
      });

      // 모달 화살표
      var modalArrows = document.querySelectorAll('#imageModal .modal-arrow');
      modalArrows.forEach(function(arrow) {
        arrow.addEventListener('click', function(e) {
          e.stopPropagation();
          if (this.classList.contains('prev')) {
            changeModalSlide(-1);
          } else {
            changeModalSlide(1);
          }
        });
      });

      // ESC 키로 모달 닫기
      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal && modal.style.display === 'block') {
          closeModal();
        }
      });
    };
    
    // DOM이 로드된 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHeroSlider);
    } else {
      initHeroSlider();
    }
    
    // Cleanup 함수
    return () => {
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('resize', () => {});
      window.removeEventListener('scroll', handleScroll);
    };
  }, [contentVisible, heroVisible, iconSectionVisible, servicesVisible]); // 상태 변경 시 useEffect 재실행
  
  // 자막 업데이트를 위한 별도 useEffect
  useEffect(() => {
    if (showStartButton) {
      const video = document.querySelector('.video-background video');
      if (video) {
        let previousCaption = '';
        let fadeOutTimeout = null;
        
        const updateCaption = () => {
          const currentTime = video.currentTime;
          const caption = captions.find(cap => {
            return currentTime >= cap.time && currentTime < cap.endTime;
          });
          
          // 현재 시간에 해당하는 자막이 없거나 빈 텍스트인 경우
          if (!caption || (!caption.text && !caption.subText)) {
            if (previousCaption) {
              setCurrentCaption('');
              setCurrentSubCaption('');
              setIsCaptionVisible(false);
              previousCaption = '';
            }
            return;
          }
          
          // 새로운 자막이 나타났을 때
          const captionKey = caption.text + (caption.subText || '');
          if (captionKey !== previousCaption) {
            // 이전 자막 즉시 제거
            if (previousCaption) {
              setCurrentCaption('');
              setCurrentSubCaption('');
              setIsCaptionVisible(false);
            }
            
            // 새 자막 표시
            clearTimeout(fadeOutTimeout);
            fadeOutTimeout = setTimeout(() => {
              setCurrentCaption(caption.text || '');
              setCurrentSubCaption(caption.subText || '');
              setIsCaptionVisible(true);
            }, previousCaption ? 100 : 0);
            
            previousCaption = captionKey;
          }
        };
        
        video.addEventListener('timeupdate', updateCaption);
        return () => {
          video.removeEventListener('timeupdate', updateCaption);
          clearTimeout(fadeOutTimeout);
        };
      }
    } else {
      // 버튼이 사라지면 자막도 제거
      setCurrentCaption('');
      setCurrentSubCaption('');
      setIsCaptionVisible(false);
    }
  }, [showStartButton, captions]);

  return (
    <>
      {/* 영상 배경 래퍼 - 히어로부터 롤링 영역까지만 */}
      <div className="video-section-wrapper">
        {/* 배경 영상 */}
        <div className="video-background">
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            onLoadedData={() => console.log('영상 로드 성공!')}
            onError={(e) => {
              console.error('영상 로드 실패:', e);
              console.log('시도한 경로:', e.target.src);
              setVideoError(true);
            }}
            src={backgroundVideo}
            style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'cover'
            }}
          >
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay"></div>
          
          {/* 초록색 반투명 오버레이 */}
          {showGreenOverlay && (
            <div className="green-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#eaf6e9',
              opacity: 0.8,
              zIndex: 2,
              pointerEvents: 'none',
              animation: 'fadeIn 0.3s ease-out'
            }}></div>
          )}
          
          {/* 자막 */}
          {showStartButton && (currentCaption || currentSubCaption) && (
            <div className={`video-caption ${!isCaptionVisible ? 'fade-out' : ''} ${currentSubCaption ? 'with-sub' : ''}`}>
              {currentCaption && <div className="main-caption">{currentCaption}</div>}
              {currentSubCaption && <div className="sub-caption">{currentSubCaption}</div>}
            </div>
          )}
        </div>
        
        {/* 시작 버튼 */}
        {showStartButton && (
          <div className="start-button-container" style={{
            zIndex: showGreenOverlay ? 3 : 100
          }}>
            <button className="start-button" onClick={handleStartClick}>
              <span className="button-text">나라똔과 함께하기</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}
        
        {/* 영상 위의 콘텐츠들 */}
        <div className={`video-content ${contentVisible ? 'visible' : ''}`}>
          {/* 새로운 히어로 섹션 - 이미지 슬라이더 (맨 위로 이동) */}
          <section className={`new-hero-section ${heroVisible ? 'visible' : ''}`}>
        {/* 장식 요소 */}
        <div className="decoration-1"></div>
        <div className="decoration-2"></div>

        <div className="hero-container">
          {/* 왼쪽: 메인 콘텐츠 + CTA */}
          <div className="hero-content-wrapper">
            <div className="hero-content">
              <h1 className="hero-title">
                대한민국 500만 사장님의 성공!<br />
                <span className="highlight">가장 믿음직한 동행, 나라똔이 함께합니다.</span>
              </h1>
            </div>
            
            {/* CTA 버튼 */}
            <div className="cta-wrapper">
              <a href="/consultation" className="cta-button cta-primary">
                <i className="fas fa-comments"></i>
                <span>무료상담신청</span>
              </a>
              <a href="/certified-inspectors" className="cta-button cta-secondary">
                <i className="fas fa-search"></i>
                <span>전문가찾기</span>
              </a>
            </div>
          </div>

          {/* 오른쪽: 이미지 슬라이더 */}
          <div className="image-wrapper">
            <div className="image-slider" id="heroImageSlider">
              <div className="slide-container">
                {/* 첫 번째 슬라이드 */}
                <div className="slide active">
                  <img src={`${process.env.PUBLIC_URL}/images/display1.png`} alt="정책자금 플랫폼 서비스" />
                </div>
                
                {/* 두 번째 슬라이드 */}
                <div className="slide">
                  <img src={`${process.env.PUBLIC_URL}/images/display2.png`} alt="전문가 컨설팅 서비스" />
                </div>
              </div>
              
              {/* 플로팅 배지 */}
              <div className="floating-badge">신규정책소식</div>
              
              {/* 확대 아이콘 */}
              <div className="zoom-icon">
                <i className="fas fa-search-plus"></i>
              </div>
              
              {/* 슬라이드 화살표 */}
              <div className="slide-arrow prev">
                <i className="fas fa-chevron-left"></i>
              </div>
              <div className="slide-arrow next">
                <i className="fas fa-chevron-right"></i>
              </div>
              
              {/* 슬라이드 인디케이터 */}
              <div className="slide-indicators">
                <span className="indicator active"></span>
                <span className="indicator"></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 아이콘 메뉴 히어로 섹션 (아래로 이동) */}
      <section className={`icon-menu-section ${iconSectionVisible ? 'visible' : ''}`}>
        <div className="container">
          {/* 콘텐츠 박스로 타이틀과 아이콘 감싸기 */}
          <div className="content-box">
            {/* 헤더 영역 */}
            <div className="section-header">
              <h2 className="section-title">
                묵묵히 걸어온 당신을 응원합니다.
              </h2>
              <p className="section-subtitle">
                복잡한 서류와 숫자들의 무게를 덜어드립니다.<br /> 사장님은 가장 중요한 일에만 집중하세요.
              </p>
            </div>

            {/* 아이콘 메뉴 그리드 */}
            <div className="icon-menu-grid">
              <a href="#" className="icon-menu-item active">
                <div className="icon-wrapper">
                  <img src={`${process.env.PUBLIC_URL}/images/모니터.png`} alt="상담신청" />
                </div>
                <span className="menu-text">상담신청</span>
              </a>

              <a href="#" className="icon-menu-item">
                <div className="icon-wrapper">
                  <img src={`${process.env.PUBLIC_URL}/images/정책알림.png`} alt="정책분석" />
                </div>
                <span className="menu-text">정책분석</span>
              </a>

              <a href="#" className="icon-menu-item">
                <div className="icon-wrapper">
                  <img src={`${process.env.PUBLIC_URL}/images/인증기업심사관.png`} alt="인증 기업심사관" />
                </div>
                <span className="menu-text">인증<br />기업심사관</span>
              </a>

              <a href="#" className="icon-menu-item">
                <div className="icon-wrapper">
                  <img src={`${process.env.PUBLIC_URL}/images/전문가서비스.png`} alt="전문가 서비스" />
                </div>
                <span className="menu-text">전문가 서비스</span>
              </a>

              <a href="#" className="icon-menu-item">
                <div className="icon-wrapper">
                  <img src={`${process.env.PUBLIC_URL}/images/고객센터.png`} alt="고객센터" />
                </div>
                <span className="menu-text">고객센터</span>
              </a>
            </div>
            
            {/* 모바일 탭 인디케이터 */}
            <div className="tab-indicators" style={{display: 'none'}}>
              <button className="tab-indicator active" aria-label="탭 1"></button>
              <button className="tab-indicator" aria-label="탭 2"></button>
              <button className="tab-indicator" aria-label="탭 3"></button>
              <button className="tab-indicator" aria-label="탭 4"></button>
              <button className="tab-indicator" aria-label="탭 5"></button>
            </div>
          </div>
        </div>

        {/* 정부기관 로고 스와이프 섹션 */}
        <div className="gov-logos-section">
          <div className="government-logos-wrapper">
            <div className="government-logos">
              <div className="logos-track">
              {/* 첫 번째 세트 */}
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/1.png`} alt="정부기관 로고 1" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/2.png`} alt="정부기관 로고 2" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/3.png`} alt="정부기관 로고 3" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/4.png`} alt="정부기관 로고 4" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/5.png`} alt="정부기관 로고 5" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/6.png`} alt="정부기관 로고 6" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/7.png`} alt="정부기관 로고 7" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/8.png`} alt="정부기관 로고 8" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/9.png`} alt="정부기관 로고 9" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/10.png`} alt="정부기관 로고 10" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/11.png`} alt="정부기관 로고 11" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/12.png`} alt="정부기관 로고 12" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/13.png`} alt="정부기관 로고 13" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/14.png`} alt="정부기관 로고 14" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/15.png`} alt="정부기관 로고 15" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/16.png`} alt="정부기관 로고 16" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/17.png`} alt="정부기관 로고 17" />
              </a>
              </div>
              
              {/* 두 번째 세트 (무한 롤링을 위한 복사) */}
              <div className="logos-track">
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/1.png`} alt="정부기관 로고 1" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/2.png`} alt="정부기관 로고 2" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/3.png`} alt="정부기관 로고 3" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/4.png`} alt="정부기관 로고 4" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/5.png`} alt="정부기관 로고 5" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/6.png`} alt="정부기관 로고 6" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/7.png`} alt="정부기관 로고 7" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/8.png`} alt="정부기관 로고 8" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/9.png`} alt="정부기관 로고 9" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/10.png`} alt="정부기관 로고 10" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/11.png`} alt="정부기관 로고 11" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/12.png`} alt="정부기관 로고 12" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/13.png`} alt="정부기관 로고 13" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/14.png`} alt="정부기관 로고 14" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/15.png`} alt="정부기관 로고 15" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/16.png`} alt="정부기관 로고 16" />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="government-logo">
                <img src={`${process.env.PUBLIC_URL}/images/17.png`} alt="정부기관 로고 17" />
              </a>
              </div>
            </div>
          </div>
          
          {/* 인디케이터 - 17개로 확대 */}
          <div className="logos-indicators">
            <div className="indicator-dot active"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
            <div className="indicator-dot"></div>
          </div>
        </div>
      </section>
        </div> {/* video-content 닫기 */}
      </div> {/* video-section-wrapper 닫기 */}

      {/* 이미지 모달 */}
      <div id="imageModal" className="modal">
        <span className="modal-close">&times;</span>
        <div className="modal-arrow prev">
          <i className="fas fa-chevron-left"></i>
        </div>
        <div className="modal-arrow next">
          <i className="fas fa-chevron-right"></i>
        </div>
        <div className="modal-content">
          <img id="modalImage" src="" alt="확대 이미지" />
        </div>
      </div>

      {/* Main Services Section */}
      <section className={`services-section ${servicesVisible ? 'visible' : ''}`}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">나라똔의 핵심 서비스</h2>
            <p className="section-subtitle">정책자금 성공을 위한 모든 솔루션을 제공합니다</p>
          </div>
          <div className="service-grid">
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3>인증 기업심사관</h3>
              <p>결과보다 과정을 중요시하는 전문가들이 사장님의 이야기를 듣습니다.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-bullhorn"></i>
              </div>
              <h3>정책 알림</h3>
              <p>더 이상 중요한 기회를 놓치지 마세요. 사장님을 위한 맞춤 소식이 도착합니다.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-briefcase"></i>
              </div>
              <h3>전문가 서비스</h3>
              <p>혼자 해결하기 어려운 문제들, 각 분야 전문가가 사장님 곁에서 함께 해결합니다.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>전문가 상담</h3>
              <p>사장님의 상황을 가장 잘 이해하는 전문가를 만나보세요. 든든한 동반자가 되어드립니다.</p>
            </div>
          </div>
        </div>
      </section>



      {/* Floating Actions */}
      <div className="floating-actions">
        <button className="fab-button">
          <i className="fab-icon fas fa-comment-dots"></i>
          <span>실시간 상담</span>
        </button>
        <button className="fab-button phone-button">
          <i className="fab-icon fas fa-phone"></i>
          <span>전화 상담</span>
        </button>
      </div>
    </>
  );
}

export default Home;
