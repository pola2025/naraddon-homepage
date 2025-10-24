# Skill: Request-Result Validator (요청-결과 검증기)

## 🎯 목적
사용자의 요청사항과 Claude가 생성한 결과물을 자동으로 비교/검증하여 누락, 불일치, 과잉 구현을 방지합니다.

## 📋 실행 시점
- **모든 작업 완료 직후** (자동 트리거)
- 사용자가 명시적으로 검증 요청 시
- Git commit 전 (pre-commit hook 통합)
- Obsidian 문서 저장 전

## 🔧 실행 워크플로우

### Phase 1: 요청사항 분석 (Request Analysis)
```javascript
/**
 * 사용자 요청을 구조화된 체크리스트로 변환
 * @purpose 모호한 요청도 명확한 검증 항목으로 분해
 */
function parseUserRequest(userMessage) {
  const request = {
    // 명시적 요청 (사용자가 직접 언급)
    explicit: [],

    // 암묵적 요청 (컨텍스트에서 추론)
    implicit: [],

    // 제약조건 (하지 말아야 할 것)
    constraints: [],

    // 품질 요구사항
    quality: [],
  };

  return request;
}
```

**Claude 실행 단계:**

1. **명시적 요청 추출**
   ```typescript
   // 사용자 메시지: "JWT 인증 에러 해결하고 테스트도 추가해줘"

   explicit: [
     "JWT 인증 에러 해결",
     "테스트 추가",
   ]
   ```

2. **암묵적 요청 추론**
   ```typescript
   // 컨텍스트 분석
   implicit: [
     "에러 로그 제거", // 에러 해결 시 당연히 포함
     "타입 안전성 유지", // TypeScript 프로젝트
     "문서화", // CLAUDE.md 규칙
   ]
   ```

3. **제약조건 추출**
   ```typescript
   // CLAUDE.md에서 자동 로드
   constraints: [
     "디자인 변경 금지",
     "기존 파일 덮어쓰기 금지",
     "보안 정보 하드코딩 금지",
     "테스트 없는 코드 작성 금지",
   ]
   ```

4. **품질 요구사항**
   ```typescript
   quality: [
     "TypeScript 컴파일 에러 없음",
     "ESLint 경고 없음",
     "테스트 커버리지 70% 이상",
     "의도와 맥락 주석 작성",
   ]
   ```

### Phase 2: 결과물 분석 (Result Analysis)
```javascript
/**
 * Claude가 생성/수정한 모든 결과물 스캔
 * @context Git diff, 파일 목록, 대화 히스토리
 */
async function analyzeResult() {
  const result = {
    // 변경된 파일
    modifiedFiles: await getGitDiff(),

    // 생성된 파일
    createdFiles: await getNewFiles(),

    // 실행한 명령어
    commands: extractCommandsFromHistory(),

    // 작성한 코드
    codeChanges: await parseCodeChanges(),

    // 생성한 테스트
    tests: await findTestFiles(),
  };

  return result;
}
```

**Claude 실행 단계:**

1. **Git diff 분석**
   ```bash
   git diff --name-status HEAD

   M  lib/auth/authOptions.ts
   A  __tests__/auth/session.test.ts
   M  docs/troubleshooting/jwt-auth.md
   ```

2. **코드 변경 파싱**
   ```typescript
   codeChanges: [
     {
       file: 'lib/auth/authOptions.ts',
       type: 'modification',
       lines: '+15 -3',
       functions: ['jwt callback', 'session callback'],
       imports: ['connectMongoDB', 'User'],
     },
     {
       file: '__tests__/auth/session.test.ts',
       type: 'creation',
       lines: '+42',
       testCases: ['should include role in session', 'should handle missing user'],
     },
   ]
   ```

3. **명령어 히스토리 추출**
   ```typescript
   commands: [
     'npm test -- session.test.ts',
     'npx playwright test',
     'npm run type-check',
   ]
   ```

