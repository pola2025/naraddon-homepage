/**
 * Section ID Mapper Skill
 * @purpose 사용자 제공 섹션 ID를 txt 파일명에 매핑
 * @context 아임웹 코드 위젯에서 섹션 ID를 통해 디자인 우선순위 설정
 */

module.exports = {
  name: 'section-id-mapper',
  version: '1.0.0',
  description: '섹션 ID와 txt 파일명 자동 매핑',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {object} context.sectionIds - 사용자 제공 섹션 ID 객체
   * @param {object} context.brandInfo - 브랜드 정보 (선택사항)
   */
  async run(context) {
    console.log('🗺️ [section-id-mapper] 섹션 ID 매핑 시작...\n');

    const sectionIds = context.sectionIds || {};
    const brandInfo = context.brandInfo || {};

    // 섹션 ID 검증
    if (Object.keys(sectionIds).length === 0) {
      return {
        success: false,
        error: '섹션 ID가 제공되지 않았습니다',
        hint: '섹션 ID 객체를 context.sectionIds로 전달해주세요',
        example: {
          header: 's20251017bcddee2e53649',
          footer: 's20251017bcddee2e53650',
          hero: 's20251017bcddee2e53651',
        },
      };
    }

    try {
      // 1. 기본 매핑 구조 생성
      const mapping = this.generateMapping(sectionIds, brandInfo);

      // 2. 검증
      const validation = this.validateMapping(mapping);

      // 3. 파일명 규칙 확인
      const fileNameRules = this.getFileNameRules();

      console.log(`✅ 섹션 ID 매핑 완료 (${Object.keys(mapping).length}개)\n`);

      if (validation.warnings.length > 0) {
        console.log('⚠️ 경고사항:\n');
        validation.warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`);
        });
        console.log('');
      }

      return {
        success: true,
        mapping,
        validation,
        fileNameRules,
        summary: {
          totalSections: Object.keys(mapping).length,
          commonComponents: this.countComponentType(mapping, 'common'),
          pageComponents: this.countComponentType(mapping, 'page'),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * 섹션 ID 매핑 생성
   */
  generateMapping(sectionIds, brandInfo) {
    const mapping = {};

    // 각 섹션 ID에 대해 파일명 매핑
    Object.entries(sectionIds).forEach(([componentName, sectionId]) => {
      const fileInfo = this.getFileInfo(componentName, sectionId, brandInfo);
      mapping[fileInfo.fileName] = {
        sectionId,
        componentName,
        componentType: fileInfo.componentType,
        pageType: fileInfo.pageType,
        description: fileInfo.description,
        rules: fileInfo.rules,
      };
    });

    return mapping;
  },

  /**
   * 컴포넌트 정보 추출
   */
  getFileInfo(componentName, sectionId, brandInfo) {
    // 컴포넌트 이름에서 페이지 타입 추출
    const parts = componentName.split('_');
    const pagePrefix = parts[0]; // main, home, company, fund, pro, mkt 등
    const componentType = parts.slice(1).join('_'); // header, footer, hero, form 등

    // 공통 컴포넌트 vs 페이지별 컴포넌트 구분
    const isCommonComponent = ['header', 'footer', 'form'].includes(componentType);

    let fileName;
    let description;
    let rules;

    if (isCommonComponent) {
      // 공통 컴포넌트: main_header.txt, main_footer.txt, main_form.txt
      fileName = `main_${componentType}.txt`;
      description = `공통 컴포넌트: ${this.getComponentDescription(componentType)}`;
      rules = this.getCommonComponentRules(componentType, pagePrefix === 'mkt');
    } else {
      // 페이지별 컴포넌트: home_hero.txt, company_about.txt 등
      fileName = `${pagePrefix}_${componentType}.txt`;
      description = `${this.getPageDescription(pagePrefix)} - ${this.getComponentDescription(
        componentType
      )}`;
      rules = this.getPageComponentRules(pagePrefix, componentType);
    }

    return {
      fileName,
      componentType: isCommonComponent ? 'common' : 'page',
      pageType: pagePrefix,
      description,
      rules,
    };
  },

  /**
   * 공통 컴포넌트 규칙
   */
  getCommonComponentRules(componentType, isMktPage) {
    const baseRules = {
      header: {
        applyToAllPages: true,
        brandInfoUpdate: true,
        colorUpdate: true,
        codeUpdate: false,
        description: 'Header: 브랜드명, 로고, 컬러만 변경',
      },
      footer: {
        applyToAllPages: true,
        brandInfoUpdate: true,
        colorUpdate: true,
        codeUpdate: false,
        description: 'Footer: 브랜드명, 로고, 컬러만 변경',
      },
      form: {
        applyToAllPages: true,
        brandInfoUpdate: true,
        colorUpdate: true,
        codeUpdate: false,
        description: 'Form: 왼쪽 브랜드 정보 업데이트, 입력 필드 유지',
      },
    };

    // mkt Form 특별 규칙
    if (componentType === 'form' && isMktPage) {
      return {
        applyToAllPages: false,
        brandInfoUpdate: true,
        colorUpdate: false,
        codeUpdate: false,
        description: '⚠️ mkt Form: 브랜드명/전화번호만 수정, 컬러 및 코드 변경 절대 금지',
        special: 'mkt-form',
      };
    }

    return baseRules[componentType] || {};
  },

  /**
   * 페이지별 컴포넌트 규칙
   */
  getPageComponentRules(pageType, componentType) {
    return {
      pageSpecific: true,
      textRewrite: true,
      brandInfoApply: true,
      colorUpdate: true,
      description: `${pageType} 페이지의 ${componentType} 섹션`,
    };
  },

  /**
   * 컴포넌트 설명
   */
  getComponentDescription(componentType) {
    const descriptions = {
      header: '상단 헤더 (로고, 네비게이션)',
      footer: '하단 푸터 (연락처, 링크)',
      form: '입력 폼 (상담 신청)',
      hero: '히어로 섹션 (메인 배너)',
      about: '회사 소개',
      team: '팀 소개',
      steps: '진행 과정',
      services: '서비스 소개',
      portfolio: '포트폴리오',
      features: '주요 기능',
      cta: 'Call-to-Action (행동 유도)',
      contact: '연락처',
    };

    return descriptions[componentType] || componentType;
  },

  /**
   * 페이지 설명
   */
  getPageDescription(pageType) {
    const descriptions = {
      main: '메인',
      home: '홈',
      company: '회사소개',
      process: '진행과정',
      fund: '자금상담',
      pro: '전문서비스',
      mkt: '온라인마케팅',
    };

    return descriptions[pageType] || pageType;
  },

  /**
   * 매핑 검증
   */
  validateMapping(mapping) {
    const warnings = [];
    const errors = [];

    // 1. 필수 공통 컴포넌트 확인
    const requiredComponents = ['main_header.txt', 'main_footer.txt', 'main_form.txt'];
    requiredComponents.forEach((fileName) => {
      if (!mapping[fileName]) {
        warnings.push(`필수 공통 컴포넌트가 누락되었습니다: ${fileName}`);
      }
    });

    // 2. 섹션 ID 형식 확인
    Object.entries(mapping).forEach(([fileName, info]) => {
      const sectionId = info.sectionId;

      // 섹션 ID 형식 검증 (예: s20251017bcddee2e53649)
      if (!/^s[a-zA-Z0-9]{20,}$/.test(sectionId)) {
        warnings.push(
          `${fileName}의 섹션 ID 형식이 비정상적입니다: ${sectionId} (예상: s20251017bcddee2e53649)`
        );
      }
    });

    // 3. 중복 섹션 ID 확인
    const sectionIdCounts = {};
    Object.entries(mapping).forEach(([fileName, info]) => {
      const sectionId = info.sectionId;
      sectionIdCounts[sectionId] = (sectionIdCounts[sectionId] || 0) + 1;
    });

    Object.entries(sectionIdCounts).forEach(([sectionId, count]) => {
      if (count > 1) {
        errors.push(`섹션 ID 중복: ${sectionId} (${count}개 파일에서 사용)`);
      }
    });

    // 4. mkt Form 특별 규칙 확인
    const mktFormFiles = Object.entries(mapping).filter(
      ([fileName, info]) => info.rules && info.rules.special === 'mkt-form'
    );

    if (mktFormFiles.length > 0) {
      console.log('  ⚠️ mkt Form 감지: 브랜드명/전화번호만 수정 가능\n');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  },

  /**
   * 컴포넌트 타입별 개수
   */
  countComponentType(mapping, componentType) {
    return Object.values(mapping).filter((info) => info.componentType === componentType).length;
  },

  /**
   * 파일명 규칙 가이드
   */
  getFileNameRules() {
    return {
      commonComponents: {
        pattern: 'main_{component}.txt',
        examples: ['main_header.txt', 'main_footer.txt', 'main_form.txt'],
        description: '모든 페이지에 공통 적용되는 컴포넌트',
      },
      pageComponents: {
        pattern: '{page}_{component}.txt',
        examples: [
          'home_hero.txt',
          'company_about.txt',
          'process_steps.txt',
          'fund_form.txt',
          'pro_services.txt',
          'mkt_portfolio.txt',
        ],
        description: '페이지별 전용 컴포넌트',
      },
      sectionIdFormat: {
        pattern: 's[a-zA-Z0-9]{20,}',
        example: 's20251017bcddee2e53649',
        description: '아임웹 코드 위젯 섹션 ID',
      },
    };
  },

  /**
   * 매핑 테이블 출력 (가독성 향상)
   */
  printMappingTable(mapping) {
    console.log('📋 섹션 ID 매핑 테이블:\n');
    console.log('┌─────────────────────────────┬──────────────────────────┬────────────┐');
    console.log('│ 파일명                      │ 섹션 ID                  │ 컴포넌트   │');
    console.log('├─────────────────────────────┼──────────────────────────┼────────────┤');

    Object.entries(mapping).forEach(([fileName, info]) => {
      const fileNamePadded = fileName.padEnd(27);
      const sectionIdPadded = info.sectionId.padEnd(24);
      const componentPadded = info.componentName.padEnd(10);

      console.log(`│ ${fileNamePadded} │ ${sectionIdPadded} │ ${componentPadded} │`);
    });

    console.log('└─────────────────────────────┴──────────────────────────┴────────────┘\n');
  },

  /**
   * DESIGN_CONCEPT.md에 추가할 매핑 마크다운 생성
   */
  generateMarkdownTable(mapping) {
    const lines = [];

    lines.push('## 섹션 ID 매핑\n');
    lines.push('| 파일명 | 섹션 ID | 컴포넌트 | 페이지 | 설명 |');
    lines.push('|--------|---------|----------|--------|------|');

    Object.entries(mapping).forEach(([fileName, info]) => {
      lines.push(
        `| ${fileName} | \`${info.sectionId}\` | ${info.componentName} | ${info.pageType} | ${info.description} |`
      );
    });

    lines.push('');
    lines.push('### 규칙');
    lines.push('- **공통 컴포넌트**: main_header.txt, main_footer.txt, main_form.txt');
    lines.push('- **페이지 컴포넌트**: {page}_{component}.txt');
    lines.push('- **⚠️ 섹션 ID 제거 금지**: 디자인 우선순위 깨짐 방지');
    lines.push('');

    return lines.join('\n');
  },

  /**
   * 예제 사용법
   */
  getUsageExample() {
    return {
      description: '섹션 ID 매핑 사용 예제',
      cli: `
# CLI 사용
node .claude/cli.js section-id-mapper

# 환경변수로 섹션 ID 전달
HEADER_SECTION_ID=s20251017bcddee2e53649 \\
FOOTER_SECTION_ID=s20251017bcddee2e53650 \\
HERO_SECTION_ID=s20251017bcddee2e53651 \\
node .claude/cli.js section-id-mapper
      `.trim(),
      javascript: `
// JavaScript 사용
const SkillEngine = require('./.claude/skill-engine');

const sectionIds = {
  main_header: 's20251017bcddee2e53649',
  main_footer: 's20251017bcddee2e53650',
  home_hero: 's20251017bcddee2e53651',
  company_about: 's20251017bcddee2e53652',
  fund_form: 's20251017bcddee2e53653',
  mkt_form: 's20251017bcddee2e53654', // ⚠️ mkt 특별 규칙
};

const result = await SkillEngine.execute(
  'project-specific/fundheallab/section-id-mapper',
  { sectionIds }
);

console.log(result.mapping);
      `.trim(),
    };
  },
};
