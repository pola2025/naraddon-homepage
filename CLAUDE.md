# Claude 작업 가이드

## 환경변수 설정

Notion API 연동이 필요한 경우:
```
NOTION_API_KEY=환경변수로_설정_필요
```

스크립트 위치: `/scripts/notion-upload-env.js`

## 🚀 개발 서버 포트 규칙

### 포트 할당 정책
- **포트 3000**: Claude 자체 테스트 전용 (Claude가 코드 검증 시 사용)
- **포트 3001**: 사용자 테스트 전용 (사용자가 브라우저에서 확인)
- **포트 3002+**: 예비 포트 (필요시 추가 인스턴스)

### 개발 서버 실행 가이드

#### Windows PowerShell 실행 방법
```powershell
# PowerShell에서 포트 3001로 실행
$env:PORT=3001; npm run dev

# 또는 백그라운드 실행
Start-Process npm -ArgumentList "run dev" -WindowStyle Hidden
```

#### Windows CMD 실행 방법
```cmd
# CMD에서 포트 3001로 실행
set PORT=3001 && npm run dev
```

#### Cross-platform 실행 방법
```bash
# cross-env 사용 (가장 안정적)
npx cross-env PORT=3001 npm run dev
```

### 사용 가이드
```bash
# Claude 테스트용 (포트 3000)
npm run dev

# 사용자 테스트용 (포트 3001) - Windows PowerShell
$env:PORT=3001; npm run dev

# 또는 .env.local에 PORT=3001 설정
```

### 주의사항
- **동시에 여러 개발 서버 실행 금지** (성능 저하 원인)
- **한 번에 하나의 포트만 사용**
- **작업 종료 시 반드시 서버 종료** (Ctrl+C)
- **포트 충돌 시 기존 프로세스 종료 후 재시작**

### 포트 정리 명령어
```bash
# Windows - 특정 포트 프로세스 종료
netstat -ano | findstr :3000
taskkill /F /PID [PID번호]

# 모든 Node.js 프로세스 종료
taskkill /F /IM node.exe

# 백그라운드 프로세스 확인
wmic process where "name='node.exe'" get ProcessId,CommandLine
```

## 프로젝트 정보

### 저장소
- **테스트**: `naraddon-homepage-test` (Private)
- **프로덕션**: `naraddon-homepage` (Public)

### 기술 스택
- Next.js 14 (App Router)
- TypeScript
- MongoDB Atlas
- Cloudflare R2
- Vercel

### 주요 서비스 비밀번호
- `NARADDON_TUBE_PASSWORD`: 환경변수 참조
- 기타 서비스들은 환경변수 문서 참조

### 배포 프로세스
```bash
# 테스트 저장소
git push test main

# 프로덕션 저장소
git push naraddon main

# Vercel 자동 배포 트리거
```

## 중요 주의사항

### 🚨 Next.js/React 환경 터미널 문자 깨짐
- **터미널 출력 문자 깨짐 ≠ 실제 오류**
- Windows 터미널의 한글 깨짐은 무시하고 브라우저에서 실제 동작 확인
- `✓ Compiled` 메시지 확인되면 정상 작동 중
- **UTF-8 인코딩 변환 작업 불필요 - Next.js가 자동 처리**

### ⚠️ 환경변수 설정 시
- **반드시 `echo -n` 사용** (줄바꿈 제거)
- 따옴표 포함하지 않기
- Windows에서 작업 시 `\r\n` 주의

### 🔒 보안 - 최우선 준수 사항

#### 절대 금지 사항
- `.env.local` 파일 커밋 금지
- API Key, Secret, Token 하드코딩 금지
- 비밀번호 직접 입력 금지
- 데이터베이스 연결 문자열 노출 금지
- 개인정보 (이메일, 전화번호) 하드코딩 금지

