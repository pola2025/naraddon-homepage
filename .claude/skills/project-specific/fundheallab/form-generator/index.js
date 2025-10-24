/**
 * Form Generator Skill
 * @purpose 기업심사관 홈페이지 입력폼 생성 및 브랜드 정보 적용
 * @context 브랜드별 입력폼 생성 시 좌측 브랜드 정보만 업데이트, 입력 필드와 코드 구조 유지
 */

module.exports = {
  name: 'form-generator',
  version: '1.0.0',
  description: '브랜드 정보 기반 입력폼 생성 및 업데이트',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {object} context.brandInfo - 브랜드 정보
   * @param {string} context.pageType - 페이지 유형 (main, fund, pro, mkt 등)
   * @param {string} context.sectionId - 섹션 ID (사용자 제공)
   * @param {string} context.templatePath - 템플릿 경로 (선택사항)
   */
  async run(context) {
    console.log('📝 [form-generator] 입력폼 생성 시작...\n');

    const brandInfo = context.brandInfo || {};
    const pageType = context.pageType || 'main';
    const sectionId = context.sectionId || 's20251017bcddee2e53649';

    // 필수 정보 확인
    const missingFields = [];
    if (!brandInfo.brandName) missingFields.push('brandName');
    if (!brandInfo.phone) missingFields.push('phone');
    if (!brandInfo.primaryColor) missingFields.push('primaryColor');
    if (!brandInfo.accentColor) missingFields.push('accentColor');

    if (missingFields.length > 0) {
      return {
        success: false,
        error: '필수 브랜드 정보가 누락되었습니다',
        missingFields,
      };
    }

    try {
      // 페이지 유형별 폼 생성
      let formHtml;
      if (pageType === 'mkt') {
        // mkt 폼은 브랜드 정보만 업데이트 (컬러 변경 금지)
        formHtml = this.generateMktForm(brandInfo, sectionId);
      } else {
        // 일반 폼 (main, fund, pro 등)
        formHtml = this.generateMainForm(brandInfo, sectionId, pageType);
      }

      console.log(`✅ ${pageType} 입력폼 생성 완료\n`);
      console.log(`  - 브랜드명: ${brandInfo.brandName}`);
      console.log(`  - 전화번호: ${brandInfo.phone}`);
      console.log(`  - 섹션 ID: ${sectionId}`);
      console.log(`  - Primary 컬러: ${brandInfo.primaryColor}`);
      console.log(`  - Accent 컬러: ${brandInfo.accentColor}\n`);

      return {
        success: true,
        formHtml,
        pageType,
        sectionId,
        brandInfo,
        rules: this.getFormRules(pageType),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Main 폼 생성 (브랜드 정보 + 컬러 업데이트)
   */
  generateMainForm(brandInfo, sectionId, pageType) {
    const { brandName, phone, primaryColor, accentColor, logo, slogan } = brandInfo;

    // Gradient 계산
    const gradientDark = this.calculateGradientDark(primaryColor, accentColor);
    const gradientLight = this.calculateGradientLight(primaryColor, accentColor);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandName} - 정책자금 무료상담 신청</title>
    <style>
/* 폰트 설정 */
#${sectionId} {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif !important;
}

/* ${brandName} 색상 변수 정의 */
:root {
    --frost-main-blue: ${primaryColor};
    --frost-neon-blue: ${accentColor};
    --frost-dark-bg: ${primaryColor};
    --frost-dark-glass: rgba(${this.hexToRgb(accentColor)}, 0.2);
    --frost-white: #ffffff;
    --frost-border: rgba(${this.hexToRgb(accentColor)}, 0.3);
}

/* 섹션 배경 */
#${sectionId} {
    background: var(--frost-dark-bg) !important;
    padding: 80px 0 !important;
    position: relative !important;
    width: 100vw !important;
    margin-left: calc(-50vw + 50%) !important;
}

#${sectionId} .section-container {
    max-width: 1200px !important;
    margin: 0 auto !important;
    padding: 0 20px !important;
}

/* 폼 래퍼 */
#${sectionId} .form-wrapper {
    display: grid !important;
    grid-template-columns: 1fr 1.5fr !important;
    gap: 60px !important;
    align-items: start !important;
}

/* 좌측 정보 영역 - 브랜드 정보 */
#${sectionId} .form-info {
    position: sticky !important;
    top: 100px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
}

