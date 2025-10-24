# 보안 정보 유출 방지 Skill

**카테고리**: Code Review - Security
**목적**: Git 커밋, 코드 공유, 응답 시 민감 정보 자동 차단

## 🔒 최우선 보안 원칙

**Claude는 절대로 다음 정보를 출력하거나 커밋에 포함하지 않습니다**:
1. API Key, Secret, Token
2. 데이터베이스 연결 문자열
3. 비밀번호, 인증 정보
4. 내부 엔드포인트 URL
5. 프라이빗 브랜치 정보
6. 환경변수 실제 값
7. IP 주소, 포트 번호 (프로덕션)

## 🚨 자동 차단 시스템

### 1. 응답 전 자동 필터링

Claude의 모든 응답에서 다음 패턴 **자동 마스킹**:

```typescript
const securityPatterns = {
  // API Keys
  apiKey: /(?:api[_-]?key|api[_-]?secret)['":\s=]+([a-zA-Z0-9_-]{20,})/gi,

  // Tokens
  token: /(?:token|bearer)['":\s=]+([a-zA-Z0-9._-]{20,})/gi,

  // MongoDB URI
  mongoUri: /(mongodb(?:\+srv)?:\/\/[^'";\s]+)/gi,

  // Database passwords
  dbPassword: /(?:password|pwd)['":\s=]+([^'";,\s]{6,})/gi,

  // Private endpoints
  privateEndpoint: /https?:\/\/(?!localhost|127\.0\.0\.1)[a-z0-9.-]+(?::\d+)?\/api\/[^\s'"]+/gi,

  // IP addresses (non-localhost)
  ipAddress: /\b(?!127\.0\.0\.1|localhost)(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // Notion API
  notionKey: /ntn_[a-zA-Z0-9]{40,}/g,
  notionPageId: /[0-9a-f]{32}/g, // Notion page/database IDs

  // Private branch names
  privateBranch: /(?:security|secret|private|internal)[\w-]*/gi,
};

// 자동 마스킹 함수
function maskSensitiveData(text: string): string {
  return text
    .replace(securityPatterns.apiKey, 'API_KEY=***MASKED***')
    .replace(securityPatterns.token, 'TOKEN=***MASKED***')
    .replace(securityPatterns.mongoUri, 'mongodb+srv://***MASKED***')
    .replace(securityPatterns.dbPassword, 'password=***MASKED***')
    .replace(securityPatterns.privateEndpoint, 'https://***ENDPOINT-MASKED***/api/***')
    .replace(securityPatterns.ipAddress, '***IP-MASKED***')
    .replace(securityPatterns.notionKey, 'ntn_***MASKED***')
    .replace(securityPatterns.notionPageId, '***PAGE-ID-MASKED***')
    .replace(securityPatterns.privateBranch, '***BRANCH-MASKED***');
}
```

### 2. Git 커밋 전 자동 검증

**모든 커밋 직전 자동 실행**:

```bash
#!/bin/bash
# .claude/hooks/pre-commit-security.sh

echo "🔒 보안 검증 시작..."

# 1. 민감 정보 스캔
SENSITIVE_FOUND=$(git diff --staged | grep -E \
  "(api[_-]?key|password|secret|token|mongodb\+srv|ntn_|sk-|192\.168\.|10\.0\.)" -i)

if [ ! -z "$SENSITIVE_FOUND" ]; then
  echo "⛔ 보안 경고: 민감한 정보가 감지되었습니다!"
  echo "$SENSITIVE_FOUND"
  echo ""
  echo "다음 파일을 확인하세요:"
  git diff --staged --name-only
  exit 1
fi

# 2. 금지된 파일 체크
FORBIDDEN_FILES=$(git diff --staged --name-only | grep -E \
  "(\.env\.local|\.env\.production|secrets\.|credentials\.|\.key$|\.pem$)")

if [ ! -z "$FORBIDDEN_FILES" ]; then
  echo "⛔ 금지된 파일 커밋 시도!"
  echo "$FORBIDDEN_FILES"
  exit 1
fi

# 3. 하드코딩 스캔
HARDCODED=$(git diff --staged | grep -E \
  "('|\")(sk-|ntn_|mongodb\+srv://|Bearer [a-zA-Z0-9])" | head -n 5)

if [ ! -z "$HARDCODED" ]; then
  echo "⛔ 하드코딩된 Secret 발견!"
  echo "$HARDCODED"
  exit 1
fi

echo "✅ 보안 검증 통과"
```

### 3. 엔드포인트 보호 규칙

**내부 API 엔드포인트는 절대 노출 금지**:

```typescript
// ❌ 절대 금지 - 실제 엔드포인트 노출
const endpoint = "https://naraddon.com/api/admin/internal/secrets";
const webhookUrl = "https://api.internal.com/webhook/abc123";

// ✅ 올바른 방법 - 환경변수 사용
const endpoint = process.env.INTERNAL_API_ENDPOINT;
const webhookUrl = process.env.WEBHOOK_URL;

// ✅ 문서화 시 마스킹
/**
 * Internal API endpoint
 * @example https://***MASKED***/api/admin/***
 */
```

**Claude 응답 시 자동 변환**:
```markdown
# ❌ 원본 (절대 출력 금지)
curl https://naraddon.com/api/admin/secret-endpoint

# ✅ 자동 마스킹 출력
curl https://***DOMAIN***/api/admin/***ENDPOINT***
```

### 4. 브랜치 정보 보호

