# 보안 검증 Skill

**카테고리**: Code Review
**목적**: 코드 변경 시 자동으로 보안 이슈 검증

## 🔒 활성화 조건

다음 작업 시 **자동 활성화**:
- API Key, Secret, Token 관련 코드 작성
- 환경변수 처리 코드 변경
- 인증/인가 로직 수정
- 데이터베이스 연결 코드 변경
- 파일 업로드/다운로드 기능 구현

## 📋 보안 체크리스트

### 1. 하드코딩 검증
```typescript
// ❌ 절대 금지
const API_KEY = "sk-1234567890abcdef";
const DB_URL = "mongodb://user:pass@host";
const PASSWORD = "mypassword123";

// ✅ 반드시 환경변수
const API_KEY = process.env.API_KEY;
const DB_URL = process.env.DATABASE_URL;
```

### 2. 환경변수 누락 처리
```typescript
// ✅ 필수: 환경변수 누락 시 에러
if (!process.env.API_KEY) {
  throw new Error('API_KEY is not configured');
}
```

### 3. Git 커밋 전 검증
```bash
# 민감 정보 검사
git diff --staged | grep -E "(api[_-]?key|password|secret|token|mongodb\+srv)" -i

# 보안 스캔
npx secretlint "**/*"
```

### 4. 파일 제외 확인
```bash
# .gitignore에 필수 항목
.env*
!.env.example
config/secrets*
*.key
*.pem
```

## 🚨 자동 경고 패턴

```typescript
const securityWarnings = {
  hardcodedSecret: /['"](?:sk|secret|token|key)[_-]?[a-zA-Z0-9]{10,}['"]/i,
  hardcodedPassword: /password\s*=\s*['"][^'"]+['"]/i,
  mongodbUrl: /mongodb(\+srv)?:\/\/[^'"]+/,
  apiKey: /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
};
```

## 💡 자동 제안

보안 이슈 발견 시:
```markdown
⚠️ **보안 경고**

파일: lib/config.ts:15
문제: API Key 하드코딩 감지

현재 코드:
```typescript
const NOTION_KEY = "ntn_xxxxxxxxxxxxx";
```

개선 코드:
```typescript
const NOTION_KEY = process.env.NOTION_API_KEY;
if (!NOTION_KEY) {
  throw new Error('NOTION_API_KEY is not configured');
}
```

.env.local에 추가:
```
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
```

수정하시겠습니까? (Y/n)
```

## 🔍 검증 포인트

### API 엔드포인트
- [ ] Rate limiting 적용
- [ ] 인증 미들웨어 확인
- [ ] CORS 설정 검증
- [ ] 입력 검증 (validation)

### 데이터베이스
- [ ] SQL Injection 방지
- [ ] NoSQL Injection 방지
- [ ] 연결 문자열 환경변수화
- [ ] 쿼리 파라미터 바인딩

### 파일 처리
- [ ] 파일 타입 검증
- [ ] 파일 크기 제한
- [ ] 경로 traversal 방지
- [ ] 업로드 경로 검증

---

**이 Skill은 보안 사고를 사전에 방지합니다.**