#${sectionId} .info-content {
    width: 100% !important;
    max-width: 350px !important;
    text-align: left !important;
    padding-left: 28px !important;
}

#${sectionId} .info-badge {
    display: inline-block !important;
    background: ${gradientLight} !important;
    color: white !important;
    padding: 6px 16px !important;
    border-radius: 20px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    margin-bottom: 20px !important;
    box-shadow: 0 4px 16px rgba(${this.hexToRgb(primaryColor)}, 0.4) !important;
}

#${sectionId} .info-title {
    font-size: 36px !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    line-height: 1.2 !important;
    margin-bottom: 16px !important;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

#${sectionId} .info-title .gradient-text {
    color: #ffffff !important;
    font-weight: 800 !important;
    text-shadow: 0 2px 8px rgba(255, 255, 255, 0.3) !important;
}

#${sectionId} .info-desc {
    font-size: 18px !important;
    color: rgba(255, 255, 255, 0.95) !important;
    line-height: 1.6 !important;
    margin-bottom: 40px !important;
}

/* 혜택 리스트 */
#${sectionId} .benefit-list {
    list-style: none !important;
    padding: 0 !important;
    margin: 0 0 40px 0 !important;
}

#${sectionId} .benefit-item {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 12px 0 !important;
}

#${sectionId} .benefit-icon {
    width: 24px !important;
    height: 24px !important;
    background: linear-gradient(135deg, rgba(${this.hexToRgb(accentColor)}, 0.2), rgba(${this.hexToRgb(accentColor)}, 0.2)) !important;
    border: 2px solid rgba(${this.hexToRgb(accentColor)}, 0.4) !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
}

#${sectionId} .benefit-icon svg {
    width: 14px !important;
    height: 14px !important;
    fill: ${accentColor} !important;
    filter: drop-shadow(0 0 4px rgba(${this.hexToRgb(accentColor)}, 0.6)) !important;
}

#${sectionId} .benefit-text {
    font-size: 16px !important;
    color: rgba(255, 255, 255, 0.95) !important;
    font-weight: 600 !important;
}

/* 연락처 정보 - 브랜드 그라디언트 */
#${sectionId} .contact-info {
    background: ${gradientDark} !important;
    border-radius: 12px !important;
    padding: 24px !important;
    text-align: center !important;
    width: 100% !important;
    box-shadow: 0 8px 24px rgba(${this.hexToRgb(accentColor)}, 0.4), 0 0 40px rgba(${this.hexToRgb(accentColor)}, 0.2) !important;
}

#${sectionId} .contact-title {
    font-size: 20px !important;
    font-weight: 700 !important;
    color: white !important;
    margin-bottom: 16px !important;
}

#${sectionId} .contact-item {
    display: inline-flex !important;
    align-items: center !important;
    gap: 12px !important;
    margin-bottom: 12px !important;
    justify-content: center !important;
}

#${sectionId} .contact-item:last-child {
    margin-bottom: 0 !important;
}

#${sectionId} .contact-icon {
    width: 20px !important;
    height: 20px !important;
    fill: white !important;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5)) !important;
}

#${sectionId} .contact-text {
    font-size: 16px !important;
    color: white !important;
}

#${sectionId} .contact-text strong {
    color: white !important;
    font-weight: 700 !important;
    font-size: 18px !important;
}

/* 우측 폼 영역 - 밝은 글래스모피즘 */
#${sectionId} .form-area {
    background: rgba(255, 255, 255, 0.85) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 2px solid rgba(${this.hexToRgb(accentColor)}, 0.3) !important;
    border-radius: 16px !important;
    padding: 40px !important;
    box-shadow: 0 8px 32px rgba(${this.hexToRgb(accentColor)}, 0.2), 0 0 60px rgba(${this.hexToRgb(accentColor)}, 0.15) !important;
    position: relative !important;
}

#${sectionId} .form-area::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(${this.hexToRgb(accentColor)}, 0.6), transparent);
    animation: pulse-line 3s ease infinite;
}

@keyframes pulse-line {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
}

#${sectionId} .form-control:focus {
    outline: none !important;
    border-color: ${accentColor} !important;
    box-shadow: 0 0 0 3px rgba(${this.hexToRgb(accentColor)}, 0.1) !important;
    background: rgba(255, 255, 255, 1) !important;
}