### Phase 3: 요청-결과 매칭 (Request-Result Matching)
```javascript
/**
 * 요청사항 각각이 결과물에 반영되었는지 검증
 * @returns 매칭 결과 및 누락 항목
 */
function matchRequestToResult(request, result) {
  const validation = {
    matched: [],      // ✅ 완벽히 반영됨
    partial: [],      // ⚠️ 부분적으로 반영됨
    missing: [],      // ❌ 누락됨
    excess: [],       // ⚡ 요청 없었는데 추가됨
  };

  // 각 요청사항 검증
  request.explicit.forEach(item => {
    const match = findMatchInResult(item, result);
    if (match.score === 100) {
      validation.matched.push({ item, evidence: match.evidence });
    } else if (match.score > 0) {
      validation.partial.push({ item, score: match.score, missing: match.missing });
    } else {
      validation.missing.push({ item, reason: match.reason });
    }
  });

  return validation;
}
```

**Claude 실행 단계:**

**예시 1: 완벽한 매칭**
```typescript
// 요청: "JWT 인증 에러 해결"
// 결과: lib/auth/authOptions.ts 수정 + 테스트 통과

matched: [
  {
    item: "JWT 인증 에러 해결",
    evidence: {
      file: "lib/auth/authOptions.ts",
      changes: "JWT 콜백에 DB role 조회 추가",
      verification: "npm test 통과",
      commit: "2cd0457",
    },
    score: 100,
  }
]
```

**예시 2: 부분 매칭**
```typescript
// 요청: "테스트도 추가해줘"
// 결과: 테스트 파일 생성했으나 E2E 테스트 누락

partial: [
  {
    item: "테스트 추가",
    score: 70,
    completed: [
      "✅ 단위 테스트 작성 (session.test.ts)",
      "✅ 테스트 통과",
    ],
    missing: [
      "❌ E2E 테스트 누락",
      "❌ 에러 케이스 테스트 부족",
    ],
  }
]
```

**예시 3: 누락**
```typescript
// 요청: "문서화도 해줘"
// 결과: 문서 생성 안 함

missing: [
  {
    item: "문서화",
    reason: "Obsidian 문서 생성되지 않음",
    suggestion: "트러블슈팅 문서 작성 필요",
  }
]
```

**예시 4: 과잉 구현**
```typescript
// 요청: "JWT 에러만 해결"
// 결과: JWT 수정 + CSS 스타일 변경

excess: [
  {
    item: "CSS 스타일 변경",
    files: ["app/admin/layout.tsx:style"],
    reason: "요청하지 않은 디자인 변경",
    violation: "CLAUDE.md 규칙 위반: 디자인 변경 금지",
  }
]
```

### Phase 4: 제약조건 검증 (Constraint Validation)
```javascript
/**
 * CLAUDE.md 규칙 준수 여부 검증
 * @critical 보안, 품질, 안전 규칙 위반 시 즉시 경고
 */
async function validateConstraints(result) {
  const violations = [];

  // 1. 보안 검증
  const securityCheck = await checkSecurityViolations(result);
  if (securityCheck.hasViolations) {
    violations.push(...securityCheck.violations);
  }

  // 2. 디자인 변경 검증
  const designCheck = checkDesignChanges(result);
  if (designCheck.changed && !designCheck.userApproved) {
    violations.push({
      type: 'design-change',
      severity: 'HIGH',
      message: '사용자 승인 없는 디자인 변경 감지',
      files: designCheck.files,
    });
  }

  // 3. 테스트 존재 검증
  const testCheck = checkTestCoverage(result);
  if (!testCheck.hasTests) {
    violations.push({
      type: 'no-tests',
      severity: 'CRITICAL',
      message: '테스트 없는 코드 작성',
      affectedFiles: testCheck.modifiedFiles,
    });
  }

  return violations;
}
```

**Claude 실행 단계:**

**보안 검증**
```typescript
// 하드코딩 검사
const securityPatterns = {
  apiKey: /['\"]?api[_-]?key['\"]?\s*[:=]\s*['\"](sk-|pk-)?[a-zA-Z0-9_-]{20,}['\"]/i,
  password: /password\s*[:=]\s*['\"]\w+['\"](?!process\.env)/i,
  mongoUri: /mongodb(\+srv)?:\/\/[^'\"]+/,
};

violations: [
  {
    type: 'security',
    severity: 'CRITICAL',
    file: 'lib/db/mongodb.ts:15',
    pattern: 'MongoDB URI 하드코딩',
    line: 'const uri = "mongodb+srv://user:pass@cluster.mongodb.net"',
    fix: 'const uri = process.env.MONGODB_URI',
  }
]
```

