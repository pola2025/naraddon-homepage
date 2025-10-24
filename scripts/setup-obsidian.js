/**
 * Obsidian 플러그인 자동 설정 스크립트
 * @purpose 수동 클릭 없이 모든 플러그인 설정 자동화
 * @usage node scripts/setup-obsidian.js
 */

const fs = require('fs');
const path = require('path');

// 설정 로드
const obsidianConfig = require('../.claude/obsidian-config.json');
const VAULT_PATH = obsidianConfig.vaultPath;
const CONFIG_BASE = path.join(VAULT_PATH, '.obsidian', 'plugins');

console.log(`📂 Vault 경로: ${VAULT_PATH}\n`);

// ===== Dataview 설정 =====
const dataviewConfig = {
  renderNullAs: "\\-",
  taskCompletionTracking: true,
  taskCompletionUseEmojiShorthand: false,
  taskCompletionText: "completion",
  taskCompletionDateFormat: "yyyy-MM-dd",
  recursiveSubTaskCompletion: false,
  warnOnEmptyResult: true,
  refreshEnabled: true,
  refreshInterval: 2500,
  defaultDateFormat: "YYYY-MM-DD",
  defaultDateTimeFormat: "YYYY-MM-DD HH:mm",
  maxRecursiveRenderDepth: 4,
  tableIdColumnName: "File",
  tableGroupColumnName: "Group",

  // ✨ 가장 중요한 설정들!
  enableJsQueries: true,           // JavaScript 쿼리
  enableInlineJsQueries: true,     // Inline JS 쿼리
  enableInlineQueries: true,       // Inline 쿼리
  enableDataviewJs: true,          // DataviewJS

  // 인라인 필드 하이라이팅
  inlineQueryPrefix: "=",
  inlineJsQueryPrefix: "$=",

  // 코드블록 설정
  dataviewJsKeyword: "dataviewjs",
};

// ===== Templater 설정 =====
const templaterConfig = {
  command_timeout: 5,
  empty_file_template: "",
  enable_ribbon_icon: true,
  enable_system_commands: false,  // 보안상 OFF

  // ✨ 템플릿 폴더
  templates_folder: ".claude/templates",

  // ✨ 자동 트리거 (가장 중요!)
  trigger_on_file_creation: true,

  // ✨ 폴더별 템플릿 자동 매핑
  folder_templates: [
    {
      folder: "Projects/나라똔/05-트러블슈팅",
      template: ".claude/templates/troubleshooting-template.md"
    },
    {
      folder: "Projects/나라똔/03-기능개발",
      template: ".claude/templates/feature-template.md"
    },
    {
      folder: "Projects/나라똔/99-대화기록",
      template: ".claude/templates/conversation-template.md"
    },
    {
      folder: "Projects/나라똔/01-아키텍처",
      template: ".claude/templates/architecture-template.md"
    },
    {
      folder: "Projects/나라똔/02-스키마",
      template: ".claude/templates/schema-template.md"
    },
  ],

  // 구문 강조
  syntax_highlighting: true,
  syntax_highlighting_mobile: false,

  // 자동 커서 이동
  auto_jump_to_cursor: false,
};

// ===== 함수들 =====

/**
 * 플러그인 설정 저장
 */
function savePluginConfig(pluginName, config) {
  const configPath = path.join(CONFIG_BASE, pluginName, 'data.json');

  // 플러그인 폴더 확인
  const pluginDir = path.dirname(configPath);
  if (!fs.existsSync(pluginDir)) {
    console.log(`⚠️  ${pluginName} 플러그인이 설치되지 않았습니다.`);
    console.log(`   먼저 Obsidian에서 플러그인을 설치하세요.`);
    return false;
  }

  // 기존 설정 백업
  if (fs.existsSync(configPath)) {
    const backupPath = `${configPath}.backup-${Date.now()}`;
    fs.copyFileSync(configPath, backupPath);
    console.log(`   📦 백업: ${path.basename(backupPath)}`);
  }

  // 새 설정 저장
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`   ✅ ${pluginName} 설정 완료`);

  return true;
}

/**
 * 템플릿 파일 생성
 */
function createTemplateFiles() {
  const templateDir = path.join(VAULT_PATH, '.claude', 'templates');

  // 폴더 생성
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
    console.log(`   📁 템플릿 폴더 생성: .claude/templates`);
  }

  const templates = {
    'troubleshooting-template.md': getTroubleshootingTemplate(),
    'feature-template.md': getFeatureTemplate(),
    'conversation-template.md': getConversationTemplate(),
    'architecture-template.md': getArchitectureTemplate(),
    'schema-template.md': getSchemaTemplate(),
  };

  let created = 0;
  for (const [filename, content] of Object.entries(templates)) {
    const filePath = path.join(templateDir, filename);

    // 기존 파일이 있으면 건너뛰기 (덮어쓰지 않음)
    if (fs.existsSync(filePath)) {
      console.log(`   ⏭️  ${filename} (이미 존재)`);
      continue;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`   ✅ ${filename}`);
    created++;
  }

  return created;
}