#### 보안 코드 작성 규칙
```typescript
// ❌ 절대 금지 - 하드코딩
const API_KEY = "sk-1234567890abcdef";
const DB_URL = "mongodb://user:pass@host:27017";

// ✅ 올바른 방법 - 환경변수 사용
const API_KEY = process.env.API_KEY;
const DB_URL = process.env.DATABASE_URL;

// ✅ 환경변수 누락 시 에러 처리
if (!process.env.API_KEY) {
  throw new Error('API_KEY is not configured');
}
```

#### Git 보안 관리
```bash
# 로컬에만 보안 정보 유지
git update-index --skip-worktree .env.local
git update-index --skip-worktree config/secrets.json

# 실수로 커밋된 보안 파일 제거
git rm --cached .env.local
git commit -m "Remove sensitive file"

# 민감한 정보 확인 (커밋 전 필수)
git diff --staged | grep -E "(api[_-]?key|password|secret|token)" -i

# 보안 브랜치는 로컬에만 유지
git branch security/local-only --no-track
```

#### 보안 검증 도구
```bash
# 1. 보안 스캔 실행 (커밋 전 필수)
npx secretlint "**/*"
npm audit

# 2. Git hooks 설정 (.husky/pre-commit)
#!/bin/sh
# 민감 정보 검사
if git diff --staged | grep -qE "(api[_-]?key|password|secret|token|mongodb\+srv)" -i; then
  echo "⛔ 보안 위험: 민감한 정보가 감지되었습니다!"
  exit 1
fi

# 3. .gitignore 필수 항목
.env*
!.env.example
config/secrets*
*.key
*.pem
*.cert
```

#### 환경변수 관리
```bash
# .env.example 파일 (공개 가능)
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here

# .env.local 파일 (절대 공개 금지)
API_KEY=sk-actual-secret-key
DATABASE_URL=mongodb+srv://actual-connection
```

## 🚨 필수 작업 규칙

### 1. TDD(Test-Driven Development) 필수 적용
- **모든 기능 개발은 TDD 방식으로 진행**
- **TDD 사이클:**
  1. **RED**: 실패하는 테스트 먼저 작성
  2. **GREEN**: 테스트를 통과하는 최소 코드 작성
  3. **REFACTOR**: 코드 개선 (테스트는 계속 통과)

- **TDD 진행 순서:**
  ```bash
  # 1. 테스트 파일 먼저 생성
  touch __tests__/feature.test.ts

  # 2. 실패하는 테스트 작성
  npm test -- feature.test.ts  # 실패 확인 (RED)

  # 3. 기능 구현
  # 최소한의 코드로 테스트 통과시키기

  # 4. 테스트 실행
  npm test -- feature.test.ts  # 통과 확인 (GREEN)

  # 5. 리팩토링
  # 테스트 통과 유지하며 코드 개선

  # 6. 전체 테스트 실행
  npx playwright test
  npm test
  ```

### 2. 테스트 우선 원칙
- **테스트 없는 코드는 작성 금지**
- **테스트 커버리지 최소 70% 유지**
- 단위 테스트 → 통합 테스트 → E2E 테스트 순서로 작성

### 3. 디자인/UI 변경 규칙
- **디자인 변경 전 반드시 사용자 승인 필요**
- CSS, 레이아웃, 색상, 폰트 등 시각적 요소 변경 금지
- 변경이 필요한 경우:
  1. 변경 내용 상세 설명
  2. 스크린샷 또는 미리보기 제공
  3. 사용자 명시적 승인 후 진행

### 4. 파일 작업 안전 규칙
- **절대 금지 사항:**
  - 기존 파일 덮어쓰기 금지
  - 대량 삭제 금지
  - 백업 없는 구조 변경 금지

- **필수 백업 절차:**
  ```bash
  # 변경 전 백업 생성
  cp original_file.tsx original_file_backup_$(date +%Y%m%d).tsx

  # Git 상태 확인
  git status
  git diff
  ```

### 5. 복원 가능성 보장
- 모든 변경사항은 단계별 커밋
- 큰 변경은 feature 브랜치에서 작업
- 변경 전 현재 상태 기록:
  ```bash
  git stash save "작업 전 백업 $(date)"
  ```