**디자인 변경 검증**
```typescript
// CSS, style, className 변경 검사
const designPatterns = [
  /className=/,
  /style\s*=\s*\{/,
  /\.css$/,
  /tailwind/,
];

violations: [
  {
    type: 'design-change',
    severity: 'HIGH',
    file: 'app/admin/layout.tsx:25',
    change: 'className 변경',
    before: 'bg-white',
    after: 'bg-blue-500',
    action: '사용자 승인 필요',
  }
]
```

**테스트 검증**
```typescript
// 수정된 파일에 대응하는 테스트 파일 존재 확인
modifiedFiles: ['lib/auth/authOptions.ts']
testFiles: ['__tests__/auth/session.test.ts'] // ✅ 존재

violations: [] // 테스트 존재하므로 통과
```

### Phase 5: 품질 검증 (Quality Validation)
```javascript
/**
 * 코드 품질 및 주석 품질 검증
 * @context CLAUDE.md "코드 주석 작성 규칙"
 */
async function validateQuality(result) {
  const quality = {
    code: await validateCodeQuality(result),
    comments: await validateComments(result),
    documentation: await validateDocumentation(result),
  };

  return quality;
}
```

**Claude 실행 단계:**

**1. 주석 품질 검증**
```typescript
/**
 * CLAUDE.md 규칙: "모든 코드에 프로젝트의 의도와 맥락을 주석으로 남긴다"
 * 필수 항목: purpose, context, decision, note
 */
function validateComments(file) {
  const functions = extractFunctions(file);

  const missing = functions.filter(fn => {
    const comment = fn.comment;
    return !comment ||
           !comment.includes('@purpose') ||
           !comment.includes('@context');
  });

  return {
    total: functions.length,
    documented: functions.length - missing.length,
    coverage: ((functions.length - missing.length) / functions.length) * 100,
    missingDocs: missing,
  };
}
```

**주석 검증 결과 예시**
```typescript
commentQuality: {
  coverage: 75%, // 4개 중 3개 함수에 주석
  missingDocs: [
    {
      function: 'handleUpload',
      file: 'components/ImageUploader.tsx:84',
      issue: '@purpose, @context 누락',
      suggestion: '업로드 의도와 R2 연동 맥락 추가 필요',
    }
  ],
  score: 75,
}
```

**2. TypeScript 타입 검증**
```bash
npx tsc --noEmit

typeErrors: [] // ✅ 타입 에러 없음
```

**3. ESLint 검증**
```bash
npm run lint

lintWarnings: [
  {
    file: 'lib/auth/authOptions.ts:95',
    rule: 'no-explicit-any',
    message: 'any 타입 사용 지양',
  }
]
```

### Phase 6: 검증 리포트 생성 (Validation Report)
```javascript
/**
 * 검증 결과를 사용자가 이해하기 쉬운 리포트로 생성
 * @output 체크리스트 형식, 점수, 개선 제안
 */
function generateValidationReport(validation) {
  const report = {
    summary: calculateSummary(validation),
    checklist: generateChecklist(validation),
    score: calculateScore(validation),
    recommendations: generateRecommendations(validation),
  };

  return report;
}
```

**Claude가 사용자에게 보여주는 리포트:**

