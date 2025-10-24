#!/usr/bin/env node

/**
 * Claude Skill CLI
 * @purpose Claude와 통합되어 Skill을 실행하는 CLI 도구
 * @usage node .claude/cli.js <command> [options]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SkillOrchestrator = require('./skills/automation/skill-orchestrator');
const SkillEngine = require('./skill-engine');

// 명령어 매핑
const COMMANDS = {
  // Skill Orchestrator 실행
  'troubleshooting': () => runWorkflow('troubleshooting'),
  'ts': () => runWorkflow('troubleshooting'), // 별칭

  'feature': () => runWorkflow('feature-development'),
  'feat': () => runWorkflow('feature-development'), // 별칭

  'architecture': () => runWorkflow('architecture'),
  'arch': () => runWorkflow('architecture'), // 별칭

  'conversation': () => runWorkflow('conversation'),
  'conv': () => runWorkflow('conversation'), // 별칭

  // 개별 Skill 실행
  'metadata': () => runSkill('automation/metadata-auto-generator'),
  'obsidian': () => runSkill('automation/obsidian-auto-doc'),

  // 집첵 전용 - UX Writing 검증
  'validate-ux': () => runUXValidator(),
  'ux': () => runUXValidator(), // 별칭

  // 기업심사관 전용 - 디자인 규칙 검증
  'validate-subdomain': () => runSubdomainValidator(),
  'subdomain': () => runSubdomainValidator(), // 별칭

  'validate-design': () => runDesignValidator(),
  'design': () => runDesignValidator(), // 별칭

  'validate-section-id': () => runSectionIdValidator(),
  'section-id': () => runSectionIdValidator(), // 별칭

  'validate-component': () => runComponentValidator(),
  'component': () => runComponentValidator(), // 별칭

  'validate-text': () => runTextRewriterValidator(),
  'text': () => runTextRewriterValidator(), // 별칭

  // 기업심사관 전용 - 홈페이지 제작 워크플로우
  'build-homepage': () => runHomepageBuilder(),
  'build': () => runHomepageBuilder(), // 별칭

  'collect-brand-info': () => runBrandInfoCollector(),
  'brand': () => runBrandInfoCollector(), // 별칭

  // 기업심사관 전용 - 생성 도구
  'generate-webhook': () => runWebhookGenerator(),
  'webhook': () => runWebhookGenerator(), // 별칭

  'generate-form': () => runFormGenerator(),
  'form': () => runFormGenerator(), // 별칭

  'map-section-ids': () => runSectionIdMapper(),
  'map-ids': () => runSectionIdMapper(), // 별칭

  // 유틸리티
  'list': () => listSkills(),
  'workflows': () => listWorkflows(),
  'help': () => showHelp(),
};

/**
 * 워크플로우 실행
 */
async function runWorkflow(workflowType) {
  console.log(`🚀 워크플로우 실행: ${workflowType}\n`);

  // 컨텍스트 수집
  const context = await collectContext();

  // Skill Orchestrator 실행
  const results = await SkillOrchestrator.execute(workflowType, context);

  // 결과 저장
  saveResults(workflowType, results);

  return results;
}

/**
 * 개별 Skill 실행
 */
