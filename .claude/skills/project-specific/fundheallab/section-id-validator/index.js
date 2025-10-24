/**
 * Section ID Validator Skill
 * @purpose 컴포넌트 섹션 ID 규칙 검증
 * @context 각 섹션은 고유 ID를 가지며, 컴포넌트 재사용 시에도 ID 유지
 */

module.exports = {
  name: 'section-id-validator',
  version: '1.0.0',
  description: '컴포넌트 섹션 ID 규칙 검증',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.code - 검증할 코드
   * @param {string} context.componentName - 컴포넌트명
   */
  async run(context) {
    console.log('🔍 [section-id-validator] 섹션 ID 검증 시작...\n');

    const code = context.code || '';
    const violations = [];
    const warnings = [];

    // 1. 섹션 ID 존재 여부 확인
    const sectionIds = this.extractSectionIds(code);

    if (sectionIds.length === 0) {
      warnings.push({
        type: 'missing-id',
        severity: 'medium',
        message: '섹션 ID가 없습니다. 앵커 링크를 위해 ID 추가 권장',
      });
    }

    // 2. ID 명명 규칙 검증
    const namingViolations = this.validateNaming(sectionIds);
    violations.push(...namingViolations);

    // 3. 중복 ID 검사
    const duplicates = this.findDuplicates(sectionIds);
    if (duplicates.length > 0) {
      violations.push({
        type: 'duplicate-id',
        severity: 'high',
        message: `중복된 ID: ${duplicates.join(', ')}`,
        suggestion: '각 섹션은 고유한 ID를 가져야 합니다',
      });
    }

    // 4. 필수 섹션 ID 확인 (페이지 타입별)
    const requiredIds = this.getRequiredSectionIds(context.pageType);
    const missingIds = this.checkRequiredIds(sectionIds, requiredIds);
    if (missingIds.length > 0) {
      warnings.push({
        type: 'missing-required-id',
        severity: 'low',
        message: `권장 섹션 ID 누락: ${missingIds.join(', ')}`,
      });
    }

    const valid = violations.length === 0;
    const score = this.calculateScore(violations, warnings, sectionIds.length);

    console.log(`${valid ? '✅' : '⚠️'} 검증 완료 (점수: ${score}/100)\n`);

    return {
      valid,
      score,
      violations,
      warnings,
      sectionIds,
      stats: {
        totalSections: sectionIds.length,
        violations: violations.length,
        warnings: warnings.length,
      },
    };
  },

  /**
   * 섹션 ID 추출
   */
  extractSectionIds(code) {
    const ids = [];

    // HTML/JSX id 속성 추출
    const idPattern = /id=["']([^"']+)["']/g;
    let match;

    while ((match = idPattern.exec(code)) !== null) {
      ids.push(match[1]);
    }

    return ids;
  },

  /**
   * ID 명명 규칙 검증
   */
  validateNaming(sectionIds) {
    const violations = [];

    // 권장 명명 규칙: kebab-case
    const kebabCasePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

    for (const id of sectionIds) {
      // camelCase나 PascalCase 사용 시 경고
      if (!kebabCasePattern.test(id)) {
        violations.push({
          type: 'naming',
          severity: 'medium',
          message: `ID "${id}"가 kebab-case가 아닙니다`,
          suggestion: `"${this.toKebabCase(id)}" 형식 권장`,
        });
      }

      // 너무 짧은 ID
      if (id.length < 3) {
        violations.push({
          type: 'naming',
          severity: 'low',
          message: `ID "${id}"가 너무 짧습니다 (최소 3자 권장)`,
        });
      }

      // 숫자로 시작하는 ID (HTML 유효성)
      if (/^\d/.test(id)) {
        violations.push({
          type: 'naming',
          severity: 'high',
          message: `ID "${id}"가 숫자로 시작합니다 (HTML 규칙 위반)`,
          suggestion: '영문자로 시작해야 합니다',
        });
      }
    }

    return violations;
  },

  /**
   * kebab-case 변환
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },

  /**
   * 중복 ID 찾기
   */
  findDuplicates(sectionIds) {
    const seen = new Set();
    const duplicates = new Set();

    for (const id of sectionIds) {
      if (seen.has(id)) {
        duplicates.add(id);
      } else {
        seen.add(id);
      }
    }

    return Array.from(duplicates);
  },

  /**
   * 페이지 타입별 필수 섹션 ID
   */
  getRequiredSectionIds(pageType) {
    const commonIds = ['header', 'footer'];

    const pageSpecificIds = {
      home: ['hero', 'features', 'cta'],
      company: ['about', 'team', 'values'],
      process: ['steps', 'timeline'],
      fund: ['contact-form', 'consultation'],
      pro: ['services', 'pricing'],
      mkt: ['portfolio', 'case-studies'],
    };

    return [...commonIds, ...(pageSpecificIds[pageType] || [])];
  },

  /**
   * 필수 ID 확인
   */
  checkRequiredIds(sectionIds, requiredIds) {
    const missing = [];

    for (const requiredId of requiredIds) {
      if (!sectionIds.includes(requiredId)) {
        missing.push(requiredId);
      }
    }

    return missing;
  },

  /**
   * 점수 계산
   */
  calculateScore(violations, warnings, totalSections) {
    if (totalSections === 0) return 50; // ID가 없으면 기본 50점

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

    lines.push('## 섹션 ID 검증 리포트\n');
    lines.push(`**점수**: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}\n`);

    lines.push('### 📋 발견된 섹션 ID\n');
    if (result.sectionIds.length > 0) {
      result.sectionIds.forEach((id, i) => {
        lines.push(`${i + 1}. \`${id}\``);
      });
      lines.push('');
    } else {
      lines.push('- 섹션 ID가 없습니다\n');
    }

    if (result.violations.length > 0) {
      lines.push('### ❌ 위반사항\n');
      result.violations.forEach((v, i) => {
        lines.push(`${i + 1}. **${v.message}**`);
        if (v.suggestion) {
          lines.push(`   - 제안: ${v.suggestion}`);
        }
        lines.push('');
      });
    }

    if (result.warnings.length > 0) {
      lines.push('### ⚠️ 경고\n');
      result.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. ${w.message}`);
        lines.push('');
      });
    }

    lines.push('### 💡 섹션 ID 규칙\n');
    lines.push('- **명명 규칙**: kebab-case (예: `hero-section`, `contact-form`)');
    lines.push('- **최소 길이**: 3자 이상');
    lines.push('- **시작 문자**: 영문자로 시작');
    lines.push('- **고유성**: 페이지 내 중복 불가');
    lines.push('- **권장 공통 ID**: `header`, `footer`, `hero`, `cta`\n');

    lines.push('### 📊 통계\n');
    lines.push(`- 총 섹션: ${result.stats.totalSections}개`);
    lines.push(`- 위반: ${result.stats.violations}개`);
    lines.push(`- 경고: ${result.stats.warnings}개`);

    return lines.join('\n');
  },
};
