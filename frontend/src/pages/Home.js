// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import './Home.css';

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

  useEffect(() => {
    const video = document.querySelector('.hero-video');
    if (video) {
      // 비디오 로드 완료 시 클래스 추가
      video.addEventListener('loadeddata', () => {
        video.classList.add('loaded');
      });
      
      // 비디오 끝나면 다시 재생
      video.addEventListener('ended', () => {
        video.currentTime = 0;
        video.play();
      });
    }
    
    // 숫자 카운팅 애니메이션
    const animateNumbers = () => {
      const numbers = document.querySelectorAll('.indicator-number');
      numbers.forEach(num => {
        const target = parseFloat(num.getAttribute('data-target'));
        const increment = target / 100;
        let current = 0;
        
        const updateNumber = () => {
          if (current < target) {
            current += increment;
            if (num.getAttribute('data-target') === '4.8') {
              num.textContent = current.toFixed(1);
            } else {
              num.textContent = Math.floor(current).toLocaleString();
            }
            requestAnimationFrame(updateNumber);
          } else {
            if (num.getAttribute('data-target') === '4.8') {
              num.textContent = target.toFixed(1);
            } else {
              num.textContent = Math.floor(target).toLocaleString();
            }
          }
        };
        updateNumber();
      });
    };
    
    // 스크롤 시 숫자 애니메이션 트리거
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateNumbers();
          observer.unobserve(entry.target);
        }
      });
    });
    
    const indicators = document.querySelector('.trust-indicators');
    if (indicators) {
      observer.observe(indicators);
    }
    
    // 실시간 알림 표시
    const showNotification = () => {
      const toast = document.getElementById('toast');
      const message = toast.querySelector('.toast-message');
      
      message.textContent = generateNotification();
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    };
    
    // 5초 후 첫 알림, 그 후 10초마다
    setTimeout(() => {
      showNotification();
      setInterval(showNotification, 10000);
    }, 5000);
    
    // 실시간 상담 대기 수 변경
    const updateLiveCount = () => {
      setLiveCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 ~ +2
        const newCount = prev + change;
        return Math.max(15, Math.min(35, newCount)); // 15~35 범위
      });
    };
    
    setInterval(updateLiveCount, 5000);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        {/* 배경 비디오 */}
        <video className="hero-video" autoPlay muted loop playsInline>
          <source src={`${process.env.PUBLIC_URL}/videos/naraddon_background_low.mp4?v=20250125`} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* 검정색 반투명 오버레이 */}
        <div className="hero-overlay"></div>
        <div className="hero-container">
          <div className="hero-content">
          <div className="hero-title-wrapper">
            <h1 className="hero-title">국내 유일, 100% 보증 플랫폼</h1>
            <div className="hero-subtitle-badge">
              <h2 className="hero-subtitle">나라똔 인증 기업심사관</h2>
            </div>
          </div>
          <p className="hero-description">
            플랫폼이 직접 보증하는 검증된 전문가와<br />
            정책자금의 성공 가능성을 높이세요
          </p>
          
          {/* 검색바 추가 */}
          <div className="hero-search">
            <div className="search-container">
              <input 
                type="text" 
                placeholder="어떤 정책자금을 찾으시나요? (지역, 업종, 지원금액으로 검색)"
                className="search-input"
              />
              <button className="search-button">
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>
          
          <div className="hero-actions">
            <button className="btn-primary">
              지금 전문가 찾기
              <span className="cta-urgent">오늘 신청 시 우선 심사</span>
            </button>
            <button className="btn-secondary">
              플랫폼 둘러보기
              <span className="cta-live">현재 {liveCount}명 상담 대기 중</span>
            </button>
          </div>
          
          {/* 신뢰 지표 */}
          <div className="trust-indicators">
            <div className="indicator-item">
              <span className="indicator-number" data-target="12847">0</span>
              <span className="indicator-label">누적 매칭 건수</span>
            </div>
            <div className="indicator-item">
              <span className="indicator-number" data-target="347">0</span>
              <span className="indicator-label">활동 전문가</span>
            </div>
            <div className="indicator-item">
              <span className="indicator-number" data-target="4.8">0</span>
              <span className="indicator-label">평균 만족도</span>
            </div>
          </div>
          </div>
        </div>
        {/* 스크롤 화살표 */}
        <div className="scroll-indicator" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          ⌄
        </div>
      </section>

      {/* Main Services Section */}
      <section className="services-section">
        <div className="container">
          <h2 className="section-title">나라똔의 주요 서비스</h2>
          <p className="section-subtitle">어떤 도움이 필요하신가요?</p>
          <div className="service-grid">
            <div className="service-card flip-card">
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <div className="service-icon">
                    <i className="fas fa-search"></i>
                  </div>
                  <h3>인증 기업심사관</h3>
                  <p>검증된 전문가 프로필 확인</p>
                </div>
                <div className="flip-card-back">
                  <h3>인증 기업심사관</h3>
                  <p>나라똔이 직접 검증한 전문가들의 상세 프로필과 성공 사례를 확인하세요</p>
                  <button className="flip-cta">자세히 보기 →</button>
                </div>
              </div>
            </div>
            <div className="service-card flip-card">
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <div className="service-icon">
                    <i className="fas fa-bullhorn"></i>
                  </div>
                  <h3>정책 알림</h3>
                  <p>최신 정책자금 정보 확인</p>
                </div>
                <div className="flip-card-back">
                  <h3>정책 알림</h3>
                  <p>실시간 정책자금 소식과 맞춤형 알림 서비스로 기회를 놓치지 마세요</p>
                  <button className="flip-cta">자세히 보기 →</button>
                </div>
              </div>
            </div>
            <div className="service-card flip-card">
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <div className="service-icon">
                    <i className="fas fa-briefcase"></i>
                  </div>
                  <h3>전문가 서비스</h3>
                  <p>세무/법무 등 실무 전문가 연결</p>
                </div>
                <div className="flip-card-back">
                  <h3>전문가 서비스</h3>
                  <p>세무사, 변호사, 노무사 등 각 분야 전문가와 즉시 연결됩니다</p>
                  <button className="flip-cta">자세히 보기 →</button>
                </div>
              </div>
            </div>
            <div className="service-card flip-card">
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <div className="service-icon">
                    <i className="fas fa-comments"></i>
                  </div>
                  <h3>전문가 상담</h3>
                  <p>맞춤형 전문가 매칭 요청</p>
                </div>
                <div className="flip-card-back">
                  <h3>전문가 상담</h3>
                  <p>AI 기반 매칭 시스템으로 귀사에 최적화된 전문가를 찾아드립니다</p>
                  <button className="flip-cta">자세히 보기 →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certified Examiners Section */}
      <section className="examiners-section">
        <div className="container">
          <h2 className="section-title">나라똔과 함께 자금을 확보한 기업들</h2>
          <p className="section-subtitle">실제 고객들이 검증한 전문 기업심사관을 만나보세요</p>
          <div className="examiner-grid">
            <div className="examiner-card">
              <div className="examiner-image">
                <img src={`${process.env.PUBLIC_URL}/images/examiner1.jpg`} alt="박OO대표" />
                <span className="rating">★★★★★</span>
              </div>
              <h4>박OO대표</h4>
              <p className="company">중앙심사컨설팅</p>
              <p className="description">
                자금을 정확하게 파악해주시고, 나의<br />
                기업이 더효과적... 기업시키려면 어떻게<br />
                해야하는 점까지 꼼 같았습니다. 또한<br />
                그 이후 단순... 역사인재도 다름없...
              </p>
            </div>
            <div className="examiner-card">
              <div className="examiner-image">
                <img src={`${process.env.PUBLIC_URL}/images/examiner2.jpg`} alt="박OO대표" />
                <span className="rating">★★★★☆</span>
              </div>
              <h4>박OO대표</h4>
              <p className="company">M 지원센터 대표</p>
              <p className="description">
                나라똔를 신뢰 솔직하게... 어떻게 찾고<br />
                기업심사를를 잘해 인가하시는 상황에<br />
                대 안정성있습... 기업심사부터가 잘정<br />
                한 선명이 여러분 비만이 경우게 발...
              </p>
            </div>
            <div className="examiner-card">
              <div className="examiner-image">
                <img src={`${process.env.PUBLIC_URL}/images/examiner3.jpg`} alt="박OO대표" />
                <span className="rating">★★★★★</span>
              </div>
              <h4>박OO대표</h4>
              <p className="company">미래원컨설팅</p>
              <p className="description">
                매회 확보한 이직원하고 연락습니다<br />
                나리똔의 품을 새로운결과 올앤으로 성<br />
                장으르도 한심있는 나라똔이 대문에<br />
                있지 앞으비 사업하기 나하에 더시...
              </p>
            </div>
            <div className="examiner-card">
              <div className="examiner-image">
                <img src={`${process.env.PUBLIC_URL}/images/examiner4.jpg`} alt="박OO대표" />
                <span className="rating">★★★★☆</span>
              </div>
              <h4>박OO대표</h4>
              <p className="company">대원심사원</p>
              <p className="description">
                나라똔들 너무 신뢰 섹사들도 많이 찾<br />
                는 부분인도 것들입니 대문에 앞은 정<br />
                책자금을 중으로도... 기업심사를력<br />
                붙을 아이들... 좋전해라 불수 있...
              </p>
            </div>
            <div className="examiner-card">
              <div className="examiner-image">
                <img src={`${process.env.PUBLIC_URL}/images/examiner5.jpg`} alt="박OO대표" />
                <span className="rating">★★★★★</span>
              </div>
              <h4>박OO대표</h4>
              <p className="company">세노리 컨설팅</p>
              <p className="description">
                합력적인 신뢰이 지원으로 지금에 찾<br />
                깁니다. 나라똔는 좋았는라 지되합에<br />
                기업심사를에 임새하는 노력으로<br />
                붙으므로 역실를 특색할수어라...
              </p>
            </div>
          </div>
          <button className="btn-more">더 많은 고객 후기 보기 →</button>
        </div>
      </section>

      {/* Policy Fund Success Section */}
      <section className="success-section">
        <div className="container">
          <div className="success-content">
            <div className="success-text">
              <h2>대한민국 사업자를 위한<br />
                  <span className="highlight">정책자금 No.1 플랫폼!</span>
              </h2>
              <div className="success-cta">
                <input type="text" placeholder="전화번호 입력" />
                <button className="btn-consult">무료 상담신청</button>
              </div>
            </div>
            <div className="success-stats">
              <div className="stat-card">
                <h3>소상공인 부담경감 크레딧</h3>
                <p>지원 대상 확인하기</p>
                <div className="score-display">
                  <div className="score-grid">
                    <span className="score">0.9</span>
                    <span className="score">0.5</span>
                    <span className="score">1.6</span>
                    <span className="score">2.7</span>
                    <span className="score">3.8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why NARADDON Section */}
      <section className="why-section">
        <div className="container">
          <h2 className="section-title">왜, 정책자금은 나라똔에서 찾아야 할까요?</h2>
          <p className="section-subtitle">나라똔에 오신 사업자, 사장님, 대표님! 정책자금 빠르게 이해 적정하게 마세요</p>
          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon">
                <i className="fas fa-desktop"></i>
              </div>
              <h3>정책자금<br />설명신청</h3>
            </div>
            <div className="why-card">
              <div className="why-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h3>정책정보</h3>
            </div>
            <div className="why-card">
              <div className="why-icon">
                <i className="fas fa-briefcase"></i>
              </div>
              <h3>민원<br />기업심사원</h3>
            </div>
            <div className="why-card">
              <div className="why-icon">
                <i className="fas fa-leaf"></i>
              </div>
              <h3>전문가 서비스</h3>
            </div>
            <div className="why-card">
              <div className="why-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <h3>고객센터</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <section className="partner-section">
        <div className="container">
          <h2 className="section-title">왜, 정책자금은 나라똔에서 찾아야 할까요?</h2>
          <p className="section-subtitle">나라똔 기업심 나라똔를 큰력하는 이유, 믿디해보세요</p>
          <div className="partner-features">
            <div className="feature-card">
              <div className="feature-icon green">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>정책합금 전문원 진문가</h3>
              <p>정책 달라 지정합 돈 모든 답은 정확된 정보<br />
                 를 기업심사관이는 나라똔해서 붙습니다.<br />
                 정부 정책 달라... 정책 달라 앞니서 상기업<br />
                 문해 붙아...</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green">
                <i className="fas fa-leaf"></i>
              </div>
              <h3>나라똔 인징 보증제도</h3>
              <p>정리적합한 정도 사업, 나라똔는 믿뎨오도<br />
                 나라똔이 직접 기업심 인력원 센터의 개원<br />
                 몇 기 나라똔이이 많은 업러보의 사업자 대<br />
                 표의 전장...</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green">
                <i className="fas fa-users"></i>
              </div>
              <h3>사업 나라 많는 전력적 매칭</h3>
              <p>세 정책에 대한 인감 다오하를 기업 정책을<br />
                 붙되르로 섭지목을 기업 적정한 인감 서비<br />
                 업떠보르는 빗으로 업력하여 인습관에 시<br />
                 그래...</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>업호적인 자금 확보 성공율</h3>
              <p>정셩적 기업의 없업에 특엄시동시 업그래<br />
                 나라똔이 선별보부터 노력하여 사업 벽보은<br />
                 데과적 보상 기워내는 고객컨퇴.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 실시간 알림 토스트 */}
      <div className="notification-toast" id="toast">
        <div className="toast-content">
          <span className="toast-icon">🔔</span>
          <span className="toast-message"></span>
        </div>
      </div>
      
      {/* 플로팅 액션 버튼 */}
      <div className="floating-actions">
        <button className="fab-button chat-button">
          <span className="fab-icon">💬</span>
          <span className="fab-label">실시간 상담</span>
        </button>
        <button className="fab-button phone-button">
          <span className="fab-icon">📞</span>
          <span className="fab-label">1588-0000</span>
        </button>
      </div>
    </>
  );
}

export default Home;