### 6. 코드 주석 작성 규칙
- **모든 코드에 프로젝트의 의도와 맥락을 주석으로 남긴다**
- **주석 작성 필수 항목:**
  - 함수/컴포넌트의 목적과 역할
  - 복잡한 로직의 의도와 이유
  - 비즈니스 요구사항 및 배경
  - 주요 결정 사항과 트레이드오프
  - 알려진 제약사항 및 주의사항

**주석 작성 예시:**
```typescript
/**
 * 사용자 인증 및 권한 검증
 *
 * @purpose 네이버 OAuth를 통한 소셜 로그인 처리
 * @context 사용자는 별도 회원가입 없이 네이버 계정으로 로그인
 * @decision 카카오 로그인은 현재 준비 중으로 모달 표시
 * @note signIn은 next-auth/react에서 동적 import (초기 번들 크기 최적화)
 */
const handleSocialLogin = async (provider: SocialProvider) => {
  // 네이버만 실제 로그인 진행
  if (provider.id === 'naver') {
    const { signIn } = await import('next-auth/react');
    signIn('naver', { callbackUrl: redirect });
  } else {
    // 준비 중인 공급자는 안내 모달 표시
    setModalProvider(provider);
  }
};
```

### 7. 검증 체크리스트
코드 변경 시 반드시 확인:
- [ ] **의도와 맥락 주석 작성 완료**
- [ ] TDD 사이클 준수 (RED → GREEN → REFACTOR)
- [ ] 테스트 먼저 작성됨
- [ ] Playwright 테스트 통과
- [ ] TypeScript 컴파일 에러 없음
- [ ] ESLint 경고 없음
- [ ] 테스트 커버리지 70% 이상
- [ ] 디자인 변경사항 승인 받음
- [ ] 백업 파일 생성됨
- [ ] Git 상태 확인됨
- [ ] **보안 검사 통과** (하드코딩 없음)
- [ ] **환경변수 사용 확인**
- [ ] **민감 정보 노출 없음**

## 트러블슈팅 체크리스트

문제 발생 시 확인 순서:
1. Vercel 환경변수 확인
2. 줄바꿈 문자 제거 여부
3. MongoDB 연결 상태
4. Cloudflare R2 설정
5. 배포 상태 확인

## 아키텍처 문서
- 현재/개선 비교: `/docs/architecture-comparison.md`
- 시스템 구조도: `/docs/architecture.md`

## 주요 도메인
- **Business Voice**: 비즈니스 음성 서비스
- **Community**: 커뮤니티 기능
- **Expert**: 전문가 서비스
- **Policy**: 정책 분석

## 📝 Notion 작업 기록 관리

### 작업 진행 기록 규칙
- **모든 주요 작업 완료 시 Notion에 자동 기록**
- **중요 마일스톤마다 문서화 필수**
- **트러블슈팅 과정 상세 기록**
- **코드 변경사항 및 이유 명시**

### Notion 업로드 명령어
```bash
# 작업 완료 후 Notion에 기록
npm run notion:upload docs/작업내용.md 페이지ID

# 기본 페이지에 업로드 (2025-09-21-1354-나라똔홈페이지)
npm run notion:plan  # Admin 계획 문서
```

### ⚠️ Notion API 보안 규칙
- **절대 API 토큰 하드코딩 금지**
- **반드시 환경변수 사용**
  ```javascript
  // ❌ 절대 금지 - 하드코딩
  const NOTION_API_KEY = "ntn_xxxxxxxxxxxxx";
  const PAGE_ID = "275d286a3209805bb3deefd5625a6efe";

  // ✅ 올바른 방법 - 환경변수 사용
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const PAGE_ID = process.env.NOTION_PAGE_ID;
  ```
- **`.env.local`에만 API 키 저장**
- **Git 커밋 전 환경변수 확인 필수**

### 📋 트러블슈팅 기록 템플릿
**모든 문제 해결 후 반드시 다음 형식으로 Notion에 기록:**

