'use client';

import React, { useState } from 'react';
import styles from './TabSection.module.css';
import '@/styles/brand-custom.css';

interface TabSectionProps {
  examiner: any;
}

type TabType = 'info' | 'company';

export default function TabSection({ examiner }: TabSectionProps) {
  const brandPage = examiner.brandPage || {};
  const hasInfoImage = brandPage.infoImage && brandPage.infoImage.trim() !== '';

  // 기본 탭: 정보 이미지가 있으면 '정보', 없으면 '회사소개'
  const [activeTab, setActiveTab] = useState<TabType>(hasInfoImage ? 'info' : 'company');

  const tabs = [
    { id: 'info', label: '정보', enabled: hasInfoImage },
    { id: 'company', label: '회사소개', enabled: true },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfoTab();
      case 'company':
        return renderCompanyTab();
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
            // 기본 회사소개 (전문 영역, 지원 목표 삭제)
            <div>
              <h3>나라똔 인증 기업심사관 소개</h3>
              <p>정부 지원사업 심사 대비를 돕는 경영컨설턴트입니다.</p>

              <div className={styles.visionBox} onMouseMove={handleMouseMove}>
                <strong>"나라똔 인증 기업심사관과 함께 성공적인 사업 기회를 만드세요"</strong>
              </div>
            </div>
          ) : (
            // 사용자 정의 회사소개
            <div
              className={styles.customIntro}
              dangerouslySetInnerHTML={{
                __html: brandPage.companyIntro.replace(/\n/g, '<br>')
              }}
            />
          )}
        </div>
      </div>
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
