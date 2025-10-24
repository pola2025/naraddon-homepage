'use client';

import React, { useState } from 'react';
import styles from './TabSection.module.css';
import '@/styles/brand-custom.css';
import PolicyAnalysisTab from '@/components/examiner/brand/PolicyAnalysisTab';

interface TabSectionProps {
  examiner: any;
}

type TabType = 'company' | 'career' | 'successCase' | 'policyAnalysis' | 'info';

export default function TabSection({ examiner }: TabSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('company');

  const brandPage = examiner.brandPage || {};
  const hasCareers = brandPage.careers && brandPage.careers.length > 0;
  const hasSuccessCases = brandPage.successCases && brandPage.successCases.length > 0;
  const hasPolicyAnalysis = (examiner as any).policyAnalysisCount > 0;
  const hasInfoImage = brandPage.infoImage && brandPage.infoImage.trim() !== '';

  const tabs = [
    { id: 'company', label: '회사소개', enabled: true },
    { id: 'info', label: '정보', enabled: hasInfoImage },
    { id: 'career', label: '경력', enabled: hasCareers },
    { id: 'successCase', label: '성공 케이스', enabled: hasSuccessCases },
    { id: 'policyAnalysis', label: '정책분석', enabled: hasPolicyAnalysis },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyTab();
      case 'career':
        return renderCareerTab();
      case 'successCase':
        return renderSuccessCaseTab();
      case 'policyAnalysis':
        return renderPolicyAnalysisTab();
      case 'info':
        return renderInfoTab();
      default:
        return null;
    }
  };

  // 회사소개 탭
  const renderCompanyTab = () => {
    const useDefault = !brandPage.companyIntro || brandPage.useDefaultIntro;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
      e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
      <div className={styles.companySection}>
        {/* 로고 */}
        <div className={styles.logoContainer}>
          <div>
            {brandPage.companyLogo ? (
              <img src={brandPage.companyLogo} alt="회사 로고" className={styles.companyLogo} />
            ) : (
              <img src="/logo192.png" alt="나라똔 로고" className={styles.companyLogo} />
            )}
            <h3 className={styles.brandName}>
              {examiner.companyName || examiner.name}
            </h3>
          </div>
        </div>

        {/* 소개 텍스트 */}
        <div className={styles.aboutText}>
          {useDefault ? (
            // 기본 회사소개
            <div>
              <h3>나라똔 인증 기업심사관 소개</h3>
              <p>정부 지원사업 심사 대비를 돕는 경영컨설턴트입니다.</p>

              <div className={styles.aboutSection}>
                <h4><i className="fas fa-star"></i> 전문 영역</h4>
                <ul>
                  <li>정부 지원사업 신청 전 사전 상담 및 전략 수립</li>
                  <li>기업의 강점과 잠재력을 효과적으로 표현하는 사업계획서 작성</li>
                  <li>심사 기준 분석을 통한 맞춤형 대응 전략</li>
                  <li>PT 발표 및 질의응답 대비 실전 코칭</li>
                </ul>
              </div>

              <div className={styles.aboutSection}>
                <h4><i className="fas fa-bullseye"></i> 지원 목표</h4>
                <ul>
                  <li><strong>자금 마련 성공률 극대화</strong></li>
                  <li><strong>기업 경쟁력 향상을 위한 전략적 컨설팅</strong></li>
                  <li><strong>심사에서 회사의 모든 잠재력을 보여줄 수 있도록 지원</strong></li>
                </ul>
              </div>

              <div className={styles.visionBox} onMouseMove={handleMouseMove}>
                <strong>"나라똔 인증 기업심사관과 함께 성공적인 사업 기회를 만드세요"</strong>
              </div>
            </div>
          ) : (
            // 사용자 정의 회사소개
            <div dangerouslySetInnerHTML={{ __html: brandPage.companyIntro }} />
          )}
        </div>
      </div>
    );
  };

  // 경력 탭
  const renderCareerTab = () => {
    const careers = brandPage.careers || [];
    const timelineClass = careers.length >= 11 ? styles.veryManyItems :
                          careers.length >= 6 ? styles.manyItems : '';

    return (
      <div className={styles.careerSection}>
        <div className={styles.sectionHeader}>
          <h2>경력</h2>
          <p>창업 생태계에서의 다양한 경험과 전문성</p>
        </div>

        <div className={`${styles.careerTimeline} ${timelineClass}`}>
          {careers.map((career, index) => (
            <div key={index} className={styles.careerItem}>
              <span className={styles.careerPeriod}>{career.period}</span>
              <h3>{career.position}</h3>
              <p className={styles.careerCompany}>{career.company}</p>
              {career.description && <p>{career.description}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 성공 케이스 탭
  const renderSuccessCaseTab = () => {
    const successCases = brandPage.successCases || [];

    return (
      <div className={styles.successCaseSection}>
        <div className={styles.sectionHeader}>
          <h2>성공 케이스</h2>
          <p>실제 기업들과 함께한 성공 사례</p>
        </div>

        <div className={styles.testimonialsGrid}>
          {successCases.map((caseItem, index) => (
            <div key={index} className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={styles.clientName}>{caseItem.title}</div>
                {caseItem.client && <div className={styles.testimonialDate}>{caseItem.client}</div>}
              </div>
              <div className={styles.testimonialContent}>
                {caseItem.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 정책분석 탭
  const renderPolicyAnalysisTab = () => {
    return (
      <PolicyAnalysisTab
        examinerKey={examiner.legacyKey}
        examinerName={examiner.name}
      />
    );
  };

  // 정보 탭
  const renderInfoTab = () => {
    return (
      <div className={styles.infoSection}>
        <div className={styles.sectionHeader}>
          <h2>브랜드 정보</h2>
          <p>회사 및 서비스에 대한 상세 정보</p>
        </div>

        <div className={styles.infoImageWrapper}>
          {brandPage.infoImage && (
            <img
              src={brandPage.infoImage}
              alt="브랜드 정보"
              className={styles.infoImage}
              style={{ width: '100%', height: 'auto', borderRadius: '15px' }}
            />
          )}
        </div>
      </div>
    );
  };

  const tabBtnClass = (tabId: string) => {
    let classes = styles.tabBtn;
    if (activeTab === tabId) classes += ' ' + styles.active;
    const tab = tabs.find(t => t.id === tabId);
    if (tab && !tab.enabled) classes += ' ' + styles.disabled;
    return classes;
  };

  return (
    <section className={styles.tabSection}>
      <div className={styles.container}>
        <div className={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={tabBtnClass(tab.id)}
              onClick={() => tab.enabled && setActiveTab(tab.id as TabType)}
              disabled={!tab.enabled}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>
    </section>
  );
}