async function runSkill(skillPath) {
  console.log(`🔧 Skill 실행: ${skillPath}\n`);

  const context = await collectContext();
  const result = await SkillEngine.execute(skillPath, context);

  console.log('\n✅ Skill 실행 완료\n');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * 서브도메인 검증 (기업심사관 전용)
 */
async function runSubdomainValidator() {
  console.log('🌐 서브도메인 규칙 검증 (기업심사관 프로젝트 전용)\n');

  const domain = process.argv[3];
  const filePath = process.argv[4];

  if (!domain) {
    console.error('❌ 도메인을 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js validate-subdomain [도메인] [파일경로]');
    console.log('  node .claude/cli.js subdomain example.com src/pages/index.tsx');
    process.exit(1);
  }

  let code = '';
  if (filePath) {
    const fs = require('fs');
    code = fs.readFileSync(filePath, 'utf-8');
  }

  const context = {
    domain,
    code,
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/subdomain-validator', context);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`점수: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
  console.log('='.repeat(60) + '\n');

  if (result.violations.length > 0) {
    console.log('❌ 위반사항:\n');
    result.violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.message}`);
      console.log(`   원본: ${v.url}`);
      console.log(`   수정: ${v.expected}`);
      console.log('');
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ 경고:\n');
    result.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w.url} - ${w.message}`);
    });
    console.log('');
  }

  if (result.suggestions.length > 0) {
    console.log('💡 수정 제안:\n');
    result.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. ${s.original} → ${s.fixed}`);
    });
    console.log('');
  }

  console.log('📊 통계:');
  console.log(`   총 URL: ${result.stats.totalURLs}개`);
  console.log(`   위반: ${result.stats.violations}개`);
  console.log(`   경고: ${result.stats.warnings}개\n`);

  return result;
}

/**
 * 디자인 규칙 검증 (기업심사관 전용)
 */
async function runDesignValidator() {
  console.log('🎨 디자인 규칙 검증 (기업심사관 프로젝트 전용)\n');

  const filePath = process.argv[3];

  if (!filePath) {
    console.error('❌ 파일 경로를 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js validate-design [파일경로]');
    console.log('  node .claude/cli.js design src/styles/components.css');
    process.exit(1);
  }

  const fs = require('fs');
  const code = fs.readFileSync(filePath, 'utf-8');

  const context = {
    code,
    fileType: filePath.split('.').pop(),
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/design-rules-validator', context);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`점수: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
  console.log('='.repeat(60) + '\n');

  if (result.violations.length > 0) {
    console.log('❌ 위반사항:\n');
    result.violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.message}`);
      console.log(`   제안: ${v.suggestion}`);
      console.log('');
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ 경고:\n');
    result.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w.message}`);
      console.log(`   제안: ${w.suggestion}`);
      console.log('');
    });
  }

  console.log('📊 통계:');
  console.log(`   총 검사: ${result.stats.totalChecks}개`);
  console.log(`   위반: ${result.stats.violations}개`);
  console.log(`   경고: ${result.stats.warnings}개\n`);

  return result;
}

/**
 * 섹션 ID 검증 (기업심사관 전용)
 */
async function runSectionIdValidator() {
  console.log('🔍 섹션 ID 검증 (기업심사관 프로젝트 전용)\n');

  const filePath = process.argv[3];
  const pageType = process.argv[4];

  if (!filePath) {
    console.error('❌ 파일 경로를 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js validate-section-id [파일경로] [페이지타입]');
    console.log('  node .claude/cli.js section-id src/pages/home.tsx home');
    console.log('\n페이지 타입: home, company, process, fund, pro, mkt');
    process.exit(1);
  }

  const fs = require('fs');
  const code = fs.readFileSync(filePath, 'utf-8');

  const context = {
    code,
    pageType: pageType || 'unknown',
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/section-id-validator', context);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`점수: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
  console.log('='.repeat(60) + '\n');

  if (result.sectionIds.length > 0) {
    console.log('📋 발견된 섹션 ID:\n');
    result.sectionIds.forEach((id, i) => {
      console.log(`${i + 1}. ${id}`);
    });
    console.log('');
  }

  if (result.violations.length > 0) {
    console.log('❌ 위반사항:\n');
    result.violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.message}`);
      if (v.suggestion) {
        console.log(`   제안: ${v.suggestion}`);
      }
      console.log('');
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ 경고:\n');
    result.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w.message}`);
      console.log('');
    });
  }

  console.log('📊 통계:');
  console.log(`   총 섹션: ${result.stats.totalSections}개`);
  console.log(`   위반: ${result.stats.violations}개`);
  console.log(`   경고: ${result.stats.warnings}개\n`);

  return result;
}

/**
 * 컴포넌트 검증 (기업심사관 전용)
 */
