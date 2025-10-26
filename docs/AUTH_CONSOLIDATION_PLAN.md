# 인증 구조 통합 기획서 (옵션 A)

**작성일**: 2025-10-26
**목표**: authOptions 설정 일원화 (네이버 로그인 100% 보호)
**예상 소요 시간**: 30-40분
**위험도**: 🟡 중간 (단계별 롤백 가능)

---

## 🎯 목표 및 원칙

### 최종 목표
- ✅ `app/auth-options.ts` 하나로 모든 인증 처리 통합
- ✅ OAuthAccountNotLinked 에러 해결
- ✅ 네이버 로그인 100% 정상 작동 유지
- ✅ 권한 관리 (user, examiner, admin) 정상 작동
- ✅ 중복 파일 제거 (유지보수성 향상)

### 철칙
1. **네이버 로그인은 절대 건드리지 않음**
2. **각 단계마다 테스트 필수**
3. **문제 발생 시 즉시 롤백**
4. **사용자 승인 없이 다음 단계 진행 금지**

---

## 📊 현재 상태 분석

### 파일 현황
```
✅ app/auth-options.ts          (네이버 로그인, JWT만, Adapter 없음)
✅ lib/auth/authOptions.ts      (45개 API 사용, MongoDBAdapter 있음)
❌ lib/auth-options.ts          (중복, 사용처 불명)
❌ lib/lib/auth/authOptions.ts  (중복)
❌ src/lib/auth/authOptions.ts  (중복)
```

### 사용처
- **NextAuth 로그인**: `app/api/auth/[...nextauth]/route.ts` → `app/auth-options.ts`
- **45개 API**: `@/lib/auth/authOptions` 사용

### 핵심 문제
- NextAuth는 JWT만 사용 (accounts 테이블 없음)
- API들은 MongoDBAdapter 기대 (accounts 테이블 필요)
- → **OAuthAccountNotLinked 에러 발생**

---

## 🚀 단계별 실행 계획

---

## Phase 0: 준비 및 백업 (5분)

### 작업 내용
1. Git 상태 확인 및 커밋
2. 전체 프로젝트 백업
3. 테스트 계정 준비

### 체크리스트
- [ ] Git 상태 clean 확인
- [ ] 현재 브랜치 확인
- [ ] 백업 브랜치 생성: `backup/auth-before-consolidation`
- [ ] 작업 브랜치 생성: `feature/auth-consolidation`

### 커맨드
```bash
git status
git add -A
git commit -m "backup: auth consolidation 작업 전 상태"
git branch backup/auth-before-consolidation
git checkout -b feature/auth-consolidation
```

### 롤백 방법
```bash
git checkout main
git branch -D feature/auth-consolidation
```

### 성공 기준
- ✅ Git 상태 clean
- ✅ 백업 브랜치 생성됨
- ✅ 작업 브랜치에 있음

---

## Phase 1: app/auth-options.ts 강화 (10분)

### 작업 내용
`app/auth-options.ts`에 MongoDBAdapter 추가 (네이버 로그인 유지하면서)

### 변경 사항

#### Before (현재)
```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'naver',
      // ... 네이버 설정
    }
  ],
  callbacks: {
    // JWT, session 콜백
  }
}
```

#### After (수정 후)
```typescript
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: 'naraddon' }),
  providers: [
    {
      id: 'naver',
      // ... 네이버 설정 (변경 없음!)
    }
  ],
  callbacks: {
    // 기존 콜백 유지 + lib/auth/authOptions.ts의 추가 로직 병합
  }
}
```

### 주의사항
- ✅ 네이버 OAuth 설정은 **한 글자도 건드리지 않음**
- ✅ 기존 콜백 로직 100% 유지
- ✅ MongoDBAdapter만 추가

### 체크리스트
- [ ] `@next-auth/mongodb-adapter` import 추가
- [ ] `adapter` 설정 추가
- [ ] 기존 콜백 유지 확인
- [ ] TypeScript 컴파일 에러 없음

### 테스트 방법
```bash
# 1. 로컬 빌드 확인
npm run build

# 2. 타입 체크
npx tsc --noEmit
```