#${sectionId} .fund-type-option input[type="checkbox"]:checked + label {
    background: linear-gradient(135deg, rgba(${this.hexToRgb(accentColor)}, 0.1), rgba(${this.hexToRgb(accentColor)}, 0.15)) !important;
    border-color: ${accentColor} !important;
    color: ${accentColor} !important;
    font-weight: 600 !important;
}

#${sectionId} .privacy-detail-link {
    color: ${accentColor} !important;
    text-decoration: underline !important;
    cursor: pointer !important;
    font-size: 13px !important;
    margin-left: 4px !important;
}

/* 제출 버튼 - 브랜드 그라디언트 */
#${sectionId} .submit-button {
    background: ${gradientDark} !important;
    color: white !important;
    padding: 16px 48px !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 18px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    position: relative !important;
    overflow: hidden !important;
    box-shadow: 0 8px 24px rgba(${this.hexToRgb(accentColor)}, 0.3), 0 0 40px rgba(${this.hexToRgb(accentColor)}, 0.2) !important;
}

#${sectionId} .submit-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 12px 32px rgba(${this.hexToRgb(accentColor)}, 0.5), 0 0 60px rgba(${this.hexToRgb(accentColor)}, 0.3) !important;
}

/* 기존 스타일 유지 - 입력 필드 및 레이아웃 */
${this.getCommonFormStyles(sectionId)}

/* 모바일 반응형 */
${this.getMobileStyles(sectionId)}
    </style>
</head>
<body>
<div id="${sectionId}">
<div class="section-container">
    <div class="form-wrapper">
        <!-- 좌측 정보 영역 - ${brandName} 브랜드 -->
        <div class="form-info">
            <div class="info-content">
                <span class="info-badge">정책자금 경영컨설팅</span>
                <h2 class="info-title">
                    자금 조달의 든든한<br>
                    <span class="gradient-text">무료 상담</span>
                </h2>
                <p class="info-desc">
                    ${brandName}의 체계적인 진단으로<br>
                    정책자금 심사 통과율을<br> 96%까지 끌어올립니다
                </p>

                <ul class="benefit-list">
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">심사 통과율 96% 달성</span>
                    </li>
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">평균 2.8억원 자금 확보</span>
                    </li>
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">정책자금 맞춤 상담</span>
                    </li>
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">초상담 무료</span>
                    </li>
                </ul>

                <div class="contact-info">
                    <h3 class="contact-title">${brandName} 상담센터</h3>
                    <div class="contact-item">
                        <svg class="contact-icon" viewBox="0 0 24 24">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        <span class="contact-text">대표전화: <strong>${phone}</strong></span>
                    </div>
                    <div class="contact-item">
                        <svg class="contact-icon" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <span class="contact-text">상담시간: 평일 09:00 ~ 18:00</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 우측 폼 영역 - 입력 필드 유지 -->
        ${this.getFormFields(sectionId, pageType)}
    </div>
</div>
</div>

<script>
// Google Apps Script 웹앱 URL - ${brandName}
const WEBAPP_URL = '${brandInfo.webhookUrl || 'https://script.google.com/macros/s/YOUR_WEBHOOK_URL/exec'}';

