// src/pages/Home.js
import React from 'react';
import './Home.css';

function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">검증된 기업심사관과 함께</h1>
          <h2 className="hero-subtitle">정책자금 성공 파트너</h2>
          <p className="hero-description">
            정부지원금 사전심사부터 자금 확보까지,<br />
            나라똔이 보증하는 전문 기업심사관이 함께합니다.
          </p>
          <div className="hero-actions">
            <button className="btn-primary">전문 심사 신청</button>
            <button className="btn-secondary">기업심사관 보증제 안내</button>
          </div>
          <div className="hero-stats">
            <p className="hero-note">
              나라똔 기업심사관 보증제도로 안심하세요!<br />
              정부 기업심사원제와 달리 추천을 나라똔이 직접 보증하므로 보증범위 한정(*)과 별도의 심사 나시더라도 책임지고 보호받습니다.
            </p>
          </div>
        </div>
        <div className="hero-image">
          <img src="/images/hero-professional.png" alt="전문가" />
        </div>
      </section>

      {/* Main Services Section */}
      <section className="services-section">
        <div className="container">
          <h2 className="section-title">나라똔의 주요 서비스</h2>
          <p className="section-subtitle">어떤 도움이 필요하신가요?</p>
          <div className="service-grid">
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3>인증 기업심사관</h3>
              <p>검증된 전문가 프로필 확인</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-bullhorn"></i>
              </div>
              <h3>정책 알림</h3>
              <p>최신 정책자금 정보 확인</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-briefcase"></i>
              </div>
              <h3>전문가 서비스</h3>
              <p>세무/법무 등 실무 전문가 연결</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>전문가 상담</h3>
              <p>맞춤형 전문가 매칭 요청</p>
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
                <img src="/images/examiner1.jpg" alt="박OO대표" />
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
                <img src="/images/examiner2.jpg" alt="박OO대표" />
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
                <img src="/images/examiner3.jpg" alt="박OO대표" />
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
                <img src="/images/examiner4.jpg" alt="박OO대표" />
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
                <img src="/images/examiner5.jpg" alt="박OO대표" />
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
    </>
  );
}

export default Home;