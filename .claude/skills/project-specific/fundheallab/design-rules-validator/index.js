/**
 * Design Rules Validator Skill
 * @purpose 기업심사관 홈페이지 디자인 규칙 검증
 * @context 다크 블루 + 네온 골드 컬러, Glassmorphism 효과 등
 */

module.exports = {
  name: 'design-rules-validator',
  version: '1.0.0',
  description: '기업심사관 홈페이지 디자인 규칙 검증',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.code - 검증할 코드
   * @param {string} context.fileType - 파일 타입 (css, tsx, jsx 등)
   */
  async run(context) {
    console.log('🎨 [design-rules-validator] 디자인 규칙 검증 시작...\n');

    const code = context.code || '';
    const violations = [];
    const warnings = [];

    // 1. 컬러 팔레트 규칙
    const colorRules = this.getColorRules();
    const colorViolations = this.validateColors(code, colorRules);
    violations.push(...colorViolations);

    // 2. Glassmorphism 효과 규칙
    const glassRules = this.getGlassmorphismRules();
    const glassWarnings = this.validateGlassmorphism(code, glassRules);
    warnings.push(...glassWarnings);

    // 3. 네온 효과 규칙
    const neonRules = this.getNeonRules();
    const neonWarnings = this.validateNeonEffects(code, neonRules);
    warnings.push(...neonWarnings);

    const valid = violations.length === 0;
    const score = this.calculateScore(violations, warnings);

    console.log(`${valid ? '✅' : '⚠️'} 검증 완료 (점수: ${score}/100)\n`);

    return {
      valid,
      score,
      violations,
      warnings,
      stats: {
        totalChecks: colorViolations.length + glassWarnings.length + neonWarnings.length,
        violations: violations.length,
        warnings: warnings.length,
      },
    };
  },

  /**
   * 컬러 팔레트 규칙
   */
  getColorRules() {
    return {
      primary: {
        darkBlue: '#0f172e',
        variants: ['#0f172e', 'rgb(15, 23, 46)', 'rgba(15, 23, 46'],
        name: '다크 블루',
      },
      accent: {
        neonGold: '#d4af37',
        variants: ['#d4af37', 'rgb(212, 175, 55)', 'rgba(212, 175, 55'],
        name: '네온 골드',
      },
      forbidden: [
        // 금지된 컬러 (예시로 일반적인 실수)
        '#000000', // 순수 검은색 대신 다크 블루 사용
        '#ffffff', // 순수 흰색은 글래스모피즘에서 주의
      ],
    };
  },

  /**
   * Glassmorphism 효과 규칙
   */
  getGlassmorphismRules() {
    return {
      requiredProperties: [
        'backdrop-filter',
        'background',
        'border',
      ],
      recommended: {
        'backdrop-filter': /blur\(\d+px\)/,
        'background': /rgba?\([^)]+,\s*0\.\d+\)/,
        'border': /1px.*rgba?\([^)]+,\s*0\.\d+\)/,
      },
    };
  },

  /**
   * 네온 효과 규칙
   */
  getNeonRules() {
    return {
      boxShadow: {
        pattern: /box-shadow:.*#d4af37/i,
        levels: ['0 0 10px', '0 0 20px', '0 0 30px'],
      },
      textShadow: {
        pattern: /text-shadow:.*#d4af37/i,
      },
    };
  },

  /**
   * 컬러 검증
   */
  validateColors(code, rules) {
    const violations = [];

    // 금지된 컬러 체크
    for (const forbiddenColor of rules.forbidden) {
      if (code.includes(forbiddenColor)) {
        violations.push({
          type: 'color',
          severity: 'high',
          message: `금지된 컬러 사용: ${forbiddenColor}`,
          suggestion: forbiddenColor === '#000000'
            ? `${rules.primary.darkBlue} (다크 블루) 사용 권장`
            : '컬러 팔레트 참조',
        });
      }
    }

    return violations;
  },

  /**
   * Glassmorphism 검증
   */
  validateGlassmorphism(code, rules) {
    const warnings = [];

    // backdrop-filter 사용 여부 확인
    if (code.includes('glass') || code.includes('Glass')) {
      const hasBackdropFilter = /backdrop-filter:\s*blur/.test(code);
      const hasTransparentBg = /background:.*rgba?\([^)]+,\s*0\.\d+\)/.test(code);

      if (!hasBackdropFilter) {
        warnings.push({
          type: 'glassmorphism',
          severity: 'medium',
          message: 'Glassmorphism 효과에 backdrop-filter: blur() 누락',
          suggestion: 'backdrop-filter: blur(10px) 추가',
        });
      }

      if (!hasTransparentBg) {
        warnings.push({
          type: 'glassmorphism',
          severity: 'medium',
          message: 'Glassmorphism 효과에 반투명 배경 누락',
          suggestion: 'background: rgba(15, 23, 46, 0.7) 형식 사용',
        });
      }
    }

    return warnings;
  },

  /**
   * 네온 효과 검증
   */
  validateNeonEffects(code, rules) {
    const warnings = [];

    // 네온 효과가 있는 경우 골드 컬러 사용 여부 확인
    if (/box-shadow:.*0\s+0/.test(code) && !/#d4af37/i.test(code)) {
      warnings.push({
        type: 'neon',
        severity: 'low',
        message: '네온 효과에 골드 컬러(#d4af37) 미사용',
        suggestion: 'box-shadow: 0 0 20px #d4af37',
      });
    }

    return warnings;
  },

  /**
   * 점수 계산
   */
  calculateScore(violations, warnings) {
    let score = 100;
    score -= violations.length * 15;
    score -= warnings.length * 5;
    return Math.max(0, score);
  },

  /**
   * 리포트 생성
   */
  generateReport(result) {
    const lines = [];

    lines.push('## 디자인 규칙 검증 리포트\n');
    lines.push(`**점수**: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}\n`);

    lines.push('### 🎨 컬러 팔레트\n');
    lines.push('| 용도 | 컬러 코드 | 이름 |');
    lines.push('|------|----------|------|');
    lines.push('| Primary | `#0f172e` | 다크 블루 |');
    lines.push('| Accent | `#d4af37` | 네온 골드 |');
    lines.push('');

    if (result.violations.length > 0) {
      lines.push('### ❌ 위반사항\n');
      result.violations.forEach((v, i) => {
        lines.push(`${i + 1}. **${v.message}**`);
        lines.push(`   - 제안: ${v.suggestion}`);
        lines.push('');
      });
    }

    if (result.warnings.length > 0) {
      lines.push('### ⚠️ 경고\n');
      result.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. ${w.message}`);
        lines.push(`   - 제안: ${w.suggestion}`);
        lines.push('');
      });
    }

    lines.push('### 📊 통계\n');
    lines.push(`- 총 검사: ${result.stats.totalChecks}개`);
    lines.push(`- 위반: ${result.stats.violations}개`);
    lines.push(`- 경고: ${result.stats.warnings}개`);

    return lines.join('\n');
  },
};