```markdown
📊 **요청-결과 검증 리포트**

## ✅ 요청사항 반영도: 85/100

### 명시적 요청 (2개)
✅ **JWT 인증 에러 해결** - 완료 (100%)
   - lib/auth/authOptions.ts 수정
   - DB role 조회 로직 추가
   - 테스트 통과 확인

⚠️ **테스트 추가** - 부분 완료 (70%)
   ✅ 단위 테스트 작성 (session.test.ts)
   ✅ 테스트 통과
   ❌ E2E 테스트 누락
   ❌ 에러 케이스 테스트 부족

### 암묵적 요청 (3개)
✅ **에러 로그 제거** - 완료
✅ **타입 안전성 유지** - 완료
❌ **문서화** - 누락
   → Obsidian 트러블슈팅 문서 생성 필요

---

## 🚨 제약조건 검증

### 보안 규칙 (CRITICAL)
✅ 하드코딩 없음
✅ 환경변수 사용
✅ .env.local 미커밋

### 디자인 규칙 (HIGH)
✅ 디자인 변경 없음
✅ CSS 수정 없음

### 테스트 규칙 (CRITICAL)
⚠️ 테스트 존재 (session.test.ts)
❌ E2E 테스트 누락

### 백업 규칙 (MEDIUM)
✅ Git stash 생성됨
✅ 백업 파일 존재

---

## 📝 품질 검증

### 코드 품질 (90/100)
✅ TypeScript 컴파일: 에러 없음
⚠️ ESLint: 경고 1개
   - lib/auth/authOptions.ts:95 - any 타입 사용

### 주석 품질 (75/100)
⚠️ 주석 커버리지: 75% (3/4 함수)
❌ 누락:
   - handleUpload: @purpose, @context 필요

### 문서화 (40/100)
❌ Obsidian 트러블슈팅 문서 미생성
❌ README 업데이트 누락

---

## 💡 개선 제안 (우선순위순)

### 🔴 Critical (즉시 수정 필요)
1. **Obsidian 트러블슈팅 문서 생성**
   - 파일: 05-트러블슈팅/2025-10-19-JWT인증-403에러.md
   - 이유: CLAUDE.md 규칙 - 모든 트러블슈팅 문서화 필수

### 🟡 Medium (권장)
2. **E2E 테스트 추가**
   - 파일: e2e/admin-auth.spec.ts
   - 시나리오: Google OAuth → 관리자 페이지 접근

3. **주석 보완**
   - 파일: components/ImageUploader.tsx:84
   - 항목: @purpose, @context 추가

### 🟢 Low (선택)
4. **ESLint 경고 해결**
   - any 타입 → 구체적 타입 지정

---

## 📈 종합 점수: 85/100

**통과 기준: 70점**
✅ **검증 통과** - 배포 가능

**만점 달성 조건:**
- Obsidian 문서 생성 (+10점)
- E2E 테스트 추가 (+5점)

---

**자동 수정 가능 항목:**
- [ ] Obsidian 문서 자동 생성
- [ ] 주석 템플릿 자동 추가

**계속 진행하시겠습니까?**
- Y: 자동 수정 항목 즉시 처리
- N: 현재 상태 유지
- E: 수동으로 수정 후 재검증
```

### Phase 7: 자동 수정 (Auto-Fix)
```javascript
/**
 * 자동으로 수정 가능한 항목 처리
 * @condition 사용자 승인 후에만 실행
 */
async function autoFix(validation) {
  const fixes = [];

  // 1. Obsidian 문서 자동 생성
  if (validation.missing.includes('문서화')) {
    await generateObsidianDoc();
    fixes.push('Obsidian 트러블슈팅 문서 생성');
  }

  // 2. 주석 템플릿 자동 추가
  if (validation.quality.comments.coverage < 80) {
    await addCommentTemplates(validation.quality.comments.missingDocs);
    fixes.push('주석 템플릿 추가');
  }

  // 3. 테스트 스켈레톤 생성
  if (validation.missing.includes('E2E 테스트')) {
    await generateTestSkeleton();
    fixes.push('E2E 테스트 스켈레톤 생성');
  }

  return fixes;
}
```

**자동 수정 후 리포트:**
```markdown
🔧 **자동 수정 완료**

✅ Obsidian 트러블슈팅 문서 생성
   - 파일: F:\obsidian\Pola\Projects\나라똔\05-트러블슈팅\2025-10-19-JWT인증-403에러.md
   - 메타데이터: 자동 생성 (92/100)

✅ 주석 템플릿 추가
   - 파일: components/ImageUploader.tsx:84
   - 템플릿: @purpose, @context, @decision 추가

✅ E2E 테스트 스켈레톤 생성
   - 파일: e2e/admin-auth.spec.ts
   - TODO: 테스트 시나리오 작성 필요

---

📈 **재검증 결과: 95/100** (+10점)

모든 Critical 항목 해결 완료! 🎉
```

## ✅ 검증 체크리스트 템플릿

Claude가 자동 생성하는 체크리스트:

