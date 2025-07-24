import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import HeroPreview from './pages/HeroPreview';

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHeroPreview = location.pathname === '/hero-preview';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="App">
      {/* 히어로 프리뷰가 아닐 때만 헤더 표시 */}
      {!isHeroPreview && (
        <>
          {/* 상단 태그라인 배너 */}
          <div className="tagline-banner">
            <p>No.1 인증 기업심사관 플랫폼</p>
          </div>
          
          <header className={`App-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="header-container">
              <div className="header-left">
                <Link to="/" className="logo-section">
                  <div className="logo-wrapper">
                    <img src="/images/Logo.png" alt="NARADDON" className="logo" />
                    <h1 data-text="NARADDON">NARADDON</h1>
                  </div>
                </Link>
              </div>
              <div className="header-center">
                <nav className="main-nav">
                  <ul>
                    <li><Link to="/">홈</Link></li>
                    <li><Link to="/certified-examiners">인증 기업심사관</Link></li>
                    <li><Link to="/policy-analysis">정책분석</Link></li>
                    <li><Link to="/expert-services">전문가 서비스</Link></li>
                    <li><Link to="/consultation-request">상담신청</Link></li>
                  </ul>
                </nav>
              </div>
              <div className="header-right">
                <Link to="/login" className="login-btn">
                  <i className="fas fa-user"></i>
                  로그인
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
        </Routes>
      </main>
      
      {!isHeroPreview && (
        <footer>
          <p>&copy; 2024 NARADDON. All rights reserved.</p>
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