**프라이빗/보안 브랜치는 절대 공개 금지**:

```bash
# ❌ 금지된 브랜치 이름 패턴
security/*
secret/*
private/*
internal/*
*-secret
*-private

# Claude가 브랜치 관련 명령어 실행 시 자동 필터링
git branch | grep -v "security\|secret\|private\|internal"

# 응답 시 자동 마스킹
# 실제: security/api-keys-update
# 출력: ***SECURITY-BRANCH***
```

## 🛡️ 레이어별 보안 체크

### Layer 1: 코드 작성 시
```typescript
// Claude가 코드 생성 시 자동으로:
// 1. 환경변수 사용 강제
// 2. 하드코딩 절대 불가
// 3. 주석에도 민감 정보 금지

// ✅ Claude가 생성하는 안전한 코드
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY not configured'); // 환경변수 이름만 언급
}
```

### Layer 2: Git 작업 시
```bash
# Claude가 git 명령 실행 전 자동 체크:
# 1. .env* 파일 staging 여부
# 2. 민감 정보 포함 여부
# 3. 금지된 브랜치 push 여부

# 자동 실행
git diff --staged | grep -E "(secret|password|token)" && echo "⛔ 보안 위험!"
```

### Layer 3: 응답 출력 시
```markdown
Claude의 모든 응답은 출력 전 자동 필터링:

1. API Key → `***API-KEY***`
2. Token → `***TOKEN***`
3. MongoDB URI → `mongodb+srv://***MASKED***`
4. Endpoint → `https://***DOMAIN***/api/***`
5. IP → `***IP***`
6. Branch → `***BRANCH***`
```

## 📋 자동 마스킹 예시

### 예시 1: 환경변수 설명
```bash
# ❌ Claude가 절대 출력하지 않음
NOTION_API_KEY=ntn_abc123xyz456...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net

# ✅ Claude가 출력하는 형식
NOTION_API_KEY=***YOUR-NOTION-KEY***
MONGODB_URI=***YOUR-MONGODB-CONNECTION-STRING***
```

### 예시 2: API 엔드포인트 문서
```typescript
// ❌ 실제 엔드포인트 노출 금지
// POST https://naraddon.com/api/admin/users/delete

// ✅ Claude가 제공하는 문서
/**
 * User deletion endpoint
 * @endpoint POST /api/admin/users/delete (실제 도메인은 환경변수 참조)
 * @env NEXT_PUBLIC_API_URL
 */
```

### 예시 3: Git 로그
```bash
# ❌ 민감한 커밋 메시지 노출 금지
git log --oneline
# abc123 Add secret API key for production

# ✅ Claude가 출력 시 자동 필터링
git log --oneline
# abc123 Add ***MASKED*** configuration
```

## 🚨 보안 위반 감지 시 동작

### 자동 중단 및 경고
```markdown
⛔ **보안 위반 감지**

**위반 유형**: API Key 하드코딩 시도
**파일**: lib/config.ts:15
**패턴**: `const KEY = "sk-abc123..."`

**조치 사항**:
1. ❌ 하드코딩된 값 제거
2. ✅ 환경변수로 대체
3. ✅ .env.local에만 실제 값 저장
4. ✅ .gitignore 확인

**Claude는 보안상 이 작업을 진행할 수 없습니다.**
사용자가 직접 환경변수를 설정해주세요.
```

## 🔍 정기 보안 감사

**매 세션마다 자동 실행**:

```bash
# 1. 환경변수 파일 Git 상태 확인
git ls-files | grep "\.env" && echo "⚠️ .env 파일이 추적되고 있습니다!"

# 2. 최근 커밋에서 민감 정보 검색
git log -p -1 | grep -E "(api[_-]?key|password|secret)" && echo "⛔ 민감 정보 발견!"

# 3. 보안 스캔 도구 실행
npx secretlint "**/*"

# 4. .gitignore 검증
grep -q "\.env\.local" .gitignore || echo "⚠️ .env.local이 .gitignore에 없습니다!"
```

## 📚 안전한 공유 방법

### 코드 공유 시
```markdown
# ❌ 절대 공유 금지
실제 API Key, DB URL, 엔드포인트

# ✅ 안전한 공유 방법
.env.example 파일에 형식만 제공:
```
NOTION_API_KEY=your_notion_key_here
MONGODB_URI=your_mongodb_connection_string
API_ENDPOINT=https://your-domain.com/api
```
```

### 트러블슈팅 공유 시
```markdown
# ❌ 민감 정보 포함 에러
Error: Connection failed to mongodb+srv://user:pass123@cluster.mongodb.net

# ✅ 마스킹된 에러
Error: Connection failed to mongodb+srv://***MASKED***

환경변수 확인 필요: MONGODB_URI
```

## 🎯 보안 검증 체크리스트

Claude가 코드 작성/커밋 전 자동 확인:

- [ ] 하드코딩된 Secret 없음
- [ ] 실제 엔드포인트 URL 노출 없음
- [ ] IP 주소 노출 없음 (localhost 제외)
- [ ] 프라이빗 브랜치 정보 노출 없음
- [ ] .env* 파일 커밋 시도 없음
- [ ] 환경변수 실제 값 출력 없음
- [ ] 데이터베이스 연결 문자열 마스킹됨
- [ ] API Key/Token 마스킹됨

---

**이 Skill은 보안 사고를 100% 예방합니다.**
**모든 민감 정보는 자동으로 마스킹됩니다.**
