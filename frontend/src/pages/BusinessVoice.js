import React, { useState } from 'react';
import './BusinessVoice.css';

const BusinessVoice = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // 임시 데이터 - 나중에 백엔드에서 가져올 예정
  const testimonials = [
    {
      id: 1,
      category: 'manufacturing',
      businessName: '(주)스마트제조',
      ceo: '김대표',
      title: '스마트공장 지원금으로 생산성 200% 향상',
      content: '나라똔을 통해 스마트공장 지원금을 신청하고, 전문가의 도움을 받아 생산 라인을 자동화했습니다. 덕분에 생산성이 크게 향상되었고, 인건비도 절감할 수 있었습니다.',
      date: '2024-03-15',
      supportAmount: '5,000만원',
      supportType: '스마트공장 구축 지원사업'
    },
    {
      id: 2,
      category: 'startup',
      businessName: '테크스타트업',
      ceo: '이대표',
      title: '창업 지원금으로 성공적인 사업 시작',
      content: '창업 초기 자금이 부족했는데, 나라똔 전문가의 컨설팅을 통해 청년창업 지원금을 받을 수 있었습니다. 체계적인 사업계획서 작성부터 면접 준비까지 도움을 받았습니다.',
      date: '2024-02-28',
      supportAmount: '3,000만원',
      supportType: '청년창업사관학교'
    },
    {
      id: 3,
      category: 'retail',
      businessName: '동네마트',
      ceo: '박대표',
      title: '소상공인 지원으로 위기 극복',
      content: '코로나19로 매출이 급감했을 때 나라똔을 통해 소상공인 특별지원금을 신청했습니다. 빠른 심사와 지원으로 위기를 극복할 수 있었습니다.',
      date: '2024-01-20',
      supportAmount: '1,000만원',
      supportType: '소상공인 특별지원'
    },
    {
      id: 4,
      category: 'tech',
      businessName: 'AI솔루션즈',
      ceo: '최대표',
      title: 'R&D 지원금으로 기술 개발 성공',
      content: '나라똔 전문가의 도움으로 R&D 지원사업에 선정되었습니다. 기술개발 자금을 확보하여 특허 3건을 출원하고 신제품을 출시할 수 있었습니다.',
      date: '2024-03-01',
      supportAmount: '1억원',
      supportType: 'R&D 바우처 지원사업'
    }
  ];

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'manufacturing', label: '제조업' },
    { value: 'startup', label: '스타트업' },
    { value: 'retail', label: '소매/유통' },
    { value: 'tech', label: 'IT/기술' }
  ];

  const filteredTestimonials = selectedCategory === 'all' 
    ? testimonials 
    : testimonials.filter(item => item.category === selectedCategory);

  return (
    <div className="business-voice-container">
      {/* 히어로 섹션 */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>사업자 목소리</h1>
          <p>나라똔과 함께 성장한 기업들의 생생한 이야기</p>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>2,500+</h3>
            <p>지원받은 기업 수</p>
          </div>
          <div className="stat-item">
            <h3>850억원</h3>
            <p>누적 지원금액</p>
          </div>
          <div className="stat-item">
            <h3>95%</h3>
            <p>고객 만족도</p>
          </div>
          <div className="stat-item">
            <h3>3.5일</h3>
            <p>평균 처리 기간</p>
          </div>
        </div>
      </section>

      {/* 카테고리 필터 */}
      <section className="filter-section">
        <div className="filter-buttons">
          {categories.map(cat => (
            <button
              key={cat.value}
              className={`filter-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 사례 목록 */}
      <section className="testimonials-section">
        <div className="testimonials-grid">
          {filteredTestimonials.map(item => (
            <div key={item.id} className="testimonial-card">
              <div className="card-header">
                <div className="business-info">
                  <h3>{item.businessName}</h3>
                  <span className="ceo-name">{item.ceo}</span>
                </div>
                <span className="support-amount">{item.supportAmount}</span>
              </div>
              
              <h4 className="testimonial-title">{item.title}</h4>
              <p className="testimonial-content">{item.content}</p>
              
              <div className="card-footer">
                <span className="support-type">
                  <i className="fas fa-tag"></i> {item.supportType}
                </span>
                <span className="date">
                  <i className="fas fa-calendar"></i> {item.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>귀사도 정부지원금의 혜택을 받아보세요</h2>
          <p>나라똔 전문가가 맞춤형 지원사업을 찾아드립니다</p>
          <button className="cta-button">무료 상담 신청하기</button>
        </div>
      </section>
    </div>
  );
};

export default BusinessVoice;