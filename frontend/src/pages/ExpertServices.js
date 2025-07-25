import React from 'react';
import './ExpertServices.css';

const ExpertServices = () => {
  const services = [
    {
      title: '정부지원금 컨설팅',
      description: '기업 맞춤형 정부지원금 발굴 및 신청 대행',
      icon: 'fa-coins',
      features: ['지원금 발굴', '신청서 작성', '사후관리']
    },
    {
      title: 'R&D 과제 기획',
      description: 'R&D 정부과제 기획 및 사업계획서 작성',
      icon: 'fa-flask',
      features: ['과제 기획', '제안서 작성', '평가 대응']
    },
    {
      title: '경영인증 취득',
      description: '각종 경영인증 취득 컨설팅 및 대행',
      icon: 'fa-certificate',
      features: ['인증 진단', '서류 준비', '심사 대응']
    },
    {
      title: '세무·회계 자문',
      description: '정부지원금 관련 세무·회계 전문 자문',
      icon: 'fa-calculator',
      features: ['세무 자문', '회계 처리', '정산 지원']
    },
    {
      title: '법무 지원',
      description: '정부지원사업 관련 법률 자문 및 계약 지원',
      icon: 'fa-gavel',
      features: ['계약 검토', '법률 자문', '분쟁 해결']
    },
    {
      title: '사업화 전략',
      description: '정부지원사업 연계 사업화 전략 수립',
      icon: 'fa-rocket',
      features: ['시장 분석', '전략 수립', '성과 관리']
    }
  ];

  return (
    <div className="expert-services-page">
      <div className="page-header">
        <h1>전문가 서비스</h1>
        <p>정부지원금 전문가들이 제공하는 맞춤형 서비스</p>
      </div>
      
      <div className="services-container">
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">
                <i className={`fas ${service.icon}`}></i>
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul className="service-features">
                {service.features.map((feature, idx) => (
                  <li key={idx}>
                    <i className="fas fa-check"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="/consultation-request" className="service-button">
                상담 신청
              </a>
            </div>
          ))}
        </div>
        
        <div className="service-process">
          <h2>서비스 진행 프로세스</h2>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">01</div>
              <h4>무료 상담</h4>
              <p>기업 현황 분석 및 니즈 파악</p>
            </div>
            <div className="process-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
            <div className="process-step">
              <div className="step-number">02</div>
              <h4>전문가 매칭</h4>
              <p>최적의 전문가 선정 및 매칭</p>
            </div>
            <div className="process-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
            <div className="process-step">
              <div className="step-number">03</div>
              <h4>서비스 제공</h4>
              <p>맞춤형 컨설팅 서비스 제공</p>
            </div>
            <div className="process-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
            <div className="process-step">
              <div className="step-number">04</div>
              <h4>사후 관리</h4>
              <p>지속적인 모니터링 및 지원</p>
            </div>
          </div>
        </div>
        
        <div className="service-cta">
          <h2>전문가와 함께 성공적인 정부지원금을 확보하세요</h2>
          <p>나라똔이 검증한 전문가들이 여러분의 성공을 돕겠습니다.</p>
          <a href="/consultation-request" className="cta-button primary">
            <i className="fas fa-comments"></i>
            무료 상담 신청
          </a>
        </div>
      </div>
    </div>
  );
};

export default ExpertServices;
