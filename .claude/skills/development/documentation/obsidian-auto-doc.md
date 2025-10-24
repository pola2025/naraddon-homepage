# Skill: Obsidian Auto Doc (REST API 버전)

## 🎯 목적
Claude 작업 완료 시 **자동으로** Obsidian에 문서를 생성합니다.
Templater 없이 REST API로 직접 생성하여 100% 자동화합니다.

## 📋 실행 시점
- **트러블슈팅 해결 완료 시** (자동)
- **기능 개발 완료 시** (자동)
- **대화 종료 시** (자동)
- **Git commit 후** (선택)

## 🔧 실행 워크플로우

### Phase 1: 메타데이터 수집
```javascript
/**
 * metadata-auto-generator Skill 결과 사용
 * @context 대화 분석으로 80% 자동 생성됨
 */
const metadata = await metadataAutoGenerator.generate();
// {
//   title: "관리자인증-403에러-JWT콜백미조회",
//   프로젝트: "나라똔",
//   카테고리: "트러블슈팅",
//   발생기능: "관리자인증",
//   에러타입: "403에러",
//   ...
// }
```

### Phase 2: 문서 내용 생성
```javascript
/**
 * 대화 내용 기반으로 문서 본문 작성
 * @context 코드 변경, 에러 메시지, 해결 과정 등
 */
function generateDocumentContent(conversationHistory, metadata) {
  const { 카테고리 } = metadata;

  if (카테고리 === '트러블슈팅') {
    return generateTroubleshootingContent(conversationHistory, metadata);
  } else if (카테고리 === '기능개발') {
    return generateFeatureContent(conversationHistory, metadata);
  } else if (카테고리 === '대화기록') {
    return generateConversationContent(conversationHistory, metadata);
  }
}

/**
 * 트러블슈팅 본문 생성
 */
function generateTroubleshootingContent(history, metadata) {
  // 대화에서 자동 추출
  const 에러메시지 = extractErrorMessage(history);
  const 해결코드 = extractSolutionCode(history);
  const 시도한방법 = extractAttempts(history);

  return `
## 📋 문제 요약
- **발생 위치**: ${metadata.발생위치}
- **에러 타입**: ${metadata.에러타입}
- **근본 원인**: ${metadata.근본원인}

## 🔍 상세 상황

### 어떤 문제가 발생했는가?
${metadata.문제설명}

### 에러 메시지
\`\`\`
${에러메시지}
\`\`\`

## 💡 원인 분석
${metadata.원인분석}

## 🛠️ 해결 과정

${시도한방법.map((attempt, i) =>
  `### 시도 ${i+1}: ${attempt.method}
${attempt.success ? '✅ 성공' : '❌ 실패'} - ${attempt.reason}
`).join('\n')}

### 최종 해결 방법
\`\`\`typescript
${해결코드}
\`\`\`

## 🚀 재발 방지
${metadata.재발방지}

## 🔗 관련 문서
${metadata.관련문서.map(d => `- [[${d}]]`).join('\n')}
`;
}
```

### Phase 3: 완전한 문서 조립
```javascript
/**
 * YAML + 해시태그 + 본문 + 인라인 메타데이터
 */
function assembleDocument(metadata, content) {
  let doc = '';

  // 1. YAML Front Matter
  doc += '---\n';
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      doc += `${key}:\n${value.map(v => `  - ${v}`).join('\n')}\n`;
    } else {
      doc += `${key}: ${value}\n`;
    }
  }
  doc += '---\n\n';

  // 2. 해시태그 라인
  const hashtags = metadata.tags
    .map(tag => '#' + tag.split('/').pop())
    .join(' ');
  doc += `${hashtags}\n\n`;

  // 3. 제목
  doc += `# ${metadata.title}\n\n`;

  // 4. 본문
  doc += content;

  // 5. 인라인 메타데이터 (Dataview용)
  doc += '\n\n---\n\n';
  doc += generateInlineMetadata(metadata);

  return doc;
}

/**
 * 인라인 메타데이터 생성
 */
