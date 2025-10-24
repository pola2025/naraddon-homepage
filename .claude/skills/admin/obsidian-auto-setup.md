# Skill: Obsidian Auto Setup

## 🎯 목적
Obsidian 플러그인 설정을 자동으로 구성합니다.

## 📋 실행 시점
- 프로젝트 최초 설정 시
- 새 프로젝트 시작 시
- 플러그인 설정 초기화 필요 시

## 🔧 실행 워크플로우

### Phase 1: 설정 파일 경로 확인
```javascript
const VAULT_PATH = 'F:/obsidian/Pola';
const CONFIG_BASE = `${VAULT_PATH}/.obsidian/plugins`;

const pluginConfigs = {
  dataview: `${CONFIG_BASE}/dataview/data.json`,
  templater: `${CONFIG_BASE}/templater-obsidian/data.json`,
  calendar: `${CONFIG_BASE}/calendar/data.json`,
};
```

### Phase 2: Dataview 자동 설정
```javascript
/**
 * Dataview 플러그인 최적 설정
 * @critical enableJsQueries, enableInlineJsQueries 필수!
 */
const dataviewConfig = {
  // ✨ JavaScript 활성화 (가장 중요!)
  enableJsQueries: true,
  enableInlineJsQueries: true,
  enableInlineQueries: true,

  // 날짜 형식 (우리 시스템)
  defaultDateFormat: "YYYY-MM-DD",
  defaultDateTimeFormat: "YYYY-MM-DD HH:mm",

  // 테이블 설정
  tableIdColumnName: "File",
  tableGroupColumnName: "Group",

  // 뷰 설정
  warnOnEmptyResult: true,
  refreshEnabled: true,
  refreshInterval: 2500,

  // 기타
  renderNullAs: "\\-",
  maxRecursiveRenderDepth: 4,
};
```

### Phase 3: Templater 자동 설정
```javascript
/**
 * Templater 플러그인 최적 설정
 * @critical trigger_on_file_creation, folder_templates 필수!
 */
const templaterConfig = {
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

  // 기타
  enable_ribbon_icon: true,
  enable_system_commands: false,
  command_timeout: 5,
  empty_file_template: "",
};
```

### Phase 4: 설정 파일 저장
```javascript
/**
 * 플러그인 설정 파일 저장
 */
async function savePluginConfig(pluginName, config) {
  const configPath = path.join(
    VAULT_PATH,
    '.obsidian/plugins',
    pluginName,
    'data.json'
  );

  // 1. 기존 설정 백업
  if (fs.existsSync(configPath)) {
    const backup = `${configPath}.backup-${Date.now()}`;
    fs.copyFileSync(configPath, backup);
    console.log(`📦 기존 설정 백업: ${backup}`);
  }

  // 2. 새 설정 저장
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ ${pluginName} 설정 완료`);
}
```

### Phase 5: 템플릿 파일 자동 생성
```javascript
/**
 * 템플릿 파일들 자동 생성
 */
