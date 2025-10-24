/**
 * Text Rewriter Validator Skill
 * @purpose 텍스트 재작성 규칙 검증
 * @context 기업심사관 프로젝트 전용
 */

module.exports = {
  name: 'text-rewriter-validator',
  version: '1.0.0',
  description: '텍스트 재작성 규칙 검증',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.originalText - 원본 텍스트
   * @param {string} context.rewrittenText - 재작성된 텍스트
   * @param {string} context.sectionType - 섹션 타입 (hero, features, cta 등)
   * @param {object} context.brandInfo - 브랜드 정보
   */
  async run(context) {
    console.log('✍️ [text-rewriter-validator] 텍스트 재작성 규칙 검증 시작...\n');

    const original = context.originalText || '';
    const rewritten = context.rewrittenText || '';
    const sectionType = context.sectionType || '';
    const brandInfo = context.brandInfo || {};

    const violations = [];
    const warnings = [];

    // 1. Header/Footer/Form 제외 확인
    const isExcluded = this.isExcludedComponent(sectionType);
    if (isExcluded) {
      return {
        valid: true,
        skipped: true,
        message: `${sectionType}은 재작성 제외 (공통 컴포넌트)`,
      };
    }

    // 2. 글자수 유사성 검증 (±10%)
    const lengthCheck = this.checkLength(original, rewritten);
    if (!lengthCheck.valid) {
      violations.push({
        type: 'length',
        severity: 'medium',
        message: lengthCheck.message,
        original: original.length,
        rewritten: rewritten.length,
        diff: lengthCheck.diff,
      });
    }

    // 3. 금지 용어 검증
    const forbiddenTerms = this.checkForbiddenTerms(rewritten);
    if (forbiddenTerms.length > 0) {
      violations.push({
        type: 'forbidden-terms',
        severity: 'high',
        message: `금지된 용어 사용: ${forbiddenTerms.join(', ')}`,
        suggestion: '직관적인 표현으로 대체',
      });
    }

    // 4. 복잡한 표현 검증
    const complexExpressions = this.checkComplexity(rewritten);
    if (complexExpressions.length > 0) {
      warnings.push({
        type: 'complexity',
        message: `복잡한 표현 발견: ${complexExpressions.join(', ')}`,
        suggestion: '단순하고 명확한 메시지로 변경',
      });
    }

    // 5. 브랜드 메시지 확인
    if (brandInfo.brandName && !rewritten.includes(brandInfo.brandName)) {
      warnings.push({
        type: 'brand-message',
        message: `브랜드명 "${brandInfo.brandName}" 미포함`,
        suggestion: '브랜드 메시지 반영 권장',
      });
    }

    const valid = violations.length === 0;
    const score = this.calculateScore(violations, warnings, lengthCheck.similarity);

    console.log(`${valid ? '✅' : '⚠️'} 검증 완료 (점수: ${score}/100)\n`);

    return {
      valid,
      score,
      violations,
      warnings,
      lengthSimilarity: lengthCheck.similarity,
      stats: {
        originalLength: original.length,
        rewrittenLength: rewritten.length,
        violations: violations.length,
        warnings: warnings.length,
      },
    };
  },

  /**
   * 재작성 제외 컴포넌트 확인
   */
  isExcludedComponent(sectionType) {
    const excluded = ['header', 'footer', 'form', 'main_header', 'main_footer', 'main_form'];
    return excluded.includes(sectionType.toLowerCase());
  },

  /**
   * 글자수 유사성 검증 (±10%)
   */
  checkLength(original, rewritten) {
    const originalLen = original.length;
    const rewrittenLen = rewritten.length;

    const diff = Math.abs(originalLen - rewrittenLen);
    const similarity = 100 - (diff / originalLen * 100);

    const tolerance = originalLen * 0.1; // ±10%
    const valid = diff <= tolerance;

    return {
      valid,
      similarity: Math.round(similarity),
      diff,
      message: valid
        ? `글자수 유사 (${rewrittenLen}자, ±${Math.round(diff)}자)`
        : `글자수 차이 초과 (원본: ${originalLen}자, 재작성: ${rewrittenLen}자, 차이: ${diff}자)`,
    };
  },

  /**
   * 금지 용어 검증
   */
  checkForbiddenTerms(text) {
    const forbidden = [
      '경영제도',
      '사전 준비',
      '대표님이 직접',
      '역량 강화',
      '대행 금지',
      '신청 전 준비',
      '~해드립니다',
    ];

    const found = [];
    for (const term of forbidden) {
      if (text.includes(term)) {
        found.push(term);
      }
    }

    return found;
  },

  /**
   * 복잡한 표현 검증
   */
  checkComplexity(text) {
    const complex = [
      '과도하게 상세한',
      '장황한',
      '복잡한 철학',
      '특별한 의미',
    ];

    const found = [];

    // 문장 길이 체크 (100자 이상)
    const sentences = text.split(/[.!?]/);
    const longSentences = sentences.filter(s => s.trim().length > 100);
    if (longSentences.length > 0) {
      found.push(`긴 문장 (${longSentences.length}개)`);
    }

    // 복잡한 패턴 체크
    for (const pattern of complex) {
      if (text.includes(pattern)) {
        found.push(pattern);
      }
    }

    return found;
  },

  /**
   * 점수 계산
   */
  calculateScore(violations, warnings, lengthSimilarity) {
    let score = 100;

    // 위반사항 감점
    violations.forEach(v => {
      if (v.severity === 'high') score -= 20;
      else if (v.severity === 'medium') score -= 10;
      else score -= 5;
    });

    // 경고 감점
    score -= warnings.length * 5;

    // 글자수 유사성 보너스/페널티
    if (lengthSimilarity >= 90) score += 10;
    else if (lengthSimilarity < 70) score -= 15;

    return Math.max(0, Math.min(100, score));
  },

  /**
   * 리포트 생성
   */
  generateReport(result) {
    const lines = [];

    lines.push('## 텍스트 재작성 규칙 검증 리포트\n');
    lines.push(`**점수**: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
    lines.push(`**글자수 유사도**: ${result.lengthSimilarity}%\n`);

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

    if (result.warnings.length > 0) {
      lines.push('### ⚠️ 경고\n');
      result.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. ${w.message}`);
        if (w.suggestion) {
          lines.push(`   - 제안: ${w.suggestion}`);
        }
        lines.push('');
      });
    }

    lines.push('### 📋 재작성 규칙\n');
    lines.push('#### ✅ 적용 사항');
    lines.push('- 의미와 맥락 유지');
    lines.push('- 글자수 유사 (±10%)');
    lines.push('- 브랜드 메시지 반영');
    lines.push('- 단순하고 명확한 메시지');
    lines.push('- 직관적인 서비스 설명');
    lines.push('- 신뢰와 전문성 강조\n');

    lines.push('#### ❌ 금지 사항');
    lines.push('- "경영제도" 용어 사용');
    lines.push('- 과도한 철학이나 복잡한 설명');
    lines.push('- 장황한 프로세스 설명');
    lines.push('- "사전 준비", "대행 금지" 같은 복잡한 표현\n');

    lines.push('#### 제외 대상');
    lines.push('- Header, Footer, Form (공통 컴포넌트)\n');

    lines.push('### 📊 통계\n');
    lines.push(`- 원본 길이: ${result.stats.originalLength}자`);
    lines.push(`- 재작성 길이: ${result.stats.rewrittenLength}자`);
    lines.push(`- 유사도: ${result.lengthSimilarity}%`);
    lines.push(`- 위반: ${result.stats.violations}개`);
    lines.push(`- 경고: ${result.stats.warnings}개`);

    return lines.join('\n');
  },
};