```markdown
# 트러블슈팅: [문제 제목]

## 📅 타임라인
- **발생일**: YYYY-MM-DD HH:MM
- **해결일**: YYYY-MM-DD HH:MM
- **소요시간**: X시간 Y분

## 🔍 문제 상황
### 증상
- [구체적인 증상 설명]

### 에러 메시지
\`\`\`
[전체 에러 메시지]
\`\`\`

### 발생 환경
- OS:
- Node.js:
- 브라우저:
- 관련 패키지:

## 💡 원인 분석
### 근본 원인
- [문제의 근본 원인]

### 영향 범위
- [영향받은 기능/파일]

## 🛠️ 해결 과정
### 시도한 방법들
1. [첫 번째 시도] - 실패 이유
2. [두 번째 시도] - 부분 성공
3. [세 번째 시도] - 최종 해결

### 최종 해결 방법
\`\`\`javascript
// 해결 코드
\`\`\`

## 🚀 예방 조치
### 재발 방지 대책
- [구체적인 방지 방법]

### 모니터링 방안
- [어떻게 모니터링할 것인지]

## 📚 참고 자료
- [관련 문서 링크]
- [Stack Overflow 등 참고 링크]
```

### 자동 기록 워크플로우
```bash
# 1. 작업 시작 시 기록
echo "## $(date '+%Y-%m-%d %H:%M') - 작업 시작: [작업명]" >> docs/work-log.md

# 2. 작업 완료 시 Notion 업로드
node scripts/upload-to-notion.js docs/work-log.md 275d286a-3209-81ad-b8cf-cf84284f1a89

# 3. 트러블슈팅 발생 시 템플릿 생성
cp docs/templates/troubleshooting.md docs/troubleshooting/$(date +%Y%m%d)-이슈명.md
# 문제 해결 후 작성하여 Notion 업로드
```

### 필수 기록 항목
1. **기능 구현 완료**
   - 구현한 기능 명세
   - 사용된 기술/라이브러리
   - 테스트 결과

2. **버그 수정**
   - 버그 증상
   - 원인
   - 수정 방법
   - 영향 범위

3. **성능 개선**
   - 개선 전/후 측정치
   - 개선 방법
   - 벤치마크 결과

4. **보안 이슈**
   - 취약점 설명
   - 패치 내용
   - 검증 방법

## 개발 도구 명령어
```bash
# Mermaid 다이어그램 생성
npx mmdc -i docs/architecture.md -o diagram.png

# Prisma Studio (데이터베이스 관리)
npx prisma studio

# Playwright 테스트 (필수)
npx playwright test
npx playwright show-report

# DBML to SQL 변환
dbml2sql schema.dbml --postgres

# Python 아키텍처 다이어그램
python scripts/generate-architecture.py
```

## 코드 품질 명령어
```bash
# TDD 작업 플로우
npm test -- --watch  # 테스트 감시 모드
npm test -- --coverage  # 커버리지 확인

# 필수 검증 (모든 변경 후 실행)
npm run lint        # ESLint 검사
npm run type-check  # TypeScript 타입 체크
npx playwright test # E2E 테스트

# 빌드 검증
npm run build      # 프로덕션 빌드
npm run dev        # 개발 서버
```

## TDD 작업 예시
```typescript
// 1. 실패하는 테스트 먼저 작성 (__tests__/user.test.ts)
describe('User Service', () => {
  it('should create a new user', async () => {
    const user = await createUser({ name: 'Test' });
    expect(user.name).toBe('Test');
  });
});

// 2. 테스트 실행 → 실패 확인 (RED)
// npm test -- user.test.ts

// 3. 최소 코드로 테스트 통과 (GREEN)
// services/user.ts 구현

// 4. 리팩토링 (REFACTOR)
// 테스트 통과 유지하며 코드 개선
```

## 긴급 연락처

- Vercel Dashboard: https://vercel.com
- MongoDB Atlas: https://cloud.mongodb.com
- Cloudflare: https://dash.cloudflare.com
- Notion: https://www.notion.so

---
*이 문서는 Claude가 참조하는 기본 가이드입니다.*
*최종 업데이트: 2025-10-08*