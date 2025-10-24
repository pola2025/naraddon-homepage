/**
 * Component Validator Skill
 * @purpose Header/Footer/Form 컴포넌트 규칙 검증
 * @context 기업심사관 프로젝트 전용
 */

module.exports = {
  name: 'component-validator',
  version: '1.0.0',
  description: 'Header/Footer/Form 컴포넌트 규칙 검증',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.code - 검증할 코드
   * @param {string} context.componentType - 컴포넌트 타입 (header, footer, form)
   * @param {string} context.pageType - 페이지 타입 (home, company, process, fund, pro, mkt)
   * @param {object} context.brandInfo - 브랜드 정보
   */
  async run(context) {
    console.log('🔍 [component-validator] 컴포넌트 규칙 검증 시작...\n');

    const code = context.code || '';
    const componentType = context.componentType;
    const pageType = context.pageType || '';
    const brandInfo = context.brandInfo || {};

    const violations = [];
    const warnings = [];

    // 1. Header/Footer 공통 규칙 검증
    if (componentType === 'header' || componentType === 'footer') {
      const commonViolations = this.validateCommonComponent(code, componentType, brandInfo);
      violations.push(...commonViolations);
    }

    // 2. Form 규칙 검증
    if (componentType === 'form') {
      const formViolations = this.validateForm(code, pageType, brandInfo);
      violations.push(...formViolations);
    }

    // 3. 섹션 ID 존재 확인
    const sectionIdCheck = this.checkSectionId(code, componentType);
    if (!sectionIdCheck.found) {
      violations.push({
        type: 'section-id',
        severity: 'high',
        message: '섹션 ID가 없습니다. 디자인 우선순위가 깨질 수 있습니다.',
        suggestion: `섹션 ID 추가 필요 (예: id="${sectionIdCheck.expected}")`,
      });
    }

    const valid = violations.length === 0;
    const score = this.calculateScore(violations, warnings);

    console.log(`${valid ? '✅' : '⚠️'} 검증 완료 (점수: ${score}/100)\n`);

    return {
      valid,
      score,
      violations,
      warnings,
      stats: {
        violations: violations.length,
        warnings: warnings.length,
      },
    };
  },

  /**
   * Header/Footer 공통 컴포넌트 검증
   */
  validateCommonComponent(code, componentType, brandInfo) {
    const violations = [];

    // 1. 브랜드명 확인
    if (brandInfo.brandName) {
      const hasBrandName = code.includes(brandInfo.brandName);
      if (!hasBrandName) {
        violations.push({
          type: 'brand-name',
          severity: 'high',
          message: `브랜드명 "${brandInfo.brandName}"이 없습니다`,
          suggestion: `텍스트에 "${brandInfo.brandName}" 포함 필요`,
        });
      }
    }

    // 2. 컬러 적용 확인
    if (componentType === 'header') {
      // Primary/Accent 컬러 사용 여부
      const hasPrimaryColor = code.includes(brandInfo.primaryColor || '#0f172e');
      const hasAccentColor = code.includes(brandInfo.accentColor || '#d4af37');

      if (!hasPrimaryColor && !hasAccentColor) {
        violations.push({
          type: 'color',
          severity: 'medium',
          message: '브랜드 컬러가 적용되지 않았습니다',
          suggestion: `Primary: ${brandInfo.primaryColor || '#0f172e'}, Accent: ${brandInfo.accentColor || '#d4af37'}`,
        });
      }
    }

    // 3. Footer 연락처 정보
    if (componentType === 'footer') {
      const contactFields = ['phone', 'email', 'address'];
      const missingContacts = [];

      for (const field of contactFields) {
        if (brandInfo[field] && !code.includes(brandInfo[field])) {
          missingContacts.push(field);
        }
      }

      if (missingContacts.length > 0) {
        violations.push({
          type: 'contact-info',
          severity: 'medium',
          message: `연락처 정보 누락: ${missingContacts.join(', ')}`,
          suggestion: '브랜드 정보의 연락처를 Footer에 포함하세요',
        });
      }
    }

    return violations;
  },

  /**
   * Form 검증
   */
  validateForm(code, pageType, brandInfo) {
    const violations = [];

    // 1. mkt Form 특별 규칙
    if (pageType === 'mkt') {
      // mkt 폼은 브랜드명/전화번호만 수정, 코드/컬러 변경 금지
      violations.push({
        type: 'mkt-form',
        severity: 'low',
        message: 'mkt Form은 브랜드명/전화번호만 수정 가능합니다',
        suggestion: '코드 및 컬러 변경 금지',
      });
    }

    // 2. 브랜드명 확인
    if (brandInfo.brandName && !code.includes(brandInfo.brandName)) {
      violations.push({
        type: 'brand-name',
        severity: 'high',
        message: `폼에 브랜드명 "${brandInfo.brandName}"이 없습니다`,
      });
    }

    // 3. 전화번호 확인
    if (brandInfo.phone && !code.includes(brandInfo.phone)) {
      violations.push({
        type: 'phone',
        severity: 'medium',
        message: `폼에 전화번호 "${brandInfo.phone}"가 없습니다`,
      });
    }

    // 4. "홈페이지 접수" 표시 확인
    if (!code.includes('홈페이지 접수') && !code.includes('homepage')) {
      violations.push({
        type: 'source',
        severity: 'medium',
        message: '접수 출처 표시 누락',
        suggestion: '"홈페이지 접수" 표시 필요',
      });
    }

    return violations;
  },

  /**
   * 섹션 ID 확인
   */
  checkSectionId(code, componentType) {
    // 섹션 ID 패턴 찾기
    const sectionIdPattern = /id=["']([^"']+)["']/;
    const match = code.match(sectionIdPattern);

    const expectedIds = {
      header: 'header',
      footer: 'footer',
      form: 'contact-form',
    };

    return {
      found: !!match,
      actual: match ? match[1] : null,
      expected: expectedIds[componentType] || componentType,
    };
  },

  /**
   * 점수 계산
   */
  calculateScore(violations, warnings) {
    let score = 100;

    violations.forEach(v => {
      if (v.severity === 'high') score -= 20;
      else if (v.severity === 'medium') score -= 10;
      else score -= 5;
    });

    score -= warnings.length * 3;

    return Math.max(0, score);
  },

  /**
   * 리포트 생성
   */
  generateReport(result) {
    const lines = [];

    lines.push('## 컴포넌트 규칙 검증 리포트\n');
    lines.push(`**점수**: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}\n`);

    if (result.violations.length > 0) {
      lines.push('### ❌ 위반사항\n');
      result.violations.forEach((v, i) => {
        lines.push(`${i + 1}. **[${v.severity}]** ${v.message}`);
        if (v.suggestion) {
          lines.push(`   - 제안: ${v.suggestion}`);
        }
        lines.push('');
      });
    }

    lines.push('### 📋 컴포넌트 규칙\n');
    lines.push('#### Header/Footer');
    lines.push('- ✅ main_*.txt 기반, 모든 페이지 공통 적용');
    lines.push('- ✅ 브랜드명, 로고, 컬러는 브랜드 정보에서 적용');
    lines.push('- ✅ 섹션 ID 반드시 유지\n');
    lines.push('#### Form');
    lines.push('- ✅ 입력 양식 유지');
    lines.push('- ✅ 왼쪽 브랜드 정보만 교체 (번호, 브랜드명, 컬러)');
    lines.push('- ⚠️ **mkt Form**: 브랜드명/전화번호만 수정, 코드/컬러 변경 금지');
    lines.push('- ✅ "홈페이지 접수" 표시 필수\n');

    return lines.join('\n');
  },
};
