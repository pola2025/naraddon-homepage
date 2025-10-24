/**
 * Homepage Builder Orchestrator Skill
 * @purpose 기업심사관 홈페이지 제작 전체 워크플로우 지휘
 * @context 아임웹 복제 → 브랜드 정보 입력 → 코드 위젯 업데이트 → 제작 완료
 */

const SkillEngine = require('../../../../skill-engine');

module.exports = {
  name: 'homepage-builder-orchestrator',
  version: '1.0.0',
  description: '기업심사관 홈페이지 제작 워크플로우 총괄',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.stage - 현재 단계 (collect-info, validate, deploy)
   * @param {object} context.brandInfo - 브랜드 정보
   * @param {object} context.files - 검증할 파일들
   */
  async run(context) {
    console.log('🎬 [homepage-builder-orchestrator] 홈페이지 제작 워크플로우 시작...\n');

    const stage = context.stage || 'collect-info';
    const results = {
      stage,
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
      warnings: [],
    };

    try {
      // Stage 1: 브랜드 정보 수집
      if (stage === 'collect-info' || stage === 'all') {
        console.log('\n📋 [1/3] 브랜드 정보 수집 단계\n');
        const collectResult = await this.runStage1_CollectInfo(context);
        results.steps.push(collectResult);
        context.brandInfo = collectResult.brandInfo;

        // 사용자 확인 필요
        if (!context.skipConfirmation) {
          console.log('\n⚠️ 브랜드 정보 확인이 필요합니다.\n');
          results.needsConfirmation = true;
          results.confirmationData = {
            step: 'brand-info',
            brandInfo: collectResult.brandInfo,
            designConcept: collectResult.designConcept,
          };
          return results;
        }
      }

      // Stage 2: 코드 위젯 검증
      if (stage === 'validate' || stage === 'all') {
        console.log('\n🔍 [2/3] 코드 위젯 검증 단계\n');
        const validateResult = await this.runStage2_Validate(context);
        results.steps.push(validateResult);

        // 위반사항이 있으면 사용자 확인 필요
        if (validateResult.hasViolations && !context.skipConfirmation) {
          console.log('\n⚠️ 검증 위반사항이 있습니다. 계속 진행하시겠습니까?\n');
          results.needsConfirmation = true;
          results.confirmationData = {
            step: 'validation',
            violations: validateResult.violations,
          };
          return results;
        }
      }

      // Stage 3: 배포 준비
      if (stage === 'deploy' || stage === 'all') {
        console.log('\n🚀 [3/3] 배포 준비 단계\n');
        const deployResult = await this.runStage3_Deploy(context);
        results.steps.push(deployResult);
      }

      console.log('\n✅ 홈페이지 제작 워크플로우 완료\n');
      results.completed = true;

    } catch (error) {
      console.error(`\n❌ 오류 발생: ${error.message}\n`);
      results.errors.push({
        message: error.message,
        stack: error.stack,
      });
      results.completed = false;
    }

    return results;
  },

  /**
   * Stage 1: 브랜드 정보 수집 및 DESIGN_CONCEPT.md 생성
   */
  async runStage1_CollectInfo(context) {
    console.log('  → brand-info-collector 실행 중...\n');

    const result = await SkillEngine.execute(
      'project-specific/fundheallab/brand-info-collector',
      context
    );

    if (!result.success) {
      throw new Error(`브랜드 정보 수집 실패: ${result.error}`);
    }

    console.log('  ✅ 브랜드 정보 수집 완료\n');
    console.log(`  - 브랜드명: ${result.brandInfo.brandName}`);
    console.log(`  - 도메인: ${result.brandInfo.domain}`);
    console.log(`  - Primary 컬러: ${result.brandInfo.primaryColor}`);
    console.log(`  - Accent 컬러: ${result.brandInfo.accentColor}\n`);

    return {
      step: 'collect-info',
      success: true,
      brandInfo: result.brandInfo,
      designConcept: result.designConcept,
      projectStructure: result.projectStructure,
    };
  },

  /**
   * Stage 2: 코드 위젯 검증
   */
  async runStage2_Validate(context) {
    const files = context.files || {};
    const brandInfo = context.brandInfo || {};
    const validationResults = [];
    const allViolations = [];

    console.log('  검증 시작...\n');

    // 1. 서브도메인 검증
    if (files.subdomain) {
      console.log('  → subdomain-validator 실행 중...');
      const result = await SkillEngine.execute(
        'project-specific/fundheallab/subdomain-validator',
        {
          domain: brandInfo.domain,
          code: files.subdomain,
        }
      );
      validationResults.push({ skill: 'subdomain', result });
      allViolations.push(...result.violations);
      console.log(`     ${result.valid ? '✅' : '⚠️'} 점수: ${result.score}/100\n`);
    }

    // 2. 디자인 규칙 검증
    if (files.design) {
      console.log('  → design-rules-validator 실행 중...');
      const result = await SkillEngine.execute(
        'project-specific/fundheallab/design-rules-validator',
        {
          code: files.design,
          fileType: files.designType || 'css',
        }
      );
      validationResults.push({ skill: 'design', result });
      allViolations.push(...result.violations);
      console.log(`     ${result.valid ? '✅' : '⚠️'} 점수: ${result.score}/100\n`);
    }

    // 3. 섹션 ID 검증
    if (files.sectionId) {
      console.log('  → section-id-validator 실행 중...');
      const result = await SkillEngine.execute(
        'project-specific/fundheallab/section-id-validator',
        {
          code: files.sectionId,
          pageType: files.pageType || 'unknown',
        }
      );
      validationResults.push({ skill: 'section-id', result });
      allViolations.push(...result.violations);
      console.log(`     ${result.valid ? '✅' : '⚠️'} 점수: ${result.score}/100\n`);
    }

    // 4. 컴포넌트 검증
    if (files.component) {
      console.log('  → component-validator 실행 중...');
      const result = await SkillEngine.execute(
        'project-specific/fundheallab/component-validator',
        {
          code: files.component,
          componentType: files.componentType,
          pageType: files.pageType,
          brandInfo,
        }
      );
      validationResults.push({ skill: 'component', result });
      allViolations.push(...result.violations);
      console.log(`     ${result.valid ? '✅' : '⚠️'} 점수: ${result.score}/100\n`);
    }

    // 5. 텍스트 재작성 검증
    if (files.originalText && files.rewrittenText) {
      console.log('  → text-rewriter-validator 실행 중...');
      const result = await SkillEngine.execute(
        'project-specific/fundheallab/text-rewriter-validator',
        {
          originalText: files.originalText,
          rewrittenText: files.rewrittenText,
          sectionType: files.sectionType,
          brandInfo,
        }
      );

      if (!result.skipped) {
        validationResults.push({ skill: 'text-rewriter', result });
        allViolations.push(...result.violations);
        console.log(`     ${result.valid ? '✅' : '⚠️'} 점수: ${result.score}/100\n`);
      } else {
        console.log(`     ⏭️ 제외됨 (${result.message})\n`);
      }
    }

    const hasViolations = allViolations.length > 0;
    console.log(`  ✅ 검증 완료 (총 ${allViolations.length}개 위반사항)\n`);

    return {
      step: 'validate',
      success: true,
      hasViolations,
      validationResults,
      violations: allViolations,
    };
  },

  /**
   * Stage 3: 배포 준비
   */
  async runStage3_Deploy(context) {
    console.log('  배포 준비 중...\n');

    const brandInfo = context.brandInfo || {};
    const tasks = [];

    // 1. DESIGN_CONCEPT.md 저장
    tasks.push({
      name: 'DESIGN_CONCEPT.md 저장',
      path: `F:\\bas_homepage\\${brandInfo.brandName}\\DESIGN_CONCEPT.md`,
      status: 'pending',
    });

    // 2. Obsidian 프로젝트 생성
    tasks.push({
      name: 'Obsidian 프로젝트 생성',
      path: `F:\\obsidian\\Pola\\Projects\\bas_homepage\\${brandInfo.brandName}\\`,
      status: 'pending',
    });

    // 3. 컴포넌트 파일 생성
    tasks.push({
      name: '컴포넌트 파일 생성',
      files: ['main_header.txt', 'main_footer.txt', 'main_form.txt'],
      status: 'pending',
    });

    // 4. 페이지 파일 생성
    tasks.push({
      name: '페이지 파일 생성',
      files: ['home_hero.txt', 'company_about.txt', 'fund_form.txt', '...'],
      status: 'pending',
    });

    console.log('  ✅ 배포 태스크 준비 완료\n');
    console.log('  다음 단계:\n');
    tasks.forEach((task, i) => {
      console.log(`    ${i + 1}. ${task.name}`);
      if (task.path) console.log(`       경로: ${task.path}`);
      if (task.files) console.log(`       파일: ${task.files.join(', ')}`);
    });

    return {
      step: 'deploy',
      success: true,
      tasks,
    };
  },

  /**
   * 워크플로우 요약 생성
   */
  generateSummary(results) {
    const lines = [];

    lines.push('# 기업심사관 홈페이지 제작 워크플로우 요약\n');
    lines.push(`**실행 시간**: ${results.timestamp}\n`);

    lines.push('## 단계별 진행 상황\n');
    results.steps.forEach((step, i) => {
      lines.push(`### ${i + 1}. ${step.step}\n`);
      lines.push(`- 상태: ${step.success ? '✅ 성공' : '❌ 실패'}`);

      if (step.brandInfo) {
        lines.push(`- 브랜드명: ${step.brandInfo.brandName}`);
        lines.push(`- 도메인: ${step.brandInfo.domain}`);
      }

      if (step.violations) {
        lines.push(`- 위반사항: ${step.violations.length}개`);
      }

      if (step.tasks) {
        lines.push(`- 준비된 태스크: ${step.tasks.length}개`);
      }

      lines.push('');
    });

    if (results.errors.length > 0) {
      lines.push('## ❌ 오류\n');
      results.errors.forEach((error, i) => {
        lines.push(`${i + 1}. ${error.message}\n`);
      });
    }

    if (results.needsConfirmation) {
      lines.push('## ⚠️ 사용자 확인 필요\n');
      lines.push(`- 단계: ${results.confirmationData.step}`);
      lines.push('- 계속 진행하려면 확인이 필요합니다.\n');
    }

    return lines.join('\n');
  },
};