### 롤백 방법
```bash
git checkout app/auth-options.ts
```

### 성공 기준
- ✅ 빌드 성공
- ✅ TypeScript 에러 없음
- ✅ Git diff로 변경사항 확인

---

## Phase 2: 로컬 테스트 (5분)

### 작업 내용
로컬 환경에서 네이버 로그인 테스트

### 테스트 시나리오
1. 개발 서버 시작
2. 네이버 로그인 시도
3. 로그인 성공 확인
4. 세션 확인
5. 로그아웃

### 커맨드
```bash
# 개발 서버 시작
PORT=3000 npm run dev

# 브라우저 테스트
# 1. http://localhost:3000 접속
# 2. 네이버 로그인 클릭
# 3. 로그인 후 대시보드 확인
```

### 체크리스트
- [ ] 개발 서버 정상 시작
- [ ] 네이버 로그인 페이지 이동 성공
- [ ] 로그인 성공
- [ ] `/examiner/dashboard` 접근 가능 (심사관인 경우)
- [ ] 콘솔에 에러 없음

### 롤백 방법
Phase 1으로 돌아가서 수정 취소

### 성공 기준
- ✅ 네이버 로그인 100% 작동
- ✅ 기존 기능 모두 정상
- ✅ MongoDB에 accounts 테이블 생성됨

---

## Phase 3: 중복 파일 정리 (5분)

### 작업 내용
사용하지 않는 authOptions 파일 삭제

### 삭제 대상
```bash
lib/auth-options.ts              # 중복
lib/lib/auth/authOptions.ts      # 중복
src/lib/auth/authOptions.ts      # 중복
```

### 보류 (일단 유지)
```bash
lib/auth/authOptions.ts          # 45개 API가 사용 중 (Phase 4에서 처리)
```

### 체크리스트
- [ ] 삭제할 파일 사용처 없음 확인
- [ ] 파일 삭제
- [ ] Git status 확인

### 커맨드
```bash
# 사용처 확인
grep -r "lib/auth-options" app/api --include="*.ts"
grep -r "lib/lib/auth" app/api --include="*.ts"
grep -r "src/lib/auth" app/api --include="*.ts"

# 삭제
git rm lib/auth-options.ts
git rm lib/lib/auth/authOptions.ts
git rm src/lib/auth/authOptions.ts

# 커밋
git add -A
git commit -m "chore: 중복 authOptions 파일 제거"
```

### 롤백 방법
```bash
git reset --hard HEAD~1
```

### 성공 기준
- ✅ 중복 파일 삭제됨
- ✅ 빌드 에러 없음

---

## Phase 4: Import 경로 통일 (10분)

### 작업 내용
45개 API의 import 경로를 `app/auth-options`로 변경

### 현재 (Before)
```typescript
import { authOptions } from '@/lib/auth/authOptions';
```

### 변경 후 (After)
```typescript
import { authOptions } from '@/app/auth-options';
```

### 자동화 스크립트
```bash
# 모든 API 파일에서 import 경로 변경
find app/api -name "*.ts" -type f -exec sed -i "s|@/lib/auth/authOptions|@/app/auth-options|g" {} \;

# 또는
find app/api -name "*.ts" -type f -exec sed -i "s|from '@/lib/auth/authOptions'|from '@/app/auth-options'|g" {} \;
```

### 체크리스트
- [ ] 45개 파일 import 경로 변경
- [ ] TypeScript 컴파일 성공
- [ ] 빌드 성공

### 테스트 방법
```bash
# 변경된 파일 확인
git diff --stat

# 빌드 테스트
npm run build

# 타입 체크
npx tsc --noEmit
```

### 롤백 방법
```bash
git checkout app/api/
```

### 성공 기준
- ✅ 모든 API가 `app/auth-options` 사용
- ✅ 빌드 성공
- ✅ TypeScript 에러 없음

---

## Phase 5: lib/auth/authOptions.ts 삭제 (3분)

### 작업 내용
이제 사용하지 않는 `lib/auth/authOptions.ts` 삭제