```markdown
## 📋 작업 검증 체크리스트

### 요청사항 반영
- [x] JWT 인증 에러 해결
- [x] 테스트 추가 (부분)
- [ ] 문서화 (누락)

### CLAUDE.md 규칙 준수
- [x] 보안: 하드코딩 없음
- [x] 보안: 환경변수 사용
- [x] 디자인: 변경 없음
- [x] 백업: Git stash 생성
- [ ] 테스트: E2E 테스트 (누락)
- [ ] 주석: 의도와 맥락 작성 (75%)
- [x] 타입: TypeScript 에러 없음
- [x] 린트: ESLint 통과 (경고 1개)

### 품질 검증
- [x] 빌드 성공
- [x] 테스트 통과
- [x] 타입 체크 통과
- [ ] E2E 테스트 통과 (미작성)
- [x] Git commit 가능
- [ ] 문서화 완료 (누락)

### 점수
- 요청 반영도: 85/100
- 제약조건: 90/100
- 품질: 80/100
- **종합: 85/100** ✅ 통과
```

## 🎬 실행 예시

### 예시 1: 완벽한 작업
```markdown
사용자: "JWT 에러 해결해줘"

[Claude 작업 완료]

Claude (자동 검증):
📊 검증 결과: 100/100 🎉

✅ 모든 요청사항 반영
✅ 모든 제약조건 준수
✅ 품질 기준 충족

세부사항:
- JWT 콜백 수정 ✅
- 테스트 작성 ✅
- Obsidian 문서 생성 ✅
- 주석 작성 ✅
- 보안 검증 통과 ✅

배포 가능 상태입니다!
```

### 예시 2: 문제 발견
```markdown
사용자: "이미지 업로드 기능만 추가해줘"

[Claude 작업 완료]

Claude (자동 검증):
⚠️ 검증 결과: 65/100 - 통과 실패

❌ 발견된 문제:
1. 요청하지 않은 CSS 변경 감지
   - app/admin/layout.tsx:25
   - 디자인 변경 승인 필요

2. 테스트 누락 (CRITICAL)
   - ImageUploader.test.tsx 없음
   - CLAUDE.md 규칙 위반

3. 보안 위험
   - R2_SECRET_KEY 하드코딩 발견
   - components/ImageUploader.tsx:45

**자동 수정 불가 - 수동 수정 필요**

수정 후 재검증하시겠습니까? (Y/n)
```

### 예시 3: 자동 수정
```markdown
사용자: "JWT 에러만 빠르게 수정해줘"

[Claude 작업 완료]

Claude (자동 검증):
⚠️ 검증 결과: 75/100

누락 항목 (자동 수정 가능):
- [ ] Obsidian 문서 미생성
- [ ] 주석 부족 (50%)

자동 수정하시겠습니까? (Y/n)

사용자: Y

[자동 수정 실행]

Claude:
✅ 자동 수정 완료

- Obsidian 문서 생성 ✅
- 주석 템플릿 추가 ✅

재검증 결과: 95/100 🎉
배포 가능합니다!
```

## 🔗 연동 Skills

- **auto-backup.md**: 검증 실패 시 백업 복원
- **prevent-leak.md**: 보안 검증 항목 제공
- **obsidian-auto-doc.md**: 문서화 누락 시 자동 생성
- **metadata-auto-generator.md**: 문서 메타데이터 검증
- **skill-orchestrator.md**: 작업 완료 후 자동 트리거

## 📝 설정

`.claude/validation-config.json` (옵션):
```json
{
  "passingScore": 70,
  "autoFix": true,
  "strictMode": false,
  "validationRules": {
    "security": "CRITICAL",
    "tests": "HIGH",
    "documentation": "MEDIUM",
    "comments": "MEDIUM"
  }
}
```

## 🎯 성공 기준

- [ ] 요청-결과 매칭도 **80% 이상**
- [ ] 제약조건 위반 **0건**
- [ ] Critical 항목 **100% 통과**
- [ ] 종합 점수 **70점 이상**
- [ ] 자동 수정률 **50% 이상**

## 💡 사용자 경험

**Before (검증 없음):**
- 누락 발견: 나중에 (사용자가 직접 확인)
- 제약 위반: 배포 후 발견
- 문서화: 자주 까먹음

**After (자동 검증):**
- 누락 발견: 즉시 (자동 검증)
- 제약 위반: 커밋 전 차단
- 문서화: 자동 생성

**시간 절약: 30분 → 5분** (검토 시간 85% 단축)
