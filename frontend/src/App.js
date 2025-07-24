import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>NARADDON</h1>
          <p>Welcome to NARADDON Homepage</p>
          <nav>
            <ul>
              <li><Link to="/">홈</Link></li>
              <li><Link to="/certified-examiners">인증 기업심사관</Link></li>
              <li><Link to="/policy-analysis">정책분석</Link></li>
              <li><Link to="/expert-services">전문가 서비스</Link></li>
              <li><Link to="/consultation-request">상담신청</Link></li>
              <li><Link to="/login">로그인</Link></li>
            </ul>
          </nav>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
        
        <footer>
          <p>&copy; 2024 NARADDON. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;