async function runComponentValidator() {
  console.log('🔍 컴포넌트 규칙 검증 (기업심사관 프로젝트 전용)\n');

  const filePath = process.argv[3];
  const componentType = process.argv[4]; // header, footer, form
  const pageType = process.argv[5]; // home, company, process, fund, pro, mkt

  if (!filePath || !componentType) {
    console.error('❌ 파일 경로와 컴포넌트 타입을 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js validate-component [파일경로] [컴포넌트타입] [페이지타입]');
    console.log('  node .claude/cli.js component main_header.txt header');
    console.log('  node .claude/cli.js component main_form.txt form mkt');
    console.log('\n컴포넌트 타입: header, footer, form');
    console.log('페이지 타입: home, company, process, fund, pro, mkt');
    process.exit(1);
  }

  const fs = require('fs');
  const code = fs.readFileSync(filePath, 'utf-8');

  const context = {
    code,
    componentType,
    pageType: pageType || '',
    brandInfo: {
      brandName: process.env.BRAND_NAME || '',
      phone: process.env.BRAND_PHONE || '',
      email: process.env.BRAND_EMAIL || '',
      address: process.env.BRAND_ADDRESS || '',
      primaryColor: process.env.PRIMARY_COLOR || '#0f172e',
      accentColor: process.env.ACCENT_COLOR || '#d4af37',
    },
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/component-validator', context);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`점수: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
  console.log('='.repeat(60) + '\n');

  if (result.violations.length > 0) {
    console.log('❌ 위반사항:\n');
    result.violations.forEach((v, i) => {
      console.log(`${i + 1}. [${v.severity}] ${v.message}`);
      if (v.suggestion) {
        console.log(`   제안: ${v.suggestion}`);
      }
      console.log('');
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ 경고:\n');
    result.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w.message}`);
      console.log('');
    });
  }

  console.log('📊 통계:');
  console.log(`   위반: ${result.stats.violations}개`);
  console.log(`   경고: ${result.stats.warnings}개\n`);

  return result;
}

/**
 * 텍스트 재작성 검증 (기업심사관 전용)
 */
async function runTextRewriterValidator() {
  console.log('✍️ 텍스트 재작성 규칙 검증 (기업심사관 프로젝트 전용)\n');

  const originalPath = process.argv[3];
  const rewrittenPath = process.argv[4];
  const sectionType = process.argv[5];

  if (!originalPath || !rewrittenPath) {
    console.error('❌ 원본과 재작성 파일 경로를 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js validate-text [원본파일] [재작성파일] [섹션타입]');
    console.log('  node .claude/cli.js text original.txt rewritten.txt hero');
    console.log('\n섹션 타입: hero, features, cta, about, steps, etc.');
    console.log('제외 대상: header, footer, form (공통 컴포넌트)');
    process.exit(1);
  }

  const fs = require('fs');
  const originalText = fs.readFileSync(originalPath, 'utf-8');
  const rewrittenText = fs.readFileSync(rewrittenPath, 'utf-8');

  const context = {
    originalText,
    rewrittenText,
    sectionType: sectionType || 'unknown',
    brandInfo: {
      brandName: process.env.BRAND_NAME || '',
    },
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/text-rewriter-validator', context);

  if (result.skipped) {
    console.log(`⏭️ ${result.message}\n`);
    return result;
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`점수: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
  console.log(`글자수 유사도: ${result.lengthSimilarity}%`);
  console.log('='.repeat(60) + '\n');

  if (result.violations.length > 0) {
    console.log('❌ 위반사항:\n');
    result.violations.forEach((v, i) => {
      console.log(`${i + 1}. [${v.severity}] ${v.message}`);
      if (v.suggestion) {
        console.log(`   제안: ${v.suggestion}`);
      }
      console.log('');
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ 경고:\n');
    result.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w.message}`);
      if (w.suggestion) {
        console.log(`   제안: ${w.suggestion}`);
      }
      console.log('');
    });
  }

  console.log('📊 통계:');
  console.log(`   원본 길이: ${result.stats.originalLength}자`);
  console.log(`   재작성 길이: ${result.stats.rewrittenLength}자`);
  console.log(`   유사도: ${result.lengthSimilarity}%`);
  console.log(`   위반: ${result.stats.violations}개`);
  console.log(`   경고: ${result.stats.warnings}개\n`);

  return result;
}

/**
 * 브랜드 정보 수집 (기업심사관 전용)
 */
async function runBrandInfoCollector() {
  console.log('📋 브랜드 정보 수집 (기업심사관 프로젝트 전용)\n');

  const brandName = process.argv[3];
  const domain = process.argv[4];

  if (!brandName || !domain) {
    console.error('❌ 브랜드명과 도메인을 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js collect-brand-info [브랜드명] [도메인] [옵션...]');
    console.log('  node .claude/cli.js brand "자금치유연구소" "fundheallab.com"');
    console.log('\n선택적 환경변수:');
    console.log('  LOGO=로고경로');
    console.log('  PRIMARY_COLOR=#0f172e');
    console.log('  ACCENT_COLOR=#d4af37');
    console.log('  SLOGAN="브랜드 슬로건"');
    console.log('  PHONE=전화번호');
    console.log('  EMAIL=이메일');
    console.log('  ADDRESS=주소');
    process.exit(1);
  }

  const context = {
    brandName,
    domain,
    logo: process.env.LOGO || '',
    primaryColor: process.env.PRIMARY_COLOR || '#0f172e',
    accentColor: process.env.ACCENT_COLOR || '#d4af37',
    brandSlogan: process.env.SLOGAN || '',
    phone: process.env.PHONE || '',
    email: process.env.EMAIL || '',
    address: process.env.ADDRESS || '',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/brand-info-collector', context);

  if (!result.success) {
    console.error(`\n❌ 오류: ${result.error}\n`);
    if (result.missingFields) {
      console.log(`누락된 필드: ${result.missingFields.join(', ')}\n`);
    }
    process.exit(1);
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('✅ 브랜드 정보 수집 완료');
  console.log('='.repeat(60) + '\n');

  console.log('📋 브랜드 정보:\n');
  console.log(`  - 브랜드명: ${result.brandInfo.brandName}`);
  console.log(`  - 도메인: ${result.brandInfo.domain}`);
  console.log(`  - Primary 컬러: ${result.brandInfo.primaryColor}`);
  console.log(`  - Accent 컬러: ${result.brandInfo.accentColor}`);
  if (result.brandInfo.phone) console.log(`  - 전화번호: ${result.brandInfo.phone}`);
  if (result.brandInfo.email) console.log(`  - 이메일: ${result.brandInfo.email}`);
  console.log('');

  console.log('🌐 서브도메인 구조:\n');
  Object.entries(result.subdomainStructure.subdomains).forEach(([key, url]) => {
    console.log(`  - ${key}: ${url}`);
  });
  console.log('');

  console.log('📂 다음 단계:\n');
  result.nextSteps.forEach((step, i) => {
    console.log(`  ${step.step}. ${step.title}`);
    console.log(`     ${step.description}`);
  });
  console.log('');

  // DESIGN_CONCEPT.md 저장
  const fs = require('fs');
  const path = require('path');
  const projectPath = `F:\\bas_homepage\\${brandName}`;

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  const designConceptPath = path.join(projectPath, 'DESIGN_CONCEPT.md');
  fs.writeFileSync(designConceptPath, result.designConcept);
  console.log(`💾 DESIGN_CONCEPT.md 저장 완료: ${designConceptPath}\n`);

  return result;
}

/**
 * 홈페이지 제작 워크플로우 (기업심사관 전용)
 */
async function runHomepageBuilder() {
  console.log('🎬 기업심사관 홈페이지 제작 워크플로우\n');

  const stage = process.argv[3] || 'all'; // collect-info, validate, deploy, all

  console.log(`실행 단계: ${stage}\n`);

  const context = {
    stage,
    skipConfirmation: process.argv.includes('--skip-confirmation'),
  };

  // 브랜드 정보 (환경변수 또는 인자에서)
  if (process.env.BRAND_NAME && process.env.BRAND_DOMAIN) {
    context.brandInfo = {
      brandName: process.env.BRAND_NAME,
      domain: process.env.BRAND_DOMAIN,
      primaryColor: process.env.PRIMARY_COLOR || '#0f172e',
      accentColor: process.env.ACCENT_COLOR || '#d4af37',
      phone: process.env.BRAND_PHONE || '',
      email: process.env.BRAND_EMAIL || '',
      address: process.env.BRAND_ADDRESS || '',
    };
  }

  const result = await SkillEngine.execute('project-specific/fundheallab/homepage-builder-orchestrator', context);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`워크플로우 ${result.completed ? '✅ 완료' : '⚠️ 중단됨'}`);
  console.log('='.repeat(60) + '\n');

  if (result.needsConfirmation) {
    console.log('⚠️ 사용자 확인 필요\n');
    console.log(`단계: ${result.confirmationData.step}\n`);

    if (result.confirmationData.brandInfo) {
      console.log('브랜드 정보:');
      console.log(`  - 브랜드명: ${result.confirmationData.brandInfo.brandName}`);
      console.log(`  - 도메인: ${result.confirmationData.brandInfo.domain}\n`);
    }

    if (result.confirmationData.violations) {
      console.log(`위반사항: ${result.confirmationData.violations.length}개\n`);
    }

    console.log('계속 진행하려면:');
    console.log('  node .claude/cli.js build [stage] --skip-confirmation\n');
  }

  if (result.errors.length > 0) {
    console.log('❌ 오류:\n');
    result.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error.message}\n`);
    });
  }

  console.log(`\n실행 시간: ${result.timestamp}\n`);

  return result;
}

/**
 * 웹훅 생성 (기업심사관 전용)
 */
async function runWebhookGenerator() {
  console.log('📡 웹훅 스크립트 생성 (기업심사관 프로젝트 전용)\n');

  // 브랜드 정보 수집
  const brandName = process.env.BRAND_NAME || process.argv[3];
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || process.argv[4];
  const spreadsheetId = process.env.SPREADSHEET_ID || process.argv[5];

  if (!brandName || !telegramChatId) {
    console.error('❌ 브랜드명과 텔레그램 채팅 ID를 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js generate-webhook [브랜드명] [텔레그램채팅ID] [스프레드시트ID]');
    console.log('  node .claude/cli.js webhook "자금치유연구소" "-1234567890" "1abc...xyz"\n');
    console.log('또는 환경변수 사용:');
    console.log('  BRAND_NAME="브랜드명" TELEGRAM_CHAT_ID="-123" SPREADSHEET_ID="1abc" node .claude/cli.js webhook\n');
    console.log('텔레그램 봇 토큰: 7947112373:AAGXL3AO9D8jkWnFkuUmU_VQbNpvOWHZREI (고정)');
    process.exit(1);
  }

  const brandInfo = {
    brandName,
    telegramChatId,
    spreadsheetId,
    phone: process.env.BRAND_PHONE || '',
    primaryColor: process.env.PRIMARY_COLOR || '#0f172e',
    accentColor: process.env.ACCENT_COLOR || '#d4af37',
  };

  const context = {
    brandInfo,
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/webhook-generator', context);

  if (!result.success) {
    console.error(`\n❌ 웹훅 생성 실패: ${result.error}\n`);
    if (result.missingFields) {
      console.log('누락된 필드:', result.missingFields.join(', '));
    }
    process.exit(1);
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('✅ 웹훅 스크립트 생성 완료');
  console.log('='.repeat(60) + '\n');

  console.log('📋 설정 정보:\n');
  console.log(`  브랜드명: ${result.config.brand.name}`);
  console.log(`  텔레그램 봇 토큰: ${result.config.telegram.botToken}`);
  console.log(`  텔레그램 채팅 ID: ${result.config.telegram.chatId}`);
  if (result.config.spreadsheetId) {
    console.log(`  스프레드시트 ID: ${result.config.spreadsheetId}`);
  }
  console.log('');

  // 스크립트 저장
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.join(process.cwd(), 'F:', 'bas_homepage', brandInfo.brandName);
  const outputFile = path.join(outputDir, 'webhook.gs');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, result.webhookScript);

  console.log(`💾 저장 완료: ${outputFile}\n`);
  console.log('📝 다음 단계:\n');
  console.log('  1. Google Apps Script 프로젝트 생성');
  console.log('  2. webhook.gs 파일 내용 복사');
  console.log('  3. 웹 앱으로 배포 (액세스: 모든 사용자)');
  console.log('  4. 배포 URL을 입력폼에 적용\n');

  return result;
}

/**
 * 입력폼 생성 (기업심사관 전용)
 */
async function runFormGenerator() {
  console.log('📝 입력폼 생성 (기업심사관 프로젝트 전용)\n');

  // 브랜드 정보 수집
  const brandName = process.env.BRAND_NAME || process.argv[3];
  const pageType = process.env.PAGE_TYPE || process.argv[4] || 'main';
  const sectionId = process.env.SECTION_ID || process.argv[5];

  if (!brandName) {
    console.error('❌ 브랜드명을 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js generate-form [브랜드명] [페이지타입] [섹션ID]');
    console.log('  node .claude/cli.js form "자금치유연구소" main s20251017bcddee2e53649\n');
    console.log('또는 환경변수 사용:');
    console.log('  BRAND_NAME="브랜드명" PAGE_TYPE=main SECTION_ID=s123 node .claude/cli.js form\n');
    console.log('페이지 타입: main (기본), fund, pro, mkt');
    console.log('⚠️  mkt 폼: 브랜드명/전화번호만 수정, 컬러 변경 금지');
    process.exit(1);
  }

  const brandInfo = {
    brandName,
    phone: process.env.BRAND_PHONE || '1533-9510',
    primaryColor: process.env.PRIMARY_COLOR || '#0f172e',
    accentColor: process.env.ACCENT_COLOR || '#d4af37',
    webhookUrl: process.env.WEBHOOK_URL || '',
    logo: process.env.LOGO || '',
    slogan: process.env.SLOGAN || '',
  };

  const context = {
    brandInfo,
    pageType,
    sectionId,
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/form-generator', context);

  if (!result.success) {
    console.error(`\n❌ 입력폼 생성 실패: ${result.error}\n`);
    if (result.missingFields) {
      console.log('누락된 필드:', result.missingFields.join(', '));
    }
    process.exit(1);
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('✅ 입력폼 생성 완료');
  console.log('='.repeat(60) + '\n');

  console.log('📋 폼 정보:\n');
  console.log(`  브랜드명: ${result.brandInfo.brandName}`);
  console.log(`  전화번호: ${result.brandInfo.phone}`);
  console.log(`  페이지 타입: ${result.pageType}`);
  console.log(`  섹션 ID: ${result.sectionId}`);
  console.log(`  Primary 컬러: ${result.brandInfo.primaryColor}`);
  console.log(`  Accent 컬러: ${result.brandInfo.accentColor}`);
  console.log('');

  console.log('📝 적용 규칙:\n');
  console.log(`  - 브랜드 정보 업데이트: ${result.rules.brandInfoUpdate ? '✅' : '❌'}`);
  console.log(`  - 컬러 업데이트: ${result.rules.colorUpdate ? '✅' : '❌'}`);
  console.log(`  - 코드 구조 변경: ${result.rules.codeUpdate ? '✅' : '❌'}`);
  console.log(`  - ${result.rules.description}`);
  console.log('');

  // 파일 저장
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.join(process.cwd(), 'F:', 'bas_homepage', brandInfo.brandName);
  const fileName = pageType === 'mkt' ? 'mkt_form.txt' : 'main_form.txt';
  const outputFile = path.join(outputDir, fileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, result.formHtml);

  console.log(`💾 저장 완료: ${outputFile}\n`);
  console.log('📝 다음 단계:\n');
  console.log('  1. 아임웹 코드 위젯에 복사');
  console.log('  2. 미리보기로 확인');
  console.log('  3. 배포\n');

  return result;
}

/**
 * 섹션 ID 매핑 (기업심사관 전용)
 */
async function runSectionIdMapper() {
  console.log('🗺️  섹션 ID 매핑 (기업심사관 프로젝트 전용)\n');

  // 섹션 ID 수집 (환경변수 또는 파일)
  const sectionIdFile = process.argv[3];

  let sectionIds = {};

  // 파일에서 읽기
  if (sectionIdFile) {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(sectionIdFile)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${sectionIdFile}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(sectionIdFile, 'utf-8');
    try {
      sectionIds = JSON.parse(fileContent);
    } catch (error) {
      console.error('❌ JSON 파싱 실패. 파일 형식을 확인하세요.');
      console.log('\n예시 JSON 형식:');
      console.log(`{
  "main_header": "s20251017bcddee2e53649",
  "main_footer": "s20251017bcddee2e53650",
  "home_hero": "s20251017bcddee2e53651",
  "company_about": "s20251017bcddee2e53652"
}`);
      process.exit(1);
    }
  } else {
    // 환경변수에서 읽기
    const envSectionIds = process.env.SECTION_IDS;
    if (envSectionIds) {
      try {
        sectionIds = JSON.parse(envSectionIds);
      } catch (error) {
        console.error('❌ SECTION_IDS 환경변수 파싱 실패');
        process.exit(1);
      }
    } else {
      console.error('❌ 섹션 ID를 입력하세요.');
      console.log('\n사용법:');
      console.log('  node .claude/cli.js map-section-ids [섹션ID파일.json]');
      console.log('  node .claude/cli.js map-ids section-ids.json\n');
      console.log('또는 환경변수 사용:');
      console.log('  SECTION_IDS=\'{"main_header":"s123",...}\' node .claude/cli.js map-ids\n');
      console.log('예시 JSON 파일 (section-ids.json):');
      console.log(`{
  "main_header": "s20251017bcddee2e53649",
  "main_footer": "s20251017bcddee2e53650",
  "home_hero": "s20251017bcddee2e53651",
  "company_about": "s20251017bcddee2e53652",
  "fund_form": "s20251017bcddee2e53653",
  "mkt_form": "s20251017bcddee2e53654"
}`);
      process.exit(1);
    }
  }

  const context = {
    sectionIds,
    brandInfo: {
      brandName: process.env.BRAND_NAME || '',
    },
    project: '기업심사관',
  };

  const result = await SkillEngine.execute('project-specific/fundheallab/section-id-mapper', context);

  if (!result.success) {
    console.error(`\n❌ 섹션 ID 매핑 실패: ${result.error}\n`);
    if (result.hint) {
      console.log(`💡 힌트: ${result.hint}`);
    }
    if (result.example) {
      console.log('\n예시:');
      console.log(JSON.stringify(result.example, null, 2));
    }
    process.exit(1);
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('✅ 섹션 ID 매핑 완료');
  console.log('='.repeat(60) + '\n');

  // 매핑 테이블 출력
  const skill = require('./skills/project-specific/fundheallab/section-id-mapper');
  skill.printMappingTable(result.mapping);

  console.log('📊 통계:\n');
  console.log(`  총 섹션: ${result.summary.totalSections}개`);
  console.log(`  공통 컴포넌트: ${result.summary.commonComponents}개`);
  console.log(`  페이지 컴포넌트: ${result.summary.pageComponents}개`);
  console.log('');

  if (result.validation.warnings.length > 0) {
    console.log('⚠️  경고:\n');
    result.validation.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w}`);
    });
    console.log('');
  }

  if (result.validation.errors.length > 0) {
    console.log('❌ 오류:\n');
    result.validation.errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e}`);
    });
    console.log('');
  }

  // 마크다운 테이블 생성
  const markdownTable = skill.generateMarkdownTable(result.mapping);

  // 파일 저장
  const fs = require('fs');
  const path = require('path');
  const outputFile = path.join(process.cwd(), 'section-id-mapping.md');

  fs.writeFileSync(outputFile, markdownTable);

  console.log(`💾 매핑 테이블 저장: ${outputFile}\n`);
  console.log('📝 이 테이블을 DESIGN_CONCEPT.md에 추가하세요.\n');

  return result;
}

/**
 * UX Writing 검증 (집첵 전용)
 */
async function runUXValidator() {
  console.log('✍️  UX Writing 검증 (집첵 프로젝트 전용)\n');

  // 검증할 텍스트 (CLI 인자에서 가져오기)
  const text = process.argv[3];

  if (!text) {
    console.error('❌ 검증할 텍스트를 입력하세요.');
    console.log('\n사용법:');
    console.log('  node .claude/cli.js validate-ux "검증할 텍스트"');
    console.log('  node .claude/cli.js ux "저장했어요"');
    process.exit(1);
  }

  const context = {
    text,
    project: '집첵',
  };

  const result = await SkillEngine.execute('quality/ux-writing-validator', context);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log(`점수: ${result.score}/100 ${result.valid ? '✅' : '⚠️'}`);
  console.log('='.repeat(60) + '\n');

  if (result.violations.length > 0) {
    console.log('❌ 위반사항:\n');
    result.violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.rule} (${v.severity})`);
      console.log(`   ${v.message}`);
      if (v.examples) {
        v.examples.forEach(ex => console.log(`   ${ex}`));
      }
      console.log('');
    });
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  경고:\n');
    result.warnings.forEach((w, i) => {
      console.log(`${i + 1}. ${w.rule}: ${w.message}`);
    });
    console.log('');
  }

  if (result.suggestions.length > 0) {
    console.log('💡 제안:\n');
    result.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. ${s.rule}: ${s.message}`);
      if (s.example) {
        console.log(`   Before: ${s.example.before}`);
        console.log(`   After: ${s.example.after}`);
      }
      console.log('');
    });
  }

  console.log('📊 통계:');
  console.log(`   길이: ${result.stats.totalLength}자`);
  console.log(`   문장: ${result.stats.sentences}개`);
  console.log(`   위반: ${result.stats.violations}개`);
  console.log(`   경고: ${result.stats.warnings}개\n`);

  return result;
}