async function createTemplateFiles() {
  const templates = {
    'troubleshooting-template.md': TROUBLESHOOTING_TEMPLATE,
    'feature-template.md': FEATURE_TEMPLATE,
    'conversation-template.md': CONVERSATION_TEMPLATE,
    'architecture-template.md': ARCHITECTURE_TEMPLATE,
    'schema-template.md': SCHEMA_TEMPLATE,
  };

  const templateDir = path.join(VAULT_PATH, '.claude/templates');

  // 폴더 생성
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // 템플릿 파일 생성
  for (const [filename, content] of Object.entries(templates)) {
    const filePath = path.join(templateDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ 템플릿 생성: ${filename}`);
  }
}

// 템플릿 내용 (상수로 정의)
const TROUBLESHOOTING_TEMPLATE = `---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
프로젝트코드: NRDN
카테고리: 트러블슈팅
발생기능: <% tp.system.prompt("발생 기능?") %>
기능모듈: <% tp.system.prompt("기능 모듈? (예: 관리자/인증)") %>
에러타입: <% tp.system.prompt("에러 타입?") %>
근본원인: <% tp.system.prompt("근본 원인?") %>
심각도: <% tp.system.suggester(["Low", "Medium", "High", "Critical"], ["Low", "Medium", "High", "Critical"]) %>
해결여부: 진행중
tags:
  - 프로젝트/나라똔
  - 작업유형/트러블슈팅
---

#나라똔 #트러블슈팅

# <% tp.file.title %>

## 📋 문제 요약

## 🔍 상세 상황
<% tp.file.cursor() %>

## 💡 원인 분석

## 🛠️ 해결 과정

## 🚀 재발 방지

## 🔗 관련 문서

---

발생일시:: <% tp.date.now("YYYY-MM-DD HH:mm") %>
`;
```

### Phase 6: Local REST API로 원격 설정
```javascript
/**
 * Obsidian REST API를 통한 설정
 * @context Obsidian이 실행 중일 때 사용
 */
async function configureViaAPI() {
  const apiUrl = 'http://127.0.0.1:27123';
  const token = process.env.OBSIDIAN_API_TOKEN;

  // Dataview 설정 업데이트
  await fetch(`${apiUrl}/vault/.obsidian/plugins/dataview/data.json`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataviewConfig),
  });

  console.log('✅ Dataview 설정 완료 (API)');

  // Templater 설정 업데이트
  await fetch(`${apiUrl}/vault/.obsidian/plugins/templater-obsidian/data.json`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templaterConfig),
  });

  console.log('✅ Templater 설정 완료 (API)');
}
```

### Phase 7: 설정 검증
```javascript
/**
 * 설정이 올바르게 적용되었는지 검증
 */
async function validateConfig() {
  const checks = [];

  // Dataview 검증
  const dataview = JSON.parse(
    fs.readFileSync(`${CONFIG_BASE}/dataview/data.json`)
  );
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

  // Templater 검증
  const templater = JSON.parse(
    fs.readFileSync(`${CONFIG_BASE}/templater-obsidian/data.json`)
  );
  checks.push({
    plugin: 'Templater',
    check: '자동 트리거',
    passed: templater.trigger_on_file_creation === true,
  });
  checks.push({
    plugin: 'Templater',
    check: '폴더 템플릿',
    passed: templater.folder_templates?.length >= 3,
  });

  // 결과 출력
  console.log('\n📊 설정 검증 결과:\n');
  checks.forEach(({ plugin, check, passed }) => {
    console.log(`${passed ? '✅' : '❌'} ${plugin} - ${check}`);
  });

  return checks.every(c => c.passed);
}
```

## 🎬 Claude 실행 단계

**사용자가 "옵시디언 자동 설정해줘" 라고 하면:**

1. **설정 백업**
   ```bash
   cp F:/obsidian/Pola/.obsidian/plugins/dataview/data.json \
      F:/obsidian/Pola/.obsidian/plugins/dataview/data.json.backup
   ```

2. **설정 파일 생성**
   - Dataview: `enableJsQueries: true` 등
   - Templater: `trigger_on_file_creation: true` 등

3. **템플릿 파일 생성**
   - `.claude/templates/troubleshooting-template.md`
   - `.claude/templates/feature-template.md`
   - (5개 생성)

4. **설정 검증**
   - 모든 필수 설정 확인
   - 템플릿 파일 존재 확인

5. **사용자에게 리포트**
   ```markdown
   ✅ Obsidian 자동 설정 완료!

   설정된 플러그인:
   ✅ Dataview
      - JavaScript 쿼리: ON
      - Inline JS 쿼리: ON
      - 날짜 형식: YYYY-MM-DD

   ✅ Templater
      - 자동 트리거: ON
      - 템플릿 폴더: .claude/templates
      - 폴더 템플릿: 5개 설정

   생성된 템플릿:
   ✅ troubleshooting-template.md
   ✅ feature-template.md
   ✅ conversation-template.md
   ✅ architecture-template.md
   ✅ schema-template.md

   ⚠️ Obsidian을 재시작하세요!
   ```

## 📝 스크립트 생성

Claude가 자동으로 실행 스크립트 생성:

```javascript
// scripts/setup-obsidian.js
const fs = require('fs');
const path = require('path');

const config = require('../.claude/obsidian-config.json');
const VAULT_PATH = config.vaultPath;

// ... (위의 모든 함수들)

async function main() {
  console.log('🚀 Obsidian 자동 설정 시작...\n');

  // 1. 설정 백업
  console.log('📦 기존 설정 백업 중...');
  // ...

  // 2. 플러그인 설정
  console.log('⚙️  플러그인 설정 중...');
  savePluginConfig('dataview', dataviewConfig);
  savePluginConfig('templater-obsidian', templaterConfig);

  // 3. 템플릿 생성
  console.log('\n📝 템플릿 파일 생성 중...');
  createTemplateFiles();

  // 4. 검증
  console.log('\n🔍 설정 검증 중...');
  const isValid = await validateConfig();

  if (isValid) {
    console.log('\n🎉 모든 설정 완료!');
    console.log('⚠️  Obsidian을 재시작하세요.');
  } else {
    console.log('\n⚠️  일부 설정 실패. 수동 확인 필요.');
  }
}

main().catch(console.error);
```

**실행:**
```bash
node scripts/setup-obsidian.js
```

## ✅ 성공 기준

- [ ] Dataview JavaScript 쿼리 활성화
- [ ] Templater 자동 트리거 활성화
- [ ] 5개 템플릿 파일 생성
- [ ] 폴더별 템플릿 매핑 완료
- [ ] 설정 검증 통과

## 🔗 연동 Skills

- `auto-backup`: 설정 변경 전 백업
- `obsidian-auto-doc`: 설정 완료 후 문서 생성 테스트

---

**이 Skill로 1분 안에 모든 설정 완료!**
**수동 클릭 0번!**
