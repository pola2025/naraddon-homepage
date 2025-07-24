// src/pages/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: 'company', // 기본값: 기업회원
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    // 기업심사관 전용
    activeRegions: [],
    specialties: [],
    website: '',
    // 기업회원 전용
    businessNumber: '',
    companyName: '',
    region: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleArrayChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value.split(',').map(item => item.trim()).filter(item => item)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      // TODO: 백엔드 API 연결
      console.log('Register attempt:', formData);
      
      // 임시 로직
      alert('회원가입 기능은 백엔드 연결 후 작동합니다.');
    } catch (err) {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>회원가입</h2>
        <p className="register-subtitle">NARADDON 회원이 되어주세요</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* 회원 유형 선택 */}
          <div className="form-group">
            <label>회원 유형</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="company"
                  checked={formData.role === 'company'}
                  onChange={handleChange}
                />
                기업회원
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="examiner"
                  checked={formData.role === 'examiner'}
                  onChange={handleChange}
                />
                기업심사관
              </label>
            </div>
          </div>

          {/* 공통 필드 */}
          <div className="form-group">
            <label htmlFor="email">이메일 *</label>
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
            <label htmlFor="password">비밀번호 *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="8자 이상 입력하세요"
              minLength="8"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인 *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">이름 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="실명을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">연락처 *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="010-0000-0000"
            />
          </div>

          {/* 기업심사관 전용 필드 */}
          {formData.role === 'examiner' && (
            <>
              <div className="form-group">
                <label htmlFor="activeRegions">주요 활동 지역 * (쉼표로 구분)</label>
                <input
                  type="text"
                  id="activeRegions"
                  name="activeRegions"
                  onChange={(e) => handleArrayChange('activeRegions', e.target.value)}
                  required
                  placeholder="서울, 경기, 인천"
                />
              </div>

              <div className="form-group">
                <label htmlFor="specialties">전문분야 * (쉼표로 구분)</label>
                <input
                  type="text"
                  id="specialties"
                  name="specialties"
                  onChange={(e) => handleArrayChange('specialties', e.target.value)}
                  required
                  placeholder="IT, 제조업, 서비스업"
                />
              </div>

              <div className="form-group">
                <label htmlFor="website">홈페이지 주소</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}

          {/* 기업회원 전용 필드 */}
          {formData.role === 'company' && (
            <>
              <div className="form-group">
                <label htmlFor="businessNumber">사업자번호 *</label>
                <input
                  type="text"
                  id="businessNumber"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  required
                  placeholder="000-00-00000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyName">상호명 *</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  placeholder="회사명을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label htmlFor="region">지역 *</label>
                <select
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  required
                >
                  <option value="">지역 선택</option>
                  <option value="서울">서울</option>
                  <option value="경기">경기</option>
                  <option value="인천">인천</option>
                  <option value="부산">부산</option>
                  <option value="대구">대구</option>
                  <option value="광주">광주</option>
                  <option value="대전">대전</option>
                  <option value="울산">울산</option>
                  <option value="세종">세종</option>
                  <option value="강원">강원</option>
                  <option value="충북">충북</option>
                  <option value="충남">충남</option>
                  <option value="전북">전북</option>
                  <option value="전남">전남</option>
                  <option value="경북">경북</option>
                  <option value="경남">경남</option>
                  <option value="제주">제주</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="login-link">
          이미 계정이 있으신가요? 
          <Link to="/login"> 로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;