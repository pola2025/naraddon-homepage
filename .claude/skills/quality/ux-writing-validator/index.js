/**
 * UX Writing Validator Skill
 * @purpose 토스 스타일 UX Writing 규칙 검증
 * @context 집첵 프로젝트 전용 (토스 가이드 기반)
 */

module.exports = {
  name: 'ux-writing-validator',
  version: '1.0.0',
  description: '토스 스타일 UX Writing 규칙 검증',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.text - 검증할 텍스트
   * @param {string} context.project - 프로젝트명 (집첵)
   */
  async run(context) {
    console.log('✍️  [ux-writing-validator] UX Writing 검증 시작...\n');

    const text = context.text || context.content || '';

    if (!text) {
      return {
        valid: true,
        warnings: [],
        message: '검증할 텍스트가 없습니다.',
      };
    }

    // 토스 스타일 규칙 적용
    const rules = this.getTossRules();
    const violations = [];
    const warnings = [];
    const suggestions = [];

    // 각 규칙 검증
    for (const rule of rules) {
      const result = rule.check(text);
      if (result.violated) {
        violations.push({
          rule: rule.name,
          severity: rule.severity,
          message: result.message,
          examples: result.examples,
        });
      }
      if (result.warning) {
        warnings.push({
          rule: rule.name,
          message: result.message,
        });
      }
      if (result.suggestion) {
        suggestions.push({
          rule: rule.name,
          message: result.message,
          example: result.example,
        });
      }
    }

    const valid = violations.length === 0;
    const score = this.calculateScore(violations, warnings, text);

    console.log(`${valid ? '✅' : '⚠️'} 검증 완료 (점수: ${score}/100)\n`);

    return {
      valid,
      score,
      violations,
      warnings,
      suggestions,
      stats: {
        totalLength: text.length,
        sentences: text.split(/[.!?]/).filter(Boolean).length,
        violations: violations.length,
        warnings: warnings.length,
      },
    };
  },

  /**
   * 토스 스타일 UX Writing 규칙
   */
  getTossRules() {
    return [
      // 1. 친절하고 명확하게
      {
        name: '존댓말 사용',
        severity: 'high',
        check: (text) => {
          // 반말 패턴 감지
          const informalPatterns = [
            /했어[^요]/g,
            /했다[^는]/g,
            /한다[^는]/g,
            /할게[^요]/g,
            /이야[^기]/g,
          ];

          for (const pattern of informalPatterns) {
            if (pattern.test(text)) {
              return {
                violated: true,
                message: '반말이 감지되었습니다. 존댓말을 사용해주세요.',
                examples: [
                  '❌ "저장했어"',
                  '✅ "저장했어요"',
                ],
              };
            }
          }

          return { violated: false };
        },
      },

      // 2. 간결하게
      {
        name: '문장 길이',
        severity: 'medium',
        check: (text) => {
          const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
          const longSentences = sentences.filter(s => s.length > 50);

          if (longSentences.length > 0) {
            return {
              violated: false,
              warning: true,
              message: `문장이 너무 길 수 있습니다 (${longSentences.length}개). 간결하게 작성해주세요.`,
            };
          }

          return { violated: false };
        },
      },

      {
        name: '불필요한 수식어',
        severity: 'low',
        check: (text) => {
          const unnecessaryWords = [
            '매우',
            '정말',
            '아주',
            '굉장히',
            '완전',
            '진짜',
          ];

          const found = unnecessaryWords.filter(word => text.includes(word));

          if (found.length > 0) {
            return {
              violated: false,
              warning: true,
              message: `불필요한 수식어가 있습니다: ${found.join(', ')}`,
              examples: [
                '❌ "매우 좋은 집"',
                '✅ "좋은 집"',
              ],
            };
          }

          return { violated: false };
        },
      },

      // 3. 사용자 중심으로
      {
        name: '사용자 관점',
        severity: 'medium',
        check: (text) => {
          // "당신", "고객" 대신 "회원님", "님" 권장
          const systemCentricWords = ['당신', '고객'];
          const found = systemCentricWords.filter(word => text.includes(word));

          if (found.length > 0) {
            return {
              violated: false,
              suggestion: true,
              message: `사용자 관점의 표현을 권장합니다: ${found.join(', ')}`,
              example: {
                before: '당신의 집',
                after: '회원님의 집',
              },
            };
          }

          return { violated: false };
        },
      },

      // 4. 긍정적 표현
      {
        name: '부정 표현',
        severity: 'low',
        check: (text) => {
          const negativePatterns = [
            /못.*습니다/g,
            /안.*됩니다/g,
            /불가능/g,
            /실패/g,
          ];

          for (const pattern of negativePatterns) {
            if (pattern.test(text)) {
              return {
                violated: false,
                suggestion: true,
                message: '긍정적 표현을 권장합니다.',
                example: {
                  before: '저장할 수 없습니다',
                  after: '잠시 후 다시 시도해주세요',
                },
              };
            }
          }

          return { violated: false };
        },
      },

      // 5. 명확한 행동 유도
      {
        name: 'CTA 명확성',
        severity: 'high',
        check: (text) => {
          // 버튼/링크 텍스트 체크 (context에 따라)
          const vagueActions = [
            '클릭',
            '여기',
            '이곳',
            '계속',
          ];

          const found = vagueActions.filter(word => text.includes(word));

          if (found.length > 0) {
            return {
              violated: false,
              warning: true,
              message: `모호한 행동 유도 표현: ${found.join(', ')}`,
              examples: [
                '❌ "여기를 클릭하세요"',
                '✅ "체크리스트 작성하기"',
              ],
            };
          }

          return { violated: false };
        },
      },

      // 6. 일관성
      {
        name: '용어 일관성',
        severity: 'medium',
        check: (text) => {
          // 동일한 의미의 다른 표현 감지
          const synonymPairs = [
            ['아파트', '공동주택'],
            ['집', '주택', '부동산'],
            ['확인', '체크'],
          ];

          for (const [term1, term2] of synonymPairs) {
            if (text.includes(term1) && text.includes(term2)) {
              return {
                violated: false,
                warning: true,
                message: `용어가 일관되지 않습니다: "${term1}"과 "${term2}"`,
              };
            }
          }

          return { violated: false };
        },
      },

      // 7. 숫자 표기
      {
        name: '숫자 가독성',
        severity: 'low',
        check: (text) => {
          // 큰 숫자는 콤마 사용 권장
          const largeNumbers = text.match(/\d{4,}/g);

          if (largeNumbers) {
            return {
              violated: false,
              suggestion: true,
              message: '큰 숫자는 콤마를 사용하면 더 읽기 쉽습니다.',
              example: {
                before: '1000000원',
                after: '1,000,000원',
              },
            };
          }

          return { violated: false };
        },
      },

      // 8. 전문용어 최소화
      {
        name: '전문용어',
        severity: 'medium',
        check: (text) => {
          const jargon = [
            '트랜잭션',
            '프로세스',
            '인터페이스',
            '솔루션',
          ];

          const found = jargon.filter(word => text.includes(word));

          if (found.length > 0) {
            return {
              violated: false,
              warning: true,
              message: `전문용어를 쉬운 말로 바꿔보세요: ${found.join(', ')}`,
            };
          }

          return { violated: false };
        },
      },
    ];
  },

  /**
   * 점수 계산
   */
  calculateScore(violations, warnings, text) {
    let score = 100;

    // 위반사항 감점
    violations.forEach(v => {
      if (v.severity === 'high') score -= 15;
      else if (v.severity === 'medium') score -= 10;
      else score -= 5;
    });

    // 경고 감점
    score -= warnings.length * 3;

    // 최소 0점
    return Math.max(0, score);
  },

  /**
   * 검증 리포트 생성
   */
  generateReport(result) {
    const lines = [];

    lines.push('## UX Writing 검증 리포트\n');
    lines.push(`**점수**: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}\n`);

    if (result.violations.length > 0) {
      lines.push('### ❌ 위반사항\n');
      result.violations.forEach((v, i) => {
        lines.push(`${i + 1}. **${v.rule}** (${v.severity})`);
        lines.push(`   ${v.message}`);
        if (v.examples) {
          v.examples.forEach(ex => lines.push(`   ${ex}`));
        }
        lines.push('');
      });
    }

    if (result.warnings.length > 0) {
      lines.push('### ⚠️ 경고\n');
      result.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. **${w.rule}**: ${w.message}`);
      });
      lines.push('');
    }

    if (result.suggestions.length > 0) {
      lines.push('### 💡 제안\n');
      result.suggestions.forEach((s, i) => {
        lines.push(`${i + 1}. **${s.rule}**: ${s.message}`);
        if (s.example) {
          lines.push(`   - Before: ${s.example.before}`);
          lines.push(`   - After: ${s.example.after}`);
        }
        lines.push('');
      });
    }

    lines.push('### 📊 통계\n');
    lines.push(`- 총 길이: ${result.stats.totalLength}자`);
    lines.push(`- 문장 수: ${result.stats.sentences}개`);
    lines.push(`- 위반: ${result.stats.violations}개`);
    lines.push(`- 경고: ${result.stats.warnings}개`);

    return lines.join('\n');
  },
};
