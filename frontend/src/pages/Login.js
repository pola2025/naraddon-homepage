// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: 백엔드 API 연결
      console.log('Login attempt:', formData);
      
      // 임시 로직 (백엔드 연결 전)
      if (formData.email && formData.password) {
        alert('로그인 기능은 백엔드 연결 후 작동합니다.');
        // navigate('/dashboard');
      }
    } catch (err) {
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>로그인</h2>
        <p className="login-subtitle">NARADDON에 오신 것을 환영합니다</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@naraddon.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          
          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" /> 로그인 상태 유지
            </label>
            <Link to="/forgot-password" className="forgot-password">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <div className="register-link">
          아직 계정이 없으신가요? 
          <Link to="/register"> 회원가입</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;