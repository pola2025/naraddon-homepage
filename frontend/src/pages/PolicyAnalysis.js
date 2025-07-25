import React from 'react';
import './PolicyAnalysis.css';

const PolicyAnalysis = () => {
  return (
    <div className="policy-analysis-page">
      <div className="page-header">
        <h1>정책분석</h1>
        <p>정부지원금 및 정책 동향 분석 서비스</p>
      </div>
      
      <div className="policy-container">
        <div className="policy-grid">
          <div className="policy-card">
            <div className="policy-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>정책 트렌드 분석</h3>
            <p>최신 정부지원금 정책 동향과 변화를 실시간으로 분석하여 제공합니다.</p>
            <a href="#trend" className="policy-link">자세히 보기 →</a>
          </div>
          
          <div className="policy-card">
            <div className="policy-icon">
              <i className="fas fa-search-dollar"></i>
            </div>
            <h3>맞춤형 정책 추천</h3>
            <p>기업 특성에 맞는 최적의 정부지원금 정책을 AI가 추천해드립니다.</p>
            <a href="#recommend" className="policy-link">자세히 보기 →</a>
          </div>
          
          <div className="policy-card">
            <div className="policy-icon">
              <i className="fas fa-bell"></i>
            </div>
            <h3>정책 변경 알림</h3>
            <p>관심 분야의 정책 변경사항을 실시간으로 알려드립니다.</p>
            <a href="#alert" className="policy-link">자세히 보기 →</a>
          </div>
          
          <div className="policy-card">
            <div className="policy-icon">
              <i className="fas fa-file-alt"></i>
            </div>
            <h3>정책 보고서</h3>
            <p>분야별 정책 분석 보고서와 성공 사례를 제공합니다.</p>
            <a href="#report" className="policy-link">자세히 보기 →</a>
          </div>
        </div>
        
        <div className="policy-cta">
          <h2>정책분석 서비스를 시작하세요</h2>
          <p>전문가의 정책 분석으로 최적의 정부지원금을 찾아드립니다.</p>
          <a href="/consultation-request" className="cta-button">무료 상담 신청</a>
        </div>
      </div>
    </div>
  );
};

export default PolicyAnalysis;