/**
 * 컨텍스트 수집
 */
async function collectContext() {
  const context = {
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
  };

  // Git 정보
  try {
    // 수정된 파일 목록
    const modifiedFiles = execSync('git diff --name-only HEAD', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    // Git diff
    const gitDiff = execSync('git diff HEAD', { encoding: 'utf-8' });

    context.git = {
      modifiedFiles,
      diff: gitDiff,
    };

    context.modifiedFiles = modifiedFiles; // 별칭
    context.gitDiff = gitDiff; // 별칭
  } catch (error) {
    console.warn('⚠️  Git 정보 수집 실패 (Git 저장소가 아닐 수 있음)');
    context.git = {
      modifiedFiles: [],
      diff: '',
    };
    context.modifiedFiles = [];
    context.gitDiff = '';
  }

  // 대화 내용 (환경변수 또는 인자로 전달)
  context.conversation = process.env.CLAUDE_CONVERSATION || '';

  // CLI 인자
  const args = process.argv.slice(3);
  if (args.length > 0) {
    context.args = args;
    // 첫 번째 인자를 대화 내용으로 간주
    if (!context.conversation && args[0]) {
      context.conversation = args[0];
    }
  }

  return context;
}

/**
 * 결과 저장
 */
function saveResults(workflowType, results) {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${workflowType}-${timestamp}.json`;
  const filePath = path.join(resultsDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`\n📁 결과 저장: ${filePath}`);
}

/**
 * 사용 가능한 Skill 목록
 */
async function listSkills() {
  console.log('📋 사용 가능한 Skill:\n');

  const skills = await SkillEngine.listSkills();

  skills.forEach((skillPath, index) => {
    console.log(`${index + 1}. ${skillPath}`);
  });

  console.log(`\n총 ${skills.length}개의 Skill\n`);
}

/**
 * 워크플로우 목록
 */
function listWorkflows() {
  SkillOrchestrator.listWorkflows();
}

/**
 * 도움말
 */
function showHelp() {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│                   Claude Skill CLI v1.0                     │
└─────────────────────────────────────────────────────────────┘

사용법:
  node .claude/cli.js <command> [conversation]

워크플로우 명령어:
  troubleshooting, ts      트러블슈팅 워크플로우 실행
  feature, feat            기능개발 워크플로우 실행
  architecture, arch       아키텍처 워크플로우 실행
  conversation, conv       대화기록 워크플로우 실행

Skill 명령어:
  metadata                 메타데이터 생성 Skill 실행
  obsidian                 Obsidian 문서 생성 Skill 실행

집첵 전용:
  validate-ux, ux          UX Writing 검증 (토스 스타일)

기업심사관 전용 - 검증:
  validate-subdomain, subdomain   서브도메인 규칙 검증
  validate-design, design         디자인 규칙 검증
  validate-section-id, section-id 섹션 ID 규칙 검증
  validate-component, component   컴포넌트 규칙 검증 (Header/Footer/Form)
  validate-text, text             텍스트 재작성 규칙 검증

기업심사관 전용 - 워크플로우:
  build-homepage, build           전체 홈페이지 제작 워크플로우
  collect-brand-info, brand       브랜드 정보 수집 및 DESIGN_CONCEPT.md 생성

기업심사관 전용 - 생성 도구:
  generate-webhook, webhook       Google Apps Script 웹훅 생성 (텔레그램 연동)
  generate-form, form             입력폼 생성 (브랜드별 커스터마이징)
  map-section-ids, map-ids        섹션 ID 매핑 (txt 파일명 ↔ 섹션 ID)

유틸리티:
  list                     사용 가능한 Skill 목록
  workflows                워크플로우 목록
  help                     이 도움말 표시

예시:
  # 트러블슈팅 워크플로우 실행
  node .claude/cli.js ts "관리자 403 에러 해결"

  # 집첵 UX Writing 검증
  node .claude/cli.js ux "저장했어요"
  node .claude/cli.js validate-ux "당신의 집을 확인하세요"

  # 기업심사관 디자인 규칙 검증
  node .claude/cli.js subdomain example.com src/pages/index.tsx
  node .claude/cli.js design src/styles/components.css
  node .claude/cli.js section-id src/pages/home.tsx home
  node .claude/cli.js component main_header.txt header
  node .claude/cli.js text original.txt rewritten.txt hero

  # 기업심사관 홈페이지 제작 워크플로우
  node .claude/cli.js brand "자금치유연구소" "fundheallab.com"
  node .claude/cli.js build all

  # 기업심사관 생성 도구
  node .claude/cli.js webhook "자금치유연구소" "-1234567890" "1abc...xyz"
  node .claude/cli.js form "자금치유연구소" main s20251017bcddee2e53649
  node .claude/cli.js map-ids section-ids.json

  # 기능개발 워크플로우 실행
  node .claude/cli.js feat "이미지 업로드 기능 추가"

  # 개별 Skill 실행
  node .claude/cli.js metadata

  # Skill 목록 확인
  node .claude/cli.js list

환경변수:
  CLAUDE_CONVERSATION      대화 내용 (인자 대신 사용 가능)

`);
}

/**
 * 메인 실행
 */
async function main() {
  const command = process.argv[2];

  if (!command) {
    showHelp();
    process.exit(0);
  }

  const handler = COMMANDS[command];

  if (!handler) {
    console.error(`❌ 알 수 없는 명령어: ${command}\n`);
    showHelp();
    process.exit(1);
  }

  try {
    await handler();
  } catch (error) {
    console.error(`\n❌ 오류 발생: ${error.message}\n`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// CLI 실행
if (require.main === module) {
  main();
}

module.exports = {
  runWorkflow,
  runSkill,
  collectContext,
};