/**
 * 설정 검증
 */
function validateConfig() {
  console.log('🔍 설정 검증 중...\n');

  const checks = [];

  // Dataview 검증
  const dataviewPath = path.join(CONFIG_BASE, 'dataview', 'data.json');
  if (fs.existsSync(dataviewPath)) {
    const dataview = JSON.parse(fs.readFileSync(dataviewPath, 'utf-8'));
    checks.push({
      plugin: 'Dataview',
      check: 'JavaScript 쿼리',
      passed: dataview.enableJsQueries === true,
    });
    checks.push({
      plugin: 'Dataview',
      check: 'Inline JS 쿼리',
      passed: dataview.enableInlineJsQueries === true,
    });
    checks.push({
      plugin: 'Dataview',
      check: '날짜 형식',
      passed: dataview.defaultDateFormat === 'YYYY-MM-DD',
    });
  }

  // Templater 검증
  const templaterPath = path.join(CONFIG_BASE, 'templater-obsidian', 'data.json');
  if (fs.existsSync(templaterPath)) {
    const templater = JSON.parse(fs.readFileSync(templaterPath, 'utf-8'));
    checks.push({
      plugin: 'Templater',
      check: '자동 트리거',
      passed: templater.trigger_on_file_creation === true,
    });
    checks.push({
      plugin: 'Templater',
      check: '템플릿 폴더',
      passed: templater.templates_folder === '.claude/templates',
    });
    checks.push({
      plugin: 'Templater',
      check: '폴더 템플릿',
      passed: templater.folder_templates?.length >= 3,
    });
  }

  // 템플릿 파일 검증
  const templateDir = path.join(VAULT_PATH, '.claude', 'templates');
  const requiredTemplates = [
    'troubleshooting-template.md',
    'feature-template.md',
    'conversation-template.md',
  ];

  requiredTemplates.forEach(filename => {
    checks.push({
      plugin: '템플릿',
      check: filename,
      passed: fs.existsSync(path.join(templateDir, filename)),
    });
  });

  // 결과 출력
  console.log('📊 검증 결과:\n');
  checks.forEach(({ plugin, check, passed }) => {
    console.log(`   ${passed ? '✅' : '❌'} ${plugin} - ${check}`);
  });

  const allPassed = checks.every(c => c.passed);
  console.log(`\n${allPassed ? '✅' : '⚠️ '} 전체 검증 ${allPassed ? '통과' : '일부 실패'}\n`);

  return allPassed;
}

// ===== 템플릿 내용 =====

function getTroubleshootingTemplate() {
  return `---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
프로젝트코드: NRDN
카테고리: 트러블슈팅
발생기능: <% tp.system.prompt("발생 기능?") %>
기능모듈: <% tp.system.prompt("기능 모듈? (예: 관리자/인증)") %>
에러타입: <% tp.system.prompt("에러 타입? (예: 403에러)") %>
근본원인: <% tp.system.prompt("근본 원인?") %>
심각도: <% tp.system.suggester(["Low", "Medium", "High", "Critical"], ["Low", "Medium", "High", "Critical"]) %>
해결여부: 진행중
발생일시: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags:
  - 프로젝트/나라똔
  - 작업유형/트러블슈팅
  - 심각도/
---

#나라똔 #트러블슈팅

# <% tp.file.title %>

## 📋 문제 요약
- **발생 위치**:
- **에러 타입**:
- **근본 원인**:

## 🔍 상세 상황

### 어떤 문제가 발생했는가?
<% tp.file.cursor() %>

### 에러 메시지
\`\`\`
<!-- 에러 로그 -->
\`\`\`

### 어떤 환경에서 발생했는가?
- **브라우저**:
- **OS**:
- **관련 파일**:

## 💡 원인 분석

### 왜 이 문제가 발생했는가?

### 어떤 영향이 있었는가?

## 🛠️ 해결 과정

### 무엇을 시도했는가?
1. **시도 1** - ❌ 실패
   -

2. **최종 해결** - ✅ 성공
   -

### 최종 해결 방법
\`\`\`typescript
// 해결 코드
\`\`\`

## 🚀 재발 방지

### 어떻게 예방할 것인가?
- [ ]

### 모니터링 방안

## 🔗 관련 문서

## 📚 학습 내용

---

발생일시:: <% tp.date.now("YYYY-MM-DD HH:mm") %>
해결일시::
소요시간::
최초발견자::
해결자:: Claude
재발가능성::
`;
}

