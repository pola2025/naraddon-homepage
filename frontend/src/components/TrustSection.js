import React, { useState, useEffect } from 'react';
import './TrustSection.css';

function TrustSection() {
  // 초기값을 모든 카드 ID로 설정하여 즉시 표시
  const [visibleCards, setVisibleCards] = useState([1, 2, 3, 4]);
  const [shieldAnimation, setShieldAnimation] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(0);
  const [notificationExit, setNotificationExit] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [startButtonClicked, setStartButtonClicked] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [overlayActive, setOverlayActive] = useState(false);

  // 공감 스토리 카드 데이터
  const empathyCards = [
    {
      id: 1,
      icon: 'fa-moon',
      title: '세금 신고 때문에 밤잠 설치셨나요?',
      description: '복잡한 세무 업무, 더 이상 혼자 끙끙대지 마세요.',
      solution: '나라똔 인증 세무사가 맞춤형 절세 전략을 제공합니다',
      color: '#3B82F6'
    },
    {
      id: 2,
      icon: 'fa-file-alt',
      title: '정책자금 서류가 너무 복잡하셨죠?',
      description: '어디서부터 시작해야 할지 막막한 그 마음, 알고 있습니다.',
      solution: '나라똔이 서류 준비부터 제출까지 완벽 대행해드립니다',
      color: '#8B5CF6'
    },
    {
      id: 3,
      icon: 'fa-user-tie',
      title: '혼자서 모든 걸 해결하기 버거우셨죠?',
      description: '사장님은 혼자가 아닙니다. 든든한 파트너가 있습니다.',
      solution: '나라똔 전문가 네트워크가 365일 함께합니다',
      color: '#10B981'
    },
    {
      id: 4,
      icon: 'fa-hand-holding-heart',
      title: '정말 믿고 맡길 수 있을까 고민되셨죠?',
      description: '수많은 약속들 속에서 진짜를 찾기 어려우셨을 겁니다.',
      solution: '나라똔은 계약서에 명시된 100% 책임보증을 약속합니다',
      color: '#F59E0B'
    }
  ];

  // 보증 내용 데이터
  const guaranteeItems = [
    {
      icon: 'fa-undo-alt',
      title: '전액 환불 보증',
      description: '약속한 서비스를 제공하지 못할 경우',
      subdescription: '계약금 포함 전액을 즉시 환불해드립니다'
    },
    {
      icon: 'fa-file-contract',
      title: '계약서 명시',
      description: '구두 약속이 아닌 법적 효력이 있는',
      subdescription: '표준계약서로 모든 보증을 명문화합니다'
    },
    {
      icon: 'fa-user-shield',
      title: '전문가 책임제',
      description: '인증된 전문가가 실명으로 책임지고',
      subdescription: '끝까지 함께하는 1:1 전담 서비스입니다'
    },
    {
      icon: 'fa-handshake',
      title: '손해 배상 약속',
      description: '전문가의 과실로 인한 손해 발생 시',
      subdescription: '정당한 손해배상을 책임지고 보증합니다'
    }
  ];

  // 실시간 알림 메시지
  const notifications = [
    '방금 인천시 부평구 이○○사장님이 정책자금 2억원 승인받으셨습니다',
    '5분 전 서울시 강남구 김○○대표님이 세무 상담을 시작했습니다',
    '10분 전 부산시 해운대구 박○○사장님이 인증 심사관과 매칭되었습니다',
    '15분 전 대구시 중구 최○○대표님이 수출바우처 3천만원 확정받으셨습니다',
    '20분 전 광주시 서구 정○○사장님이 R&D자금 5억원 신청하셨습니다'
  ];

  // 시작 버튼 클릭 감지
  useEffect(() => {
    const checkStartButton = () => {
      const startButton = document.querySelector('.start-button');
      
      // 시작 버튼이 없으면 클릭된 것으로 간주
      if (!startButton && !startButtonClicked) {
        setStartButtonClicked(true);
        console.log('시작 버튼이 클릭되었습니다.');
      }
    };

    // 주기적으로 체크
    const interval = setInterval(checkStartButton, 500);

    return () => clearInterval(interval);
  }, [startButtonClicked]);

  // 알림 자동 변경 (페이드 효과 포함)
  useEffect(() => {
    console.log('알림 useEffect - startButtonClicked:', startButtonClicked);
    
    // 시작 버튼을 클릭하지 않았으면 알림 숨기기
    if (!startButtonClicked) {
      setShowNotification(false);
      setNotificationExit(true);
      return;
    }

    // 시작 버튼 클릭 후 Trust 섹션에서만 알림 표시
    const trustSection = document.querySelector('.trust-section');
    if (trustSection) {
      const trustRect = trustSection.getBoundingClientRect();
      const trustVisible = trustRect.top < window.innerHeight && trustRect.bottom > 0;
      
      if (!trustVisible) {
        setShowNotification(false);
        return;
      }
    }

    // 알림 표시 시작
    setShowNotification(true);
    setNotificationExit(false);
    
    let timeoutId1, timeoutId2;
    
    const interval = setInterval(() => {
      // 1단계: 페이드 아웃 시작
      setNotificationExit(true);
      
      // 2단계: 1초 후 알림 완전히 숨기고 내용 변경
      timeoutId1 = setTimeout(() => {
        setShowNotification(false); // 알림 완전히 숨기기
        setCurrentNotification((prev) => (prev + 1) % notifications.length);
      }, 1000);
      
      // 3단계: 1.9초 후 알림 다시 보이게 하고 페이드 인 (0.9초 텀)
      timeoutId2 = setTimeout(() => {
        setShowNotification(true);
        setNotificationExit(false);
      }, 1900);
    }, 4900); // 4.9초마다 반복

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [startButtonClicked, notifications.length]);

  useEffect(() => {
    const handleScroll = () => {
      const section = document.querySelector('.trust-section');
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.8;

      if (isVisible && !shieldAnimation) {
        setShieldAnimation(true);
      }
      
      // 공감 카드 섹션 체크
      const empathySection = document.querySelector('.empathy-section');
      if (empathySection) {
        const empathyRect = empathySection.getBoundingClientRect();
        const empathyVisible = empathyRect.top < window.innerHeight * 0.8;
        
        if (empathyVisible && visibleCards.length === 0) {
          console.log('공감 카드 애니메이션 시작');
          // 모든 카드를 즉시 표시
          const allCardIds = empathyCards.map(card => card.id);
          setVisibleCards(allCardIds);
          
          // 또는 순차적 애니메이션
          // empathyCards.forEach((card, index) => {
          //   setTimeout(() => {
          //     setVisibleCards(prev => [...prev, card.id]);
          //   }, index * 200);
          // });
        }
      }
    };

    // 초기 체크를 위한 지연
    setTimeout(() => {
      handleScroll();
    }, 100);

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 카드 클릭 핸들러
  const handleCardClick = (cardId) => {
    setExpandedCard(cardId);
    setOverlayActive(true);
    document.body.style.overflow = 'hidden';
  };

  // 카드 닫기 핸들러
  const handleCloseCard = () => {
    setExpandedCard(null);
    setOverlayActive(false);
    document.body.style.overflow = 'auto';
  };

  // 오버레이 클릭 핸들러
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('empathy-overlay')) {
      handleCloseCard();
    }
  };

  return (
    <section className="trust-section">
      <div className="container">
        {/* 메인 보증 영역 */}
        <div className="trust-guarantee-area">
          <div className="shield-wrapper">
            <div className={`shield-icon ${shieldAnimation ? 'animate' : ''}`}>
              <i className="fas fa-shield-alt"></i>
              <div className="shield-pulse"></div>
            </div>
            <div className="guarantee-badge">100%</div>
          </div>
          
          <div className="guarantee-content">
            <h2 className="guarantee-title">
              인증 기업심사관 <span className="highlight">100% 책임보증</span>
            </h2>
            <p className="guarantee-subtitle">
              믿고 맡기세요. 문제가 생기면 <span className="brand-name">나라똔</span>이 책임집니다
            </p>
            <div className="guarantee-features">
              <div className="feature-item">
                <i className="fas fa-certificate"></i>
                <span>법적 구속력 있는 계약서</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-balance-scale"></i>
                <span>전문가 배상책임보험 가입</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-clock"></i>
                <span>24시간 이내 책임 처리</span>
              </div>
            </div>
            <span className="guarantee-note">
              *나라똔 표준계약서에 근거한 보증제도
            </span>
          </div>

          {/* 보증 항목들 */}
          <div className="guarantee-items">
            {guaranteeItems.map((item, index) => (
              <div key={index} className="guarantee-item">
                <i className={`fas ${item.icon}`}></i>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <p>{item.subdescription}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 공감 스토리 카드 섹션 */}
        <div className="empathy-section">
          <div className="empathy-header">
            <h3>사장님의 고민, 우리가 함께 나누겠습니다</h3>
          </div>

          <div className={`empathy-cards ${expandedCard ? 'has-expanded' : ''}`}>
            {empathyCards.map((card) => (
              <div 
                key={card.id} 
                className={`empathy-card ${visibleCards.includes(card.id) ? 'visible' : ''} ${expandedCard === card.id ? 'expanded' : ''}`}
                style={{'--card-color': card.color}}
                onClick={() => !expandedCard && handleCardClick(card.id)}
              >
                {expandedCard === card.id && (
                  <button className="close-button" onClick={(e) => {
                    e.stopPropagation();
                    handleCloseCard();
                  }}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
                <div className="card-icon">
                  <i className={`fas ${card.icon}`}></i>
                </div>
                <div className="card-content">
                  <h4 className="card-title">{card.title}</h4>
                  <p className="card-description">{card.description}</p>
                  <div className="card-solution">
                    <i className="fas fa-check-circle"></i>
                    <span>{card.solution}</span>
                  </div>
                </div>
                <div className="card-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA 영역 */}
        <div className="trust-cta">
          <div className="cta-content">
            <h3>지금 바로 시작하세요</h3>
            <p>3분 간단 상담으로 사장님께 필요한 모든 지원을 확인하세요</p>
          </div>
          <div className="cta-buttons">
            <button className="cta-button primary">
              <i className="fas fa-comment-dots"></i>
              무료 상담 시작하기
            </button>
            <button className="cta-button secondary">
              <i className="fas fa-phone"></i>
              전화 상담 1588-0000
            </button>
          </div>
        </div>

        {/* 실시간 매칭 알림 */}
        {showNotification && startButtonClicked && (
          <div className={`live-notification ${notificationExit ? 'live-notification-exit' : ''}`}>
            <div className="notification-badge">
              <span className="live-dot"></span>
              실시간
            </div>
            <div className="notification-text">
              {notifications[currentNotification]}
            </div>
          </div>
        )}

        {/* 오버레이 */}
        <div 
          className={`empathy-overlay ${overlayActive ? 'active' : ''}`}
          onClick={handleOverlayClick}
        />
      </div>
    </section>
  );
}

export default TrustSection;