function generateInlineMetadata(metadata) {
  const inline = [];

  if (metadata.카테고리 === '트러블슈팅') {
    inline.push(`발생일시:: ${metadata.발생일시}`);
    inline.push(`해결일시:: ${metadata.해결일시 || ''}`);
    inline.push(`소요시간:: ${metadata.소요시간 || ''}`);
    inline.push(`심각도:: ${metadata.심각도}`);
    inline.push(`재발가능성:: ${metadata.재발가능성 || 'Low'}`);
  } else if (metadata.카테고리 === '기능개발') {
    inline.push(`개발시작:: ${metadata.개발시작}`);
    inline.push(`개발완료:: ${metadata.개발완료 || ''}`);
    inline.push(`소요시간:: ${metadata.소요시간 || ''}`);
    inline.push(`테스트완료:: ${metadata.테스트완료}`);
  }

  return inline.join('\n');
}
```

### Phase 4: REST API로 저장
```javascript
/**
 * Obsidian REST API 호출
 */
async function saveToObsidian(metadata, document) {
  const config = require('../../../.claude/obsidian-config.json');
  const apiUrl = config.api.host;
  const token = config.api.token;

  // 파일 경로 생성
  const filePath = generateFilePath(metadata);
  // 예: /vault/Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md

  // API 호출
  const response = await fetch(`${apiUrl}${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/markdown',
    },
    body: document,
  });

  if (!response.ok) {
    throw new Error(`Obsidian API Error: ${response.statusText}`);
  }

  return filePath;
}

/**
 * 파일 경로 자동 생성
 */
function generateFilePath(metadata) {
  const { 프로젝트, 카테고리, 날짜 } = metadata;

  // 카테고리 → 폴더
  const folderMap = {
    '트러블슈팅': '05-트러블슈팅',
    '기능개발': '03-기능개발',
    '대화기록': '99-대화기록',
    '아키텍처': '01-아키텍처',
    '스키마': '02-스키마',
  };

  const folder = folderMap[카테고리];

  // 파일명 생성 (카테고리별 규칙)
  let filename = `${날짜}-`;

  if (카테고리 === '트러블슈팅') {
    // {날짜}-{발생기능}-{에러타입}-{근본원인}.md
    filename += `${metadata.발생기능}-${metadata.에러타입}-${metadata.근본원인}`;
  } else if (카테고리 === '기능개발') {
    // {날짜}-{기능명칭}.md
    filename += metadata.기능명칭;
  } else if (카테고리 === '대화기록') {
    // {날짜}-{대화유형}-{주제}.md
    filename += `${metadata.대화유형}-${metadata.주요성과}`;
  }

  filename += '.md';
  filename = filename.replace(/\s+/g, '-'); // 공백 → 하이픈

  return `/vault/Projects/${프로젝트}/${folder}/${filename}`;
}
```

### Phase 5: 검증 및 리포트
```javascript
/**
 * 저장 성공 후 검증
 */
async function verifyDocument(filePath) {
  // Obsidian에서 파일 읽기
  const content = await fetch(`${apiUrl}${filePath}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.text());

  // 검증
  const checks = {
    yaml: content.includes('---'),
    hashtags: content.includes('#'),
    title: content.includes('# '),
    inlineMetadata: content.includes('::'),
  };

  const passed = Object.values(checks).every(Boolean);

  return {
    passed,
    checks,
    fileSize: content.length,
  };
}
```

## 🎬 Claude 실행 예시

### 예시 1: 트러블슈팅 완료 시

**사용자:** "JWT 403 에러 해결했어"

**Claude 내부 실행:**

```javascript
// 1. 메타데이터 자동 생성 (metadata-auto-generator)
const metadata = await metadataAutoGenerator.generate({
  conversationHistory,
  gitDiff: await getGitDiff(),
  modifiedFiles: ['lib/auth/authOptions.ts'],
});

// 2. 본문 생성
const content = generateTroubleshootingContent(conversationHistory, metadata);

// 3. 문서 조립
const document = assembleDocument(metadata, content);

// 4. Obsidian 저장
const filePath = await saveToObsidian(metadata, document);
// → /vault/Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md

// 5. 검증
const verification = await verifyDocument(filePath);
```

**Claude가 사용자에게 보여주는 메시지:**

```markdown
✅ 트러블슈팅 해결 완료!

📝 Obsidian 문서 생성:
   파일: Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md
   메타데이터: 18개 필드 (품질: 92/100)
   태그: 13개 자동 생성
   관련 문서: 3개 자동 연결

🔗 관련 문서:
   - [[RBAC아키텍처]]
   - [[JWT인증구현]]
   - [[사용자스키마]]

