import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import './styles/components.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import HeroPreview from './pages/HeroPreview';
import CertifiedExaminers from './pages/CertifiedExaminers';
import PolicyAnalysis from './pages/PolicyAnalysis';
import ExpertServices from './pages/ExpertServices';
import ConsultationRequest from './pages/ConsultationRequest';

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHeroPreview = location.pathname === '/hero-preview';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="App">
      {/* 히어로 프리뷰가 아닐 때만 헤더 표시 */}
      {!isHeroPreview && (
        <>
          <header className={`App-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="header-container">
              {/* 로고 */}
              <div className="logo-wrapper">
                <Link to="/" className="logo-section">
                  <img src={`${process.env.PUBLIC_URL}/images/Logo.png`} alt="나라똔 로고" className="logo" />
                  <h1>NARADDON</h1>
                </Link>
              </div>

              {/* 메인 네비게이션 - PC용 */}
              <div className="header-center">
                <nav className="main-nav">
                  <ul>
                    <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>나라똔</Link></li>
                    <li><Link to="/consultation-request" className={location.pathname === '/consultation-request' ? 'active' : ''}>상담신청</Link></li>
                    <li><Link to="/policy-analysis" className={location.pathname === '/policy-analysis' ? 'active' : ''}>정책분석</Link></li>
                    <li><Link to="/certified-examiners" className={location.pathname === '/certified-examiners' ? 'active' : ''}>인증 기업심사관</Link></li>
                    <li><Link to="/expert-services" className={location.pathname === '/expert-services' ? 'active' : ''}>전문가 서비스</Link></li>
                  </ul>
                </nav>
              </div>
              
              {/* 우측 로그인 버튼 */}
              <div className="header-right">
                <Link to="/login" className="login-button">
                  <i className="fas fa-user"></i>
                  <span>로그인</span>
                </Link>
              </div>
            </div>
            
            {/* 모바일 블록 네비게이션 */}
            <div className="mobile-block-nav">
              <div className="mobile-nav-grid">
                <Link to="/" className={`mobile-nav-block ${location.pathname === '/' ? 'active' : ''}`}>
                  <i className="fas fa-home"></i>
                  <span>나라똔</span>
                </Link>
                <Link to="/consultation-request" className={`mobile-nav-block ${location.pathname === '/consultation-request' ? 'active' : ''}`}>
                  <i className="fas fa-desktop"></i>
                  <span>상담신청</span>
                </Link>
                <Link to="/policy-analysis" className={`mobile-nav-block ${location.pathname === '/policy-analysis' ? 'active' : ''}`}>
                  <i className="fas fa-bullhorn"></i>
                  <span>정책분석</span>
                </Link>
                <Link to="/certified-examiners" className={`mobile-nav-block ${location.pathname === '/certified-examiners' ? 'active' : ''}`}>
                  <i className="fas fa-user-check"></i>
                  <span>인증심사관</span>
                </Link>
                <Link to="/expert-services" className={`mobile-nav-block ${location.pathname === '/expert-services' ? 'active' : ''}`}>
                  <i className="fas fa-briefcase"></i>
                  <span>전문서비스</span>
                </Link>
                <Link to="/contact" className="mobile-nav-block">
                  <i className="fas fa-phone"></i>
                  <span>고객센터</span>
                </Link>
              </div>
            </div>
          </header>
        </>
      )}
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/hero-preview" element={<HeroPreview />} />
          <Route path="/certified-examiners" element={<CertifiedExaminers />} />
          <Route path="/policy-analysis" element={<PolicyAnalysis />} />
          <Route path="/expert-services" element={<ExpertServices />} />
          <Route path="/consultation-request" element={<ConsultationRequest />} />
        </Routes>
      </main>
      
      {!isHeroPreview && (
        <footer>
          <div className="footer-content">
            <div className="footer-section">
              <h3>나라똔</h3>
              <p>대한민국 No.1 정부지원금 전문가 플랫폼</p>
            </div>
            <div className="footer-section">
              <h4>서비스</h4>
              <ul>
                <li><Link to="/certified-examiners">인증 기업심사관</Link></li>
                <li><Link to="/policy-analysis">정책 알림</Link></li>
                <li><Link to="/expert-services">전문가 서비스</Link></li>
                <li><Link to="/consultation-request">전문가 상담</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>고객센터</h4>
              <p>1588-0000</p>
              <p>평일 09:00 - 18:00</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 NARADDON. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

// Router를 App 외부로 이동
function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
