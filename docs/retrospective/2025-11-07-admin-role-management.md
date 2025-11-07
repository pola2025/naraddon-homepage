# 회고: 관리자 권한 관리 기능 버그 수정

**날짜**: 2025-11-07
**작업자**: Claude
**태그**: #retrospective #bugfix #admin #debugging

---

## 📋 작업 내용

### 1. Business Voice 영상 로딩 최적화 ✅
- InterviewSection을 Server Component로 변경
- MongoDB 직접 연결로 초기 로딩 속도 개선
- 이미지 최적화 (WebP/AVIF 자동 변환)
- **상태**: 배포 완료 (commit: ce29974)

### 2. 관리자 권한 관리 기능 버그 수정 ✅
- **문제 1**: 역할 변경 시 이메일 정보 사라지는 버그
- **문제 2**: 관리자 권한 회수 로직 미구현
- **상태**: 배포 완료 (commit: f76d927)

---

## ✅ 잘한 점

### 1. 체계적인 문제 분석
```javascript
// MongoDB 직접 확인 스크립트 작성
node scripts/check-user-role.js

// 결과:
// - 이재호(framei@naver.com): role="admin" ✓
// - MongoDB 데이터는 정상
// - 프론트엔드 문제로 범위 좁힘
```

**효과**: 백엔드/프론트엔드 중 어디가 문제인지 명확히 파악

### 2. 디버깅 로그 전략적 추가
```typescript
// 사용자 데이터 변환 시 로그
console.log('[이재호] API Response:', {
  role_from_api: user.role,
  role_formatted: formatted.role,
  UserRole_ADMIN: UserRole.ADMIN,
  match: formatted.role === UserRole.ADMIN
});

// 버튼 렌더링 시 로그
console.log('[이재호] role:', user.role, 'match:', user.role === UserRole.ADMIN);
```

**효과**: 데이터 흐름 추적으로 근본 원인 발견

### 3. 사용자 피드백 기반 진행
- "권한회수 버튼이 안 보임" → 즉시 디버깅 모드 진입
- "심사관 지정만 있음" → 페이지 위치 확인
- "백업해놔" → 즉시 백업 파일 생성

**효과**: 실시간 문제 파악 및 해결

### 4. 백업 중요성 인식
```bash
# Git에서 복구 가능하지만 추가 백업
git show HEAD~1:src/app/admin/users/page.tsx > backups/src-app-admin-users-page.tsx.backup
```

**효과**: 안전한 파일 관리

---

## ❌ 잘못한 점

### 1. 프로젝트 구조 미파악 (가장 큰 실수)

**문제**:
```
프로젝트에 두 개의 디렉토리 존재:
- app/admin/users/page.tsx      ← Next.js가 실제 사용 ✓
- src/app/admin/users/page.tsx  ← 사용 안 됨 (내가 수정한 곳 ✗)
```

**영향**:
- 1시간 이상 디버깅 시간 낭비
- 사용자 혼란 가중
- 불필요한 배포 3회 발생

**근본 원인**:
- 작업 전 `Glob` 도구로 파일 위치 확인하지 않음
- Next.js 프로젝트 구조 가정만으로 작업
- Read 도구로 실제 사용 파일 확인하지 않음

### 2. 로컬 테스트 없이 프로덕션 배포

**문제**:
```bash
# 내가 한 것:
git commit → git push naraddon main (바로 프로덕션 배포)

# 했어야 할 것:
npm run dev (로컬 테스트) → 확인 → 배포
```

**영향**:
- 프로덕션 환경에서 버그 발견
- 실사용자에게 영향
- Vercel 빌드 리소스 낭비

### 3. 중복 파일 사전 체크 누락

**문제**:
```bash
# 했어야 할 것:
find . -name "page.tsx" -path "*/admin/users/*" -not -path "*/node_modules/*"

# 또는
Glob: **/admin/users/page.tsx
```

**영향**:
- 같은 경로에 두 개 파일이 있다는 사실을 늦게 발견
- 어느 파일이 실제 사용되는지 모름

---

## 🔧 개선점

### 1. 작업 전 필수 체크리스트

```markdown
## 파일 수정 전 체크리스트 (신규 추가)

- [ ] 1. Glob으로 동일 경로 파일 검색
      `Glob: **/target/path/**/*.tsx`

- [ ] 2. 중복 파일이 있는 경우 실제 사용 파일 확인
      - next.config.js 확인
      - package.json 확인
      - tsconfig.json의 paths 확인

- [ ] 3. Read로 파일 내용 확인
      - 최신 수정일 확인
      - import 경로 확인

- [ ] 4. 로컬에서 npm run dev 실행
      - 수정한 파일이 실제 반영되는지 확인

- [ ] 5. 브라우저에서 동작 확인 후 배포
```

### 2. 프로젝트 구조 문서화

**생성할 문서**: `docs/project-structure.md`