### 체크리스트
- [ ] 사용처 없음 최종 확인
- [ ] 파일 삭제
- [ ] 빌드 테스트

### 커맨드
```bash
# 사용처 확인 (결과가 없어야 함)
grep -r "lib/auth/authOptions" app/ --include="*.ts"

# 삭제
git rm lib/auth/authOptions.ts

# 커밋
git add -A
git commit -m "chore: 사용하지 않는 lib/auth/authOptions.ts 제거"
```

### 롤백 방법
```bash
git reset --hard HEAD~1
```

### 성공 기준
- ✅ `lib/auth/authOptions.ts` 삭제됨
- ✅ 빌드 성공
- ✅ authOptions 파일이 `app/auth-options.ts` 하나만 존재

---

## Phase 6: 프로덕션 배포 및 테스트 (10분)

### 작업 내용
Vercel 프로덕션 환경 배포 및 최종 테스트

### 배포 전 체크리스트
- [ ] 로컬 테스트 모두 통과
- [ ] Git 상태 clean
- [ ] 커밋 메시지 명확

### 배포 커맨드
```bash
# main 브랜치에 병합
git checkout main
git merge feature/auth-consolidation

# 프로덕션 배포
git push naraddon main
```

### 프로덕션 테스트 (1-2분 대기 후)
1. https://naraddon.com 접속
2. 완전 로그아웃
3. 시크릿 모드로 접속
4. 네이버 로그인 테스트
5. 심사관 대시보드 접속 (`/examiner/dashboard`)
6. 브랜드 페이지 편집 버튼 확인

### 체크리스트
- [ ] Vercel 배포 성공
- [ ] 네이버 로그인 작동
- [ ] OAuthAccountNotLinked 에러 없음
- [ ] 심사관 기능 정상
- [ ] 브랜드 페이지 편집 버튼 표시

### 롤백 방법 (긴급)
```bash
git revert HEAD
git push naraddon main
```

### 성공 기준
- ✅ 네이버 로그인 100% 작동
- ✅ 모든 권한 관리 정상
- ✅ 브랜드 페이지 편집 가능
- ✅ 콘솔 에러 없음

---

## 📋 최종 체크리스트

### 기능 테스트
- [ ] 네이버 로그인/로그아웃
- [ ] 일반 사용자 권한
- [ ] 심사관 권한 (브랜드 페이지 편집)
- [ ] 관리자 권한
- [ ] 세션 유지

### 코드 품질
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공
- [ ] Lint 에러 없음
- [ ] 중복 코드 제거됨

### 파일 상태
- [ ] `app/auth-options.ts` 1개만 존재
- [ ] 중복 파일 모두 삭제
- [ ] Import 경로 통일

---

## 🚨 긴급 롤백 절차

### 전체 작업 취소
```bash
# feature 브랜치 삭제
git checkout main
git branch -D feature/auth-consolidation

# 백업 브랜치로 복원
git checkout backup/auth-before-consolidation
git checkout -b main-recovered
git push -f naraddon main-recovered:main
```

### 단계별 롤백
각 Phase의 "롤백 방법" 섹션 참조

---

## 📊 예상 결과

### Before (현재)
```
❌ OAuthAccountNotLinked 에러
❌ authOptions 파일 5개
❌ 설정 불일치
❌ 유지보수 어려움
```

### After (완료 후)
```
✅ 네이버 로그인 정상
✅ authOptions 파일 1개
✅ 설정 일원화
✅ 유지보수 간편
✅ 브랜드 페이지 편집 가능
```

---

## 💡 주의사항

1. **각 Phase마다 사용자 승인 필요**
2. **테스트 실패 시 즉시 중단**
3. **프로덕션 배포는 마지막에만**
4. **롤백 준비 항상 유지**

---

## 🎯 다음 단계

**Phase 0부터 시작합니다.**

각 Phase 완료 후 다음과 같이 보고:
- ✅ 완료 내용
- 📊 테스트 결과
- ⚠️ 발견된 문제 (있는 경우)
- ➡️ 다음 Phase 진행 승인 요청

**준비되면 "Phase 0 시작" 이라고 말씀해주세요!**