Obsidian에서 확인하세요!
```

### 예시 2: 기능개발 완료 시

**사용자:** "이미지 업로드 UX 개선 완료했어"

**Claude:**

```markdown
✅ 기능개발 완료!

📝 Obsidian 문서 생성:
   파일: Projects/나라똔/03-기능개발/2025-10-19-심사관이미지업로드-UX개선.md
   메타데이터: 15개 필드 (품질: 95/100)
   구현 파일: 3개
   API 엔드포인트: 1개
   테스트 완료: ✅

💻 구현 파일:
   - components/ImageUploader.tsx
   - app/api/upload-image/route.ts
   - app/admin/examiners/page.tsx

Obsidian에서 확인하세요!
```

## 🔗 연동 Skills

### 자동 실행 체인

**skill-orchestrator**가 다음 순서로 자동 실행:

```javascript
// 작업 완료 시 POST Skills
const postSkills = [
  'development/code-review/request-result-validator',  // 1. 검증
  'automation/metadata-auto-generator',                // 2. 메타데이터
  'development/documentation/obsidian-auto-doc',       // 3. 문서 생성 ← 여기!
];
```

**실행 플로우:**

```
사용자: "JWT 에러 해결했어"
  ↓
Claude: 에러 해결
  ↓
[POST Skills 자동 실행]
  ↓
1. request-result-validator
   → 요청 반영도: 95/100 ✅
  ↓
2. metadata-auto-generator
   → 메타데이터 생성 (92/100) ✅
  ↓
3. obsidian-auto-doc ← 여기!
   → Obsidian 문서 생성 ✅
  ↓
완료!
```

## 📊 네이밍 규칙

### 트러블슈팅
```
{날짜}-{발생기능}-{에러타입}-{근본원인}.md

예시:
2025-10-19-관리자인증-403에러-JWT콜백미조회.md
2025-10-18-이미지업로드-CORS문제-헤더누락.md
```

### 기능개발
```
{날짜}-{기능명칭}.md

예시:
2025-10-19-심사관이미지업로드-UX개선.md
2025-10-15-정책뉴스검색기능.md
```

### 대화기록
```
{날짜}-{대화유형}-{주제}.md

예시:
2025-10-19-시스템설계-Skills자동화시스템.md
2025-10-18-트러블슈팅-JWT인증문제해결.md
```

## ✅ 성공 기준

- [ ] REST API로 문서 생성 100% 성공
- [ ] 메타데이터 품질 90점 이상
- [ ] 사용자 입력 0% (완전 자동)
- [ ] 생성 시간 5초 이내
- [ ] YAML, 해시태그, 인라인 메타데이터 모두 포함

## 🎯 장점

### vs Templater (기존)
- ✅ **설정 불필요** (폴더 템플릿, 프롬프트 등)
- ✅ **100% 자동화** (사용자 입력 0%)
- ✅ **품질 보장** (메타데이터 자동 검증)
- ✅ **즉시 반영** (Obsidian 재시작 불필요)

### vs 수동 작성
- Before: 15-20분 (수동 작성)
- After: **5초** (자동 생성)
- 정확도: **95% 이상** (AI 생성)

## 📝 설정

`.claude/obsidian-config.json`:
```json
{
  "api": {
    "host": "http://127.0.0.1:27123",
    "token": "your-token-here"
  },
  "vaultPath": "F:\\obsidian\\Pola",
  "projects": {
    "homepage": {
      "name": "나라똔",
      "path": "Projects/나라똔"
    }
  },
  "autoSave": {
    "enabled": true,
    "triggers": [
      "feature-complete",
      "troubleshooting-resolved",
      "conversation-end"
    ]
  }
}
```

## 🚨 에러 처리

```javascript
/**
 * REST API 실패 시 자동 재시도
 */
async function saveWithRetry(metadata, document, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await saveToObsidian(metadata, document);
    } catch (error) {
      if (i === maxRetries - 1) {
        // 최종 실패: 로컬 파일로 백업
        const backupPath = `./obsidian-backup/${metadata.날짜}-${metadata.title}.md`;
        fs.writeFileSync(backupPath, document);
        console.warn(`⚠️  Obsidian 저장 실패. 백업: ${backupPath}`);
        throw error;
      }
      await sleep(1000 * (i + 1)); // 재시도 간격
    }
  }
}
```

---

**이제 모든 Claude 작업이 자동으로 Obsidian에 저장됩니다!**
**Templater 설정 불필요, 100% 자동화!**