```markdown
# 나라똔 프로젝트 구조

## Next.js 앱 디렉토리

**실제 사용**: `app/` (프로젝트 루트)
- app/admin/users/page.tsx ← 실제 라우트 파일
- app/api/admin/users/route.ts ← API 라우트

**사용 안 됨**: `src/app/`
- 레거시 디렉토리
- 삭제 예정

## 컴포넌트 디렉토리

**실제 사용**: `src/components/`
- src/components/admin/
- src/components/profile/

## 타입 정의

**실제 사용**: `src/types/`

## next.config.js 설정

```javascript
// 앱 디렉토리: app/ (기본값)
// src 디렉토리는 컴포넌트/유틸만 사용
```
```

### 3. 디버깅 스크립트 라이브러리 구축

**생성할 파일**: `scripts/debug/`

```bash
scripts/debug/
├── check-user-role.js        # 사용자 role 확인
├── check-file-usage.js        # 어느 파일이 실제 사용되는지 확인
├── check-duplicate-files.js   # 중복 파일 검색
└── test-api-endpoint.js       # API 엔드포인트 테스트
```

**예시**: `scripts/debug/check-file-usage.js`
```javascript
/**
 * 실제 사용되는 파일 경로 확인
 *
 * @usage node scripts/debug/check-file-usage.js admin/users/page.tsx
 */
const { execSync } = require('child_process');
const path = process.argv[2];

// 1. Glob으로 모든 후보 찾기
// 2. next.config.js 확인
// 3. 최근 수정일 비교
// 4. 실제 사용 파일 표시
```

### 4. 로컬 테스트 자동화

**추가할 GitHub Action 워크플로우**:

```yaml
# .github/workflows/test-before-deploy.yml
name: Test Before Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run build test
        run: npm run build
      - name: Run unit tests
        run: npm test
```

### 5. 에러 발생 시 표준 프로세스

```markdown
## 디버깅 표준 프로세스 (신규)

1. **증상 확인**
   - 사용자 보고 내용 정확히 파악
   - 스크린샷/로그 요청

2. **데이터 확인**
   - MongoDB 직접 확인 스크립트 실행
   - API 응답 확인 (Network 탭)

3. **코드 추적**
   - 디버깅 로그 추가
   - 데이터 흐름 추적

4. **구조 확인**
   - Glob으로 관련 파일 모두 검색
   - 실제 사용 파일 확인

5. **로컬 재현**
   - 로컬에서 동일 상황 재현
   - 수정 후 로컬 확인

6. **배포 및 검증**
   - 프로덕션 배포
   - 실제 환경에서 최종 확인
```

---

## 📊 메트릭

### 시간 소요
- **총 작업 시간**: ~2시간
- **디버깅 시간**: ~1.5시간 (잘못된 파일 수정으로 인한 낭비)
- **실제 수정 시간**: ~30분

### 배포 횟수
- **총 배포**: 6회
- **정상 배포**: 2회 (Business Voice, 최종 수정)
- **디버깅 배포**: 4회 (로그 추가, 파일 위치 수정 등)

### 효율성
- **이상적 시나리오**: 30분 (사전 체크 → 수정 → 배포)
- **실제 소요**: 2시간
- **효율성**: 25% ❌

---

## 🎯 액션 아이템

### 즉시 실행 (이번 주)
- [ ] `docs/project-structure.md` 문서 작성
- [ ] `scripts/debug/check-file-usage.js` 스크립트 작성
- [ ] 작업 전 체크리스트를 CLAUDE.md에 추가

### 단기 (이번 달)
- [ ] 중복 파일 정리 (`src/app/` vs `app/`)
- [ ] 디버깅 스크립트 라이브러리 구축
- [ ] GitHub Actions 워크플로우 추가

### 장기 (분기)
- [ ] 자동화된 파일 구조 체크 도구 개발
- [ ] 프로젝트 구조 리팩토링 (src/ 완전히 제거 또는 역할 명확화)

---

## 💡 배운 점

### 기술적 교훈

1. **프로젝트 구조 파악이 최우선**
   - Next.js는 `app/`과 `src/app/` 중 `app/`을 우선 사용
   - 작업 전 반드시 Glob으로 파일 위치 확인

2. **디버깅 로그의 힘**
   - 전략적으로 배치한 로그가 문제 해결의 열쇠
   - API Response → 데이터 변환 → UI 렌더링 각 단계마다 로그

3. **로컬 테스트의 중요성**
   - 프로덕션 배포는 최후의 수단
   - 로컬에서 먼저 확인하면 대부분의 실수 방지

### 협업 교훈

1. **사용자 피드백 경청**
   - "심사관 지정만 있음" → 다른 페이지 보고 있음
   - "백업해놔" → 안전장치 필요성 인식

2. **명확한 커뮤니케이션**
   - 작업 상황 투명하게 공유
   - 실수는 즉시 인정하고 수정

---

## 🔗 관련 링크

- [[2025-11-07-business-voice-optimization]] - Business Voice 최적화
- [[admin-role-management-architecture]] - 관리자 권한 시스템 구조
- [[debugging-best-practices]] - 디버깅 베스트 프랙티스

---

## 📝 다음 작업

- [ ] 신규가입자 전화번호 기록 이슈 점검
- [ ] 프로덕션 테스트 (영상 + 네이버 로그인)
- [ ] 프로젝트 구조 문서화

---

**작성일**: 2025-11-07
**마지막 수정**: 2025-11-07
**상태**: #completed #reviewed