function getFeatureTemplate() {
  return `---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
프로젝트코드: NRDN
카테고리: 기능개발
기능범주: <% tp.system.prompt("기능 범주? (예: 심사관관리)") %>
기능모듈: <% tp.system.prompt("기능 모듈? (예: 심사관/이미지업로드)") %>
상태: 개발중
tags:
  - 프로젝트/나라똔
  - 작업유형/신규기능
  - 상태/개발중
---

#나라똔 #신규기능

# <% tp.file.title %>

## 📋 기능 요약
- **무엇을 만들었는가**:
- **왜 필요한가**:
- **어떻게 동작하는가**:

## 💻 구현 상세

### 주요 파일
- \`\`:

### 핵심 코드

#### 1.
\`\`\`typescript
<% tp.file.cursor() %>
\`\`\`

### API 엔드포인트
- **POST /api/**
  - Request:
  - Response:

## 🧪 테스트

### 테스트 시나리오
1. **정상 케이스**
   - [ ]

2. **에러 케이스**
   - [ ]

### 테스트 결과
- [ ] 단위 테스트: 통과
- [ ] 통합 테스트: 통과
- [ ] E2E 테스트: 통과

## 🔗 관련 문서

## 📝 후속 작업
- [ ]

---

개발시작:: <% tp.date.now("YYYY-MM-DD HH:mm") %>
개발완료::
소요시간::
코드리뷰::
배포일시::
`;
}

function getConversationTemplate() {
  return `---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
카테고리: 대화기록
대화유형: <% tp.system.suggester(["시스템설계", "기능개발", "트러블슈팅", "문서화"], ["시스템설계", "기능개발", "트러블슈팅", "문서화"]) %>
참여자:
  - 사용자
  - Claude
주요성과: <% tp.system.prompt("주요 성과 한 줄 요약?") %>
tags:
  - 프로젝트/나라똔
  - 작업유형/대화기록
---

#나라똔 #대화기록

# <% tp.file.title %>

## 📅 대화 개요
- **날짜**: <% tp.date.now("YYYY-MM-DD") %>
- **대화 유형**:
- **주요 성과**:

## 🎯 대화 흐름

### Phase 1:
<% tp.file.cursor() %>

### Phase 2:

## 💡 주요 결정사항

## 🛠️ 생성된 파일

## 📊 성과 지표

## 💬 핵심 인사이트

---

대화시작:: <% tp.date.now("YYYY-MM-DD HH:mm") %>
대화종료::
소요시간::
생성문서수::
`;
}

function getArchitectureTemplate() {
  return `---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
카테고리: 아키텍처
시스템: <% tp.system.prompt("시스템/모듈명?") %>
tags:
  - 프로젝트/나라똔
  - 작업유형/아키텍처
---

#나라똔 #아키텍처

# <% tp.file.title %>

## 📋 아키텍처 개요

## 🏗️ 시스템 구조

## 💾 데이터 흐름

## 🔗 통합 방식

## 📊 다이어그램

---

작성일:: <% tp.date.now("YYYY-MM-DD HH:mm") %>
`;
}

function getSchemaTemplate() {
  return `---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
카테고리: 스키마
컬렉션: <% tp.system.prompt("컬렉션/테이블명?") %>
tags:
  - 프로젝트/나라똔
  - 작업유형/스키마
---

#나라똔 #스키마

# <% tp.file.title %>

## 📋 스키마 정의

## 💾 필드 설명

## 🔗 관계

## 📊 인덱스

---

작성일:: <% tp.date.now("YYYY-MM-DD HH:mm") %>
`;
}

// ===== 메인 실행 =====

async function main() {
  console.log('🚀 Obsidian 자동 설정 시작...\n');

  // Vault 경로 확인
  if (!fs.existsSync(VAULT_PATH)) {
    console.error(`❌ Vault 경로를 찾을 수 없습니다: ${VAULT_PATH}`);
    console.error(`   .claude/obsidian-config.json 파일을 확인하세요.`);
    process.exit(1);
  }

  // 플러그인 설정
  console.log('⚙️  플러그인 설정 중...\n');

  const dataviewOk = savePluginConfig('dataview', dataviewConfig);
  const templaterOk = savePluginConfig('templater-obsidian', templaterConfig);

  if (!dataviewOk || !templaterOk) {
    console.log('\n⚠️  일부 플러그인이 설치되지 않았습니다.');
    console.log('   Obsidian에서 먼저 플러그인을 설치하세요:');
    if (!dataviewOk) console.log('   - Dataview');
    if (!templaterOk) console.log('   - Templater');
    console.log('');
  }

  // 템플릿 생성
  console.log('\n📝 템플릿 파일 생성 중...\n');
  const created = createTemplateFiles();
  console.log(`\n   총 ${created}개 템플릿 생성됨`);

  // 검증
  console.log('');
  const isValid = validateConfig();

  if (isValid) {
    console.log('🎉 모든 설정 완료!\n');
    console.log('⚠️  중요: Obsidian을 재시작하세요.');
    console.log('   Settings → Reload app without saving');
  } else {
    console.log('⚠️  일부 설정이 완료되지 않았습니다.');
    console.log('   위의 ❌ 항목을 수동으로 확인하세요.');
  }
}

main().catch(error => {
  console.error('\n❌ 오류 발생:', error.message);
  process.exit(1);
});
