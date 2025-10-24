/**
 * Subdomain Validator Skill
 * @purpose 자금치유연구소 프로젝트 서브도메인 규칙 검증
 * @context 기업심사관 홈페이지 프로젝트 전용
 */

module.exports = {
  name: 'subdomain-validator',
  version: '1.0.0',
  description: '자금치유연구소 서브도메인 규칙 검증',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.domain - 기본 도메인 (사용자 제공)
   * @param {string} context.code - 파일/코드 내용
   * @param {string} context.pageName - 페이지명 (선택)
   */
  async run(context) {
    console.log('🌐 [subdomain-validator] 서브도메인 규칙 검증 시작...\n');

    const domain = context.domain;
    if (!domain) {
      console.error('❌ 기본 도메인이 제공되지 않았습니다.');
      return {
        valid: false,
        error: '기본 도메인 필요',
      };
    }

    const code = context.code || '';
    const violations = [];
    const warnings = [];

    // 1. 서브도메인 규칙 정의
    const subdomainRules = this.getSubdomainRules();

    // 2. 코드에서 URL 패턴 추출
    const urlPatterns = this.extractURLPatterns(code);

    // 3. 각 URL 검증
    for (const url of urlPatterns) {
      const validation = this.validateURL(url, domain, subdomainRules);

      if (!validation.valid) {
        violations.push({
          url,
          expected: validation.expected,
          message: validation.message,
        });
      }

      if (validation.warning) {
        warnings.push({
          url,
          message: validation.warning,
        });
      }
    }

    const valid = violations.length === 0;
    const score = this.calculateScore(violations, warnings, urlPatterns.length);

    console.log(`${valid ? '✅' : '⚠️'} 검증 완료 (점수: ${score}/100)\n`);

    return {
      valid,
      score,
      domain,
      violations,
      warnings,
      stats: {
        totalURLs: urlPatterns.length,
        violations: violations.length,
        warnings: warnings.length,
      },
      suggestions: this.generateSuggestions(violations, domain, subdomainRules),
    };
  },

  /**
   * 서브도메인 규칙 정의
   */
  getSubdomainRules() {
    return {
      // 페이지명 → 서브도메인 매핑
      'home': 'home',
      '홈': 'home',
      '메인': 'home',

      'company': 'company',
      '회사소개': 'company',
      '소개': 'company',

      'process': 'process',
      '진행과정': 'process',
      '프로세스': 'process',

      'fund': 'fund',
      '자금상담': 'fund',
      '상담': 'fund',

      'pro': 'pro',
      '전문서비스': 'pro',
      '서비스': 'pro',

      'mkt': 'mkt',
      '온라인마케팅': 'mkt',
      '마케팅': 'mkt',
    };
  },

  /**
   * 코드에서 URL 패턴 추출
   */
  extractURLPatterns(code) {
    const patterns = [];

    // href 속성에서 추출
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    while ((match = hrefRegex.exec(code)) !== null) {
      const url = match[1];
      // 외부 URL이나 앵커는 제외
      if (!url.startsWith('http') && !url.startsWith('#') && !url.startsWith('tel:') && !url.startsWith('mailto:')) {
        patterns.push(url);
      }
    }

    // JavaScript 내 URL 패턴
    const jsUrlRegex = /(?:window\.location|location\.href)\s*=\s*["']([^"']+)["']/g;
    while ((match = jsUrlRegex.exec(code)) !== null) {
      patterns.push(match[1]);
    }

    // 중복 제거
    return [...new Set(patterns)];
  },

  /**
   * URL 검증
   */
  validateURL(url, baseDomain, rules) {
    // 상대 경로 처리
    if (url.startsWith('/')) {
      return {
        valid: false,
        expected: `https://${this.guessSubdomain(url, rules)}.${baseDomain}`,
        message: '상대 경로 대신 서브도메인 사용 필요',
      };
    }

    // 절대 URL 검증
    if (url.startsWith('http')) {
      // 기본 도메인 포함 확인
      if (!url.includes(baseDomain)) {
        return {
          valid: false,
          expected: `서브도메인.${baseDomain} 형식 사용`,
          message: '잘못된 도메인',
        };
      }

      // 서브도메인 패턴 확인
      const subdomainPattern = /https?:\/\/([^.]+)\./;
      const subdomainMatch = url.match(subdomainPattern);

      if (subdomainMatch) {
        const subdomain = subdomainMatch[1];
        const validSubdomains = Object.values(rules);

        if (!validSubdomains.includes(subdomain)) {
          return {
            valid: false,
            expected: `유효한 서브도메인: ${validSubdomains.join(', ')}`,
            message: `잘못된 서브도메인: ${subdomain}`,
          };
        }
      }

      return { valid: true };
    }

    // 기타 패턴 (경고)
    return {
      valid: true,
      warning: 'URL 패턴 확인 필요',
    };
  },

  /**
   * URL에서 서브도메인 추측
   */
  guessSubdomain(url, rules) {
    const urlLower = url.toLowerCase();

    for (const [key, subdomain] of Object.entries(rules)) {
      if (urlLower.includes(key.toLowerCase())) {
        return subdomain;
      }
    }

    return 'home'; // 기본값
  },

  /**
   * 점수 계산
   */
  calculateScore(violations, warnings, totalURLs) {
    if (totalURLs === 0) return 100;

    let score = 100;
    score -= violations.length * 15; // 위반당 -15점
    score -= warnings.length * 5;    // 경고당 -5점

    return Math.max(0, score);
  },

  /**
   * 수정 제안 생성
   */
  generateSuggestions(violations, domain, rules) {
    const suggestions = [];

    for (const violation of violations) {
      const suggestion = {
        original: violation.url,
        fixed: violation.expected,
        reason: violation.message,
      };

      suggestions.push(suggestion);
    }

    return suggestions;
  },

  /**
   * 리포트 생성
   */
  generateReport(result) {
    const lines = [];

    lines.push('## 서브도메인 규칙 검증 리포트\n');
    lines.push(`**도메인**: ${result.domain}`);
    lines.push(`**점수**: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}\n`);

    lines.push('### 📋 서브도메인 규칙\n');
    lines.push('| 페이지 | 서브도메인 | 설명 |');
    lines.push('|--------|-----------|------|');
    lines.push(`| 홈 | home.${result.domain} | 메인 홈페이지 |`);
    lines.push(`| 회사소개 | company.${result.domain} | 자금치유연구소 소개 |`);
    lines.push(`| 진행과정 | process.${result.domain} | 자문 프로세스 |`);
    lines.push(`| 자금상담 | fund.${result.domain} | 자금상담 페이지 |`);
    lines.push(`| 전문서비스 | pro.${result.domain} | 전문 서비스 안내 |`);
    lines.push(`| 온라인마케팅 | mkt.${result.domain} | 마케팅 서비스 |`);
    lines.push('');

    if (result.violations.length > 0) {
      lines.push('### ❌ 위반사항\n');
      result.violations.forEach((v, i) => {
        lines.push(`${i + 1}. **${v.message}**`);
        lines.push(`   - 원본: \`${v.url}\``);
        lines.push(`   - 수정: \`${v.expected}\``);
        lines.push('');
      });
    }

    if (result.warnings.length > 0) {
      lines.push('### ⚠️ 경고\n');
      result.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. \`${w.url}\` - ${w.message}`);
      });
      lines.push('');
    }

    if (result.suggestions.length > 0) {
      lines.push('### 💡 수정 제안\n');
      lines.push('```diff');
      result.suggestions.forEach(s => {
        lines.push(`- ${s.original}`);
        lines.push(`+ ${s.fixed}`);
      });
      lines.push('```\n');
    }

    lines.push('### 📊 통계\n');
    lines.push(`- 총 URL: ${result.stats.totalURLs}개`);
    lines.push(`- 위반: ${result.stats.violations}개`);
    lines.push(`- 경고: ${result.stats.warnings}개`);

    return lines.join('\n');
  },

  /**
   * 도메인 자동 변환
   */
  convertURLs(code, domain, rules) {
    let converted = code;

    // 상대 경로 → 서브도메인 URL 변환
    const relativeURLRegex = /href=["']\/([^"']+)["']/g;
    converted = converted.replace(relativeURLRegex, (match, path) => {
      const subdomain = this.guessSubdomain('/' + path, rules);
      return `href="https://${subdomain}.${domain}/${path}"`;
    });

    return converted;
  },
};