${this.getFormScript()}
</script>
</body>
</html>`;
  },

  /**
   * mkt 폼 생성 (브랜드 정보만 업데이트, 컬러 변경 금지)
   */
  generateMktForm(brandInfo, sectionId) {
    const { brandName, phone } = brandInfo;

    // mkt 폼은 기존 컬러 유지 (#0f172e, #d4af37)
    const PRIMARY_COLOR = '#0f172e';
    const ACCENT_COLOR = '#d4af37';

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandName} - 정책자금 무료상담 신청</title>
    <style>
/* ⚠️ mkt 폼 특별 규칙: 브랜드명/전화번호만 수정, 컬러 변경 금지 */

/* 기존 컬러 유지 */
:root {
    --frost-main-blue: ${PRIMARY_COLOR};
    --frost-neon-blue: ${ACCENT_COLOR};
    --frost-dark-bg: ${PRIMARY_COLOR};
    --frost-dark-glass: rgba(212, 175, 55, 0.2);
    --frost-white: #ffffff;
    --frost-border: rgba(212, 175, 55, 0.3);
}

/* 기존 스타일 그대로 유지 */
${this.getCommonFormStyles(sectionId)}
${this.getMobileStyles(sectionId)}
    </style>
</head>
<body>
<div id="${sectionId}">
<div class="section-container">
    <div class="form-wrapper">
        <!-- 좌측 정보 영역 - 브랜드 정보만 업데이트 -->
        <div class="form-info">
            <div class="info-content">
                <span class="info-badge">정책자금 경영컨설팅</span>
                <h2 class="info-title">
                    자금 조달의 든든한<br>
                    <span class="gradient-text">무료 상담</span>
                </h2>
                <p class="info-desc">
                    ${brandName}의 체계적인 진단으로<br>
                    정책자금 심사 통과율을<br> 96%까지 끌어올립니다
                </p>

                <ul class="benefit-list">
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">심사 통과율 96% 달성</span>
                    </li>
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">평균 2.8억원 자금 확보</span>
                    </li>
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">정책자금 맞춤 상담</span>
                    </li>
                    <li class="benefit-item">
                        <div class="benefit-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                        </div>
                        <span class="benefit-text">초상담 무료</span>
                    </li>
                </ul>

                <div class="contact-info">
                    <h3 class="contact-title">${brandName} 상담센터</h3>
                    <div class="contact-item">
                        <svg class="contact-icon" viewBox="0 0 24 24">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        <span class="contact-text">대표전화: <strong>${phone}</strong></span>
                    </div>
                    <div class="contact-item">
                        <svg class="contact-icon" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        <span class="contact-text">상담시간: 평일 09:00 ~ 18:00</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 우측 폼 영역 - 입력 필드 유지 -->
        ${this.getFormFields(sectionId, 'mkt')}
    </div>
</div>
</div>

<script>
// Google Apps Script 웹앱 URL - ${brandName}
const WEBAPP_URL = '${brandInfo.webhookUrl || 'https://script.google.com/macros/s/YOUR_WEBHOOK_URL/exec'}';

${this.getFormScript()}
</script>
</body>
</html>`;
  },

  /**
   * 공통 폼 스타일 (입력 필드 레이아웃)
   */
  getCommonFormStyles(sectionId) {
    return `
/* 폼 헤더 */
#${sectionId} .form-header {
    text-align: center !important;
    margin-bottom: 40px !important;
}

#${sectionId} .form-title {
    font-size: 24px !important;
    font-weight: 700 !important;
    color: #1e293b !important;
    margin-bottom: 8px !important;
}

#${sectionId} .form-subtitle {
    font-size: 16px !important;
    color: #64748b !important;
}

/* 폼 그룹 */
#${sectionId} .form-row {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 20px !important;
    margin-bottom: 16px !important;
}

#${sectionId} .form-row.four-columns {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 16px !important;
}

#${sectionId} .form-row.full {
    grid-template-columns: 1fr !important;
    margin-bottom: 12px !important;
}

#${sectionId} .form-group {
    margin-bottom: 0 !important;
}

#${sectionId} .form-label {
    display: block !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #1e293b !important;
    margin-bottom: 8px !important;
}

#${sectionId} .required {
    color: #ef4444 !important;
}

#${sectionId} .form-control {
    width: 100% !important;
    padding: 12px 16px !important;
    font-size: 15px !important;
    line-height: 1.5 !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    background: rgba(255, 255, 255, 0.9) !important;
    transition: all 0.3s ease !important;
    box-sizing: border-box !important;
    height: 46px !important;
}

#${sectionId} select.form-control {
    cursor: pointer !important;
    appearance: none !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg>") !important;
    background-repeat: no-repeat !important;
    background-position: right 12px center !important;
    background-size: 20px !important;
    padding-right: 40px !important;
}

#${sectionId} textarea.form-control {
    min-height: 60px !important;
    height: 60px !important;
    resize: vertical !important;
}

/* 자금 종류 선택 */
#${sectionId} .fund-type-group {
    margin-bottom: 16px !important;
}

#${sectionId} .fund-type-label {
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #1e293b !important;
    margin-bottom: 12px !important;
    display: block !important;
}

#${sectionId} .fund-type-options {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
}

#${sectionId} .fund-type-option {
    position: relative !important;
}

#${sectionId} .fund-type-option input[type="checkbox"] {
    position: absolute !important;
    opacity: 0 !important;
}

#${sectionId} .fund-type-option label {
    display: block !important;
    padding: 12px 16px !important;
    background: rgba(248, 250, 252, 0.9) !important;
    border: 2px solid #e2e8f0 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    text-align: center !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    color: #1e293b !important;
}

/* 개인정보 동의 */
#${sectionId} .privacy-section {
    margin: 20px 0 !important;
    padding: 16px !important;
    background: rgba(248, 250, 252, 0.8) !important;
    border-radius: 8px !important;
}

#${sectionId} .privacy-title {
    font-size: 16px !important;
    font-weight: 600 !important;
    color: #1e293b !important;
    margin-bottom: 12px !important;
}

#${sectionId} .privacy-content {
    font-size: 13px !important;
    color: #64748b !important;
    line-height: 1.6 !important;
    margin-bottom: 16px !important;
    max-height: 150px !important;
    overflow-y: auto !important;
    padding: 12px !important;
    background: rgba(255, 255, 255, 0.9) !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 4px !important;
    display: none !important;
}

#${sectionId} .privacy-content.show {
    display: block !important;
}

#${sectionId} .privacy-checkbox {
    display: flex !important;
    align-items: flex-start !important;
    gap: 8px !important;
}

#${sectionId} .privacy-checkbox input[type="checkbox"] {
    width: 18px !important;
    height: 18px !important;
    cursor: pointer !important;
    margin-top: 2px !important;
    flex-shrink: 0 !important;
}

#${sectionId} .privacy-checkbox label {
    font-size: 14px !important;
    color: #1e293b !important;
    cursor: pointer !important;
    line-height: 1.4 !important;
}

/* 제출 버튼 섹션 */
#${sectionId} .submit-section {
    text-align: center !important;
}

#${sectionId} .submit-button::before {
    content: '' !important;
    position: absolute !important;
    top: 0 !important;
    left: -100% !important;
    width: 100% !important;
    height: 100% !important;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%) !important;
    transition: left 0.5s ease !important;
}

#${sectionId} .submit-button:hover::before {
    left: 100% !important;
}

#${sectionId} .submit-button:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
}

#${sectionId} .submit-note {
    font-size: 13px !important;
    color: #64748b !important;
    margin-top: 12px !important;
}

/* 성공/실패 메시지 */
#${sectionId} .message-box {
    display: none;
    padding: 15px;
    border-radius: 8px;
    margin-top: 20px;
    text-align: center;
}

#${sectionId} .message-box.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

#${sectionId} .message-box.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

#${sectionId} .message-box.active {
    display: block;
}
`;
  },

  /**
   * 모바일 반응형 스타일
   */
  getMobileStyles(sectionId) {
    return `
@media (max-width: 968px) {
    #${sectionId} .form-wrapper {
        grid-template-columns: 1fr !important;
        gap: 40px !important;
    }

    #${sectionId} .form-info {
        position: static !important;
        align-items: center !important;
    }

    #${sectionId} .info-content {
        max-width: 100% !important;
        text-align: center !important;
    }

    #${sectionId} .benefit-item {
        justify-content: center !important;
    }

    #${sectionId} .form-row.four-columns {
        grid-template-columns: 1fr 1fr !important;
    }
}

@media (max-width: 768px) {
    #${sectionId} {
        padding: 40px 0 !important;
    }

    #${sectionId} .info-title {
        font-size: 28px !important;
    }

    #${sectionId} .form-area {
        padding: 20px 16px !important;
    }

    #${sectionId} .submit-button {
        width: 100% !important;
        padding: 12px 24px !important;
        font-size: 15px !important;
    }
}

@media (max-width: 480px) {
    #${sectionId} .info-title {
        font-size: 24px !important;
    }

    #${sectionId} .form-row:nth-child(3),
    #${sectionId} .form-row:nth-child(4) {
        grid-template-columns: 1fr !important;
    }
}
`;
  },

  /**
   * 폼 입력 필드 HTML
   */
  getFormFields(sectionId, pageType) {
    return `<div class="form-area">
            <div class="form-header">
                <h3 class="form-title">정책자금 무료 상담 신청</h3>
                <p class="form-subtitle">정보 입력 후 전문가 맞춤 상담을 받아보세요</p>
            </div>

            <form id="consultForm" onsubmit="handleSubmit(event)">
                <!-- 기본 정보 - 4열 -->
                <div class="form-row four-columns">
                    <div class="form-group">
                        <label class="form-label">기업명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="company" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">사업자번호 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="bizno" placeholder="000-00-00000" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">대표자명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">직위</label>
                        <input type="text" class="form-control" name="position" placeholder="대표이사">
                    </div>
                </div>

                <!-- 연락 정보 - 4열 -->
                <div class="form-row four-columns">
                    <div class="form-group">
                        <label class="form-label">연락처 <span class="required">*</span></label>
                        <input type="tel" class="form-control" name="phone" placeholder="010-0000-0000" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">이메일 <span class="required">*</span></label>
                        <input type="email" class="form-control" name="email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">업종</label>
                        <select class="form-control" name="industry">
                            <option value="">선택하세요</option>
                            <option value="제조업">제조업</option>
                            <option value="도소매업">도소매업</option>
                            <option value="서비스업">서비스업</option>
                            <option value="건설업">건설업</option>
                            <option value="IT/소프트웨어">IT/소프트웨어</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">설립연도</label>
                        <input type="text" class="form-control" name="founded" placeholder="2020">
                    </div>
                </div>

                <!-- 통화가능시간 -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">통화 가능 시간 <span class="required">*</span></label>
                        <select class="form-control" name="consultTime" required>
                            <option value="">선택하세요</option>
                            <option value="09:00-10:00">오전 09:00 - 10:00</option>
                            <option value="10:00-11:00">오전 10:00 - 11:00</option>
                            <option value="11:00-12:00">오전 11:00 - 12:00</option>
                            <option value="14:00-15:00">오후 14:00 - 15:00</option>
                            <option value="15:00-16:00">오후 15:00 - 16:00</option>
                            <option value="16:00-17:00">오후 16:00 - 17:00</option>
                            <option value="17:00-18:00">오후 17:00 - 18:00</option>
                            <option value="18:00-19:00">오후 18:00 - 19:00</option>
                            <option value="언제나가능">언제나 가능</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">필요 자금 규모</label>
                        <select class="form-control" name="amount">
                            <option value="">선택하세요</option>
                            <option value="5천만원 이하">5천만원 이하</option>
                            <option value="5천만원~1억원">5천만원 ~ 1억원</option>
                            <option value="1억원~3억원">1억원 ~ 3억원</option>
                            <option value="3억원~5억원">3억원 ~ 5억원</option>
                            <option value="5억원~10억원">5억원 ~ 10억원</option>
                            <option value="10억원 이상">10억원 이상</option>
                        </select>
                    </div>
                </div>

                <!-- 자금 종류 선택 -->
                <div class="fund-type-group">
                    <label class="fund-type-label">지원받고 싶은 자금 종류 (복수 선택 가능)</label>
                    <div class="fund-type-options">
                        <div class="fund-type-option">
                            <input type="checkbox" id="fund1" name="fundType" value="창업자금">
                            <label for="fund1">창업자금</label>
                        </div>
                        <div class="fund-type-option">
                            <input type="checkbox" id="fund2" name="fundType" value="운전자금">
                            <label for="fund2">운전자금</label>
                        </div>
                        <div class="fund-type-option">
                            <input type="checkbox" id="fund3" name="fundType" value="시설자금">
                            <label for="fund3">시설자금</label>
                        </div>
                        <div class="fund-type-option">
                            <input type="checkbox" id="fund4" name="fundType" value="기타자금">
                            <label for="fund4">기타자금</label>
                        </div>
                    </div>
                </div>

                <!-- 상담 내용 -->
                <div class="form-row full">
                    <div class="form-group">
                        <label class="form-label">문의사항</label>
                        <textarea class="form-control" name="message"
                                  placeholder="필요하신 자금의 용도나 현재 경영 상황 등을 간략히 적어주세요"></textarea>
                    </div>
                </div>

                <!-- 개인정보 동의 -->
                <div class="privacy-section">
                    <h4 class="privacy-title">개인정보 수집·이용 동의</h4>
                    <div class="privacy-checkbox">
                        <input type="checkbox" id="privacy" name="privacy" required>
                        <label for="privacy">개인정보 수집·이용에 동의합니다 <span class="required">*</span>
                        <span class="privacy-detail-link" onclick="togglePrivacyDetail()">내용보기</span></label>
                    </div>
                    <div class="privacy-content" id="privacyContent">
                        <p>1. 수집항목: 기업명, 사업자번호, 대표자명, 연락처, 이메일, 문의내용</p>
                        <p>2. 수집목적: 정책자금 상담 및 지원 서비스 제공</p>
                        <p>3. 보유기간: 서비스 종료 후 3년</p>
                        <p>4. 동의 거부 시 서비스 이용이 제한될 수 있습니다.</p>
                    </div>
                </div>

                <!-- 메시지 박스 -->
                <div class="message-box success" id="successMessage">
                    ✅ 컨설팅 신청이 성공적으로 완료되었습니다!
                </div>

                <div class="message-box error" id="errorMessage">
                    ❌ 신청 처리 중 문제가 발생했습니다. 다시 시도해주세요.
                </div>

                <!-- 제출 버튼 -->
                <div class="submit-section">
                    <button type="submit" class="submit-button" id="submitButton">무료 상담 신청하기</button>
                    <p class="submit-note">신청 후 전문가가 24시간 내 연락드립니다</p>
                </div>
            </form>
        </div>`;
  },

  /**
   * 폼 JavaScript
   */
  getFormScript() {
    return `async function handleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const fundTypes = document.querySelectorAll('input[name="fundType"]:checked');
    if (fundTypes.length === 0) {
        alert('지원받고 싶은 자금 종류를 하나 이상 선택해주세요.');
        return;
    }

    const submitButton = document.getElementById('submitButton');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    submitButton.disabled = true;
    submitButton.textContent = '신청 중...';
    successMessage.classList.remove('active');
    errorMessage.classList.remove('active');

    const formData = {
        company: form.company.value,
        bizno: form.bizno.value,
        name: form.name.value,
        position: form.position.value || '',
        phone: form.phone.value,
        email: form.email.value,
        industry: form.industry.value || '',
        founded: form.founded.value || '',
        consultTime: form.consultTime.value,
        amount: form.amount.value || '',
        fundType: Array.from(fundTypes).map(cb => cb.value).join(', '),
        message: form.message.value || '',
        privacy: form.privacy.checked ? 'true' : 'false'
    };

    try {
        const response = await fetch(WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        successMessage.classList.add('active');
        submitButton.textContent = '무료 상담 신청하기';
        form.reset();

        setTimeout(() => {
            successMessage.classList.remove('active');
            submitButton.disabled = false;
        }, 5000);

    } catch (error) {
        console.error('Error:', error);
        errorMessage.classList.add('active');
        submitButton.disabled = false;
        submitButton.textContent = '무료 상담 신청하기';

        setTimeout(() => {
            errorMessage.classList.remove('active');
        }, 5000);
    }
}

function togglePrivacyDetail() {
    const content = document.getElementById('privacyContent');
    content.classList.toggle('show');
}

document.querySelector('input[name="bizno"]').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 3 && value.length <= 5) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 5) {
        value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10);
    }
    e.target.value = value;
});

document.querySelector('input[name="phone"]').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 3 && value.length <= 7) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }
    e.target.value = value;
});

if (window.innerWidth <= 768) {
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
}`;
  },

  /**
   * 페이지 유형별 폼 규칙
   */
  getFormRules(pageType) {
    if (pageType === 'mkt') {
      return {
        brandInfoUpdate: true,
        colorUpdate: false,
        codeUpdate: false,
        description: 'mkt 폼: 브랜드명/전화번호만 수정, 컬러 및 코드 변경 금지',
      };
    } else {
      return {
        brandInfoUpdate: true,
        colorUpdate: true,
        codeUpdate: false,
        description: '일반 폼: 좌측 브랜드 정보 + 컬러만 업데이트, 입력 필드 유지',
      };
    }
  },

  /**
   * Hex 컬러를 RGB로 변환
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  },

  /**
   * 어두운 그라디언트 계산
   */
  calculateGradientDark(primaryColor, accentColor) {
    // primaryColor를 어둡게 조정
    const darkPrimary = this.adjustBrightness(primaryColor, -20);
    return `linear-gradient(135deg, ${darkPrimary}, ${accentColor})`;
  },

  /**
   * 밝은 그라디언트 계산
   */
  calculateGradientLight(primaryColor, accentColor) {
    return `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`;
  },

  /**
   * 밝기 조정
   */
  adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  },
};
