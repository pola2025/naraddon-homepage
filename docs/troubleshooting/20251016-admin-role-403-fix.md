# 트러블슈팅: 관리자 Role 403 오류 해결

## 📅 타임라인
- **발생일**: 2025-10-16
- **해결일**: 2025-10-16
- **소요시간**: 약 2시간

## 🔍 문제 상황

### 증상
- 관리자 대시보드 → 사용자 관리 페이지에서 사용자 목록이 표시되지 않음
- 브라우저 콘솔에서는 `role: "admin"`으로 표시됨
- API 요청 시 403 Forbidden 오류 발생

### 에러 메시지
```
GET https://naraddon.com/api/admin/users 403 (Forbidden)
[AdminLayout] User role: admin
```

### 발생 환경
- **사용자**: framei@naver.com (관리자 계정)
- **DB**: MongoDB에 `role: "admin"` 정상 저장됨
- **프론트엔드**: 세션에서 role이 "admin"으로 표시됨
- **백엔드**: API에서 role이 undefined로 인식됨

## 💡 원인 분석

### 1차 원인 분석 (잘못된 진단)
처음에는 관리자 사용자 목록 API 응답 구조 문제로 판단:
- API가 `{ users: [...], total, limit, skip }` 구조로 반환
- 프론트엔드에서 `data.map()` 호출 (data는 객체, 배열 아님)

**결과**: 이 문제를 수정했지만 403 오류는 여전히 발생

### 2차 원인 분석
세션 콜백 문제로 판단:
- JWT 토큰에 `role: undefined`
- 세션에도 `role: undefined`
- DB에만 `role: "admin"` 존재

**시도한 해결책**:
1. `lib/auth/authOptions.ts`의 세션 콜백 수정 → 실패
2. 로그아웃 후 재로그인 → 실패 (여전히 role undefined)

### 근본 원인 (최종 발견)
**NextAuth가 사용하는 설정 파일과 우리가 수정하는 파일이 달랐음!**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { authOptions } from '../../../auth-options';  // ← app/auth-options.ts 사용

// 우리가 수정하고 있던 파일
// lib/auth/authOptions.ts  ← 잘못된 파일!
```

**실제 문제**:
- `app/auth-options.ts`의 JWT 콜백이 DB에서 role을 조회하지 않음
- 따라서 JWT 토큰에 role이 포함되지 않음
- 세션 콜백도 token에서 role을 가져오지 못함

## 🛠️ 해결 과정

### 시도 1: 프론트엔드 API 응답 구조 수정 ✅
**파일**: `src/app/admin/users/page.tsx`

**문제**: API 응답을 배열로 잘못 처리
```typescript
// ❌ 이전 코드
const data = await response.json();
const formattedUsers = data.map((user: any) => ({ ... }));

// ✅ 수정 후
const data = await response.json();
const userList = data.users || [];  // users 배열 추출
const formattedUsers = userList.map((user: any) => ({ ... }));
```

**결과**: API 호출은 성공하지만 여전히 403 오류

### 시도 2: 세션 콜백에 DB 조회 추가 (잘못된 파일) ❌
**파일**: `lib/auth/authOptions.ts` (잘못된 파일!)

```typescript
async session({ session, token }) {
  let userRole = token.role as UserRole;
  
  if (!userRole) {
    // DB에서 role 조회
    const dbUser = await db.collection('users').findOne(
      { email: token.email as string },
      { projection: { role: 1 } }
    );
    
    if (dbUser?.role) {
      userRole = dbUser.role as UserRole;
    }
  }
  
  session.user.role = userRole;
  return session;
}
```

**결과**: 배포했지만 적용되지 않음 (잘못된 파일을 수정했기 때문)

### 시도 3: Admin API에 직접 DB 조회 추가 (임시 해결책) ⚠️
**파일**: `app/api/admin/users/route.ts`

```typescript
// 관리자 권한 확인
let userRole = (session.user as any)?.role;

// 🔥 HOTFIX: role이 undefined인 경우 DB에서 직접 조회
if (!userRole) {
  const dbUser = await db.collection('users').findOne(
    { email: session.user.email },
    { projection: { role: 1 } }
  );
  
  if (dbUser?.role) {
    userRole = dbUser.role;
  }
}
```

**결과**: 이것도 효과 없음 (NextAuth 설정 자체가 문제)

### 시도 4: 올바른 파일 수정 (최종 해결) ✅
**파일**: `app/auth-options.ts` (올바른 파일!)

**JWT 콜백 수정**:
```typescript
async jwt({ token, account, profile, user }) {
  if (account && profile) {
    token.provider = 'naver';
    token.providerId = profile.response?.id;
  }
  if (user) {
    token.email = user.email;
  }

  // 🔥 FIX: MongoDB에서 role 조회하여 token에 저장
  if (token.email) {
    try {
      const client = await clientPromise;
      const db = client.db('naraddon');
      const dbUser = await db.collection('users').findOne(
        { email: token.email as string },
        { projection: { role: 1, _id: 1 } }
      );
      if (dbUser) {
        token.role = dbUser.role || 'user';
        token.id = dbUser._id.toString();
        console.log('[JWT Callback] Role set from DB:', token.role);
      }
    } catch (error) {
      console.error('[JWT Callback] Error fetching role:', error);
    }
  }

  return token;
}
```

**세션 콜백 단순화**:
```typescript
async session({ session, token }) {
  if (session.user) {
    (session.user as any).provider = token.provider;
    (session.user as any).providerId = token.providerId;

    // JWT 토큰에서 role 가져오기 (이미 JWT 콜백에서 DB 조회함)
    (session.user as any).role = token.role || 'user';
    (session.user as any).id = token.id;

    console.log('[Session Callback] Role from token:', token.role);
  }
  return session;
}
```

## ✅ 검증

### 재로그인 전 상태
```json
{
  "token": {
    "email": "framei@naver.com",
    "roleType": "undefined"  // ❌ 문제
  },
  "session": {
    "email": "framei@naver.com",
    "roleType": "undefined"  // ❌ 문제
  },
  "database": {
    "email": "framei@naver.com",
    "role": "admin"  // ✅ DB는 정상
  },
  "comparison": {
    "isAdmin": false,  // ❌ 문제
    "dbIsAdmin": true
  }
}
```

### 재로그인 후 상태 (해결 완료)
```json
{
  "token": {
    "email": "framei@naver.com",
    "role": "admin",  // ✅ 해결!
    "roleType": "string"
  },
  "session": {
    "email": "framei@naver.com",
    "role": "admin",  // ✅ 해결!
    "roleType": "string"
  },
  "database": {
    "email": "framei@naver.com",
    "role": "admin"
  },
  "comparison": {
    "tokenRole": "admin",
    "sessionRole": "admin",
    "dbRole": "admin",
    "tokenMatchesDb": true,  // ✅ 완벽!
    "sessionMatchesDb": true,  // ✅ 완벽!
    "isAdmin": true,  // ✅ 해결!
    "tokenIsAdmin": true  // ✅ 해결!
  }
}
```

## 🚀 예방 조치

### 1. 파일 구조 정리
**현재 상태**:
```
app/auth-options.ts          ← NextAuth가 실제로 사용 ✅
lib/auth/authOptions.ts      ← 사용되지 않음 (삭제 또는 통합 필요)
```

**권장 사항**:
- 중복된 authOptions 파일 제거
- 하나의 소스로 통합 (예: `lib/auth/authOptions.ts`를 유일한 소스로)
- `app/api/auth/[...nextauth]/route.ts`에서 올바른 경로 import

### 2. NextAuth 설정 파일 명확화
```typescript
// app/api/auth/[...nextauth]/route.ts
// ✅ 명확한 import 경로 사용
import { authOptions } from '@/lib/auth/authOptions';  // 절대 경로 사용
// import { authOptions } from '../../../auth-options';  // 상대 경로는 혼란 초래
```

### 3. JWT 콜백 필수 체크리스트
JWT 콜백에서 반드시 포함해야 할 항목:
- ✅ `token.email`
- ✅ `token.role` (DB에서 조회)
- ✅ `token.id` (사용자 _id)
- ✅ `token.provider`

### 4. 디버그 API 유지
`/api/debug/session` 엔드포인트를 유지하여 언제든지 세션 상태 확인 가능:
```typescript
// app/api/debug/session/route.ts
// token, session, database 정보를 모두 비교 가능
```

### 5. 모니터링 로그 추가
```typescript
// JWT 콜백과 세션 콜백에 상세한 로그 추가
console.log('[JWT Callback] Role set from DB:', token.role);
console.log('[Session Callback] Role from token:', token.role);
```

## 📚 학습 포인트

### 1. NextAuth 설정 파일 위치 확인의 중요성
- NextAuth가 실제로 어떤 파일을 사용하는지 확인 필수
- `app/api/auth/[...nextauth]/route.ts`의 import 경로 확인

### 2. JWT vs 세션의 차이
- **JWT 콜백**: 매 요청마다 실행, token 객체 업데이트
- **세션 콜백**: 클라이언트에 전달할 세션 객체 생성
- JWT에 role을 저장해야 세션에서도 사용 가능

### 3. 디버깅 도구의 중요성
- `/api/debug/session` 같은 디버그 엔드포인트가 문제 해결에 결정적 도움
- token, session, database를 동시에 비교할 수 있어야 함

### 4. 로그아웃/재로그인의 필요성
- JWT는 stateless이므로 서버에서 무효화 불가
- 설정 변경 후 새로운 JWT를 받으려면 재로그인 필수

## 🔗 관련 커밋

1. `fix: 관리자 사용자 목록 API 응답 구조 수정`
   - 프론트엔드 API 응답 파싱 오류 수정

2. `hotfix: Admin Users API에서 role undefined 시 DB 직접 조회`
   - 임시 해결책 (결국 효과 없었음)

3. `fix: JWT 콜백에 DB role 조회 추가 - 진짜 문제 해결!` ✅
   - 근본 원인 해결
   - 올바른 파일(`app/auth-options.ts`) 수정

## 📋 체크리스트 (향후 유사 문제 발생 시)

- [ ] NextAuth 설정 파일 위치 확인 (`app/api/auth/[...nextauth]/route.ts`의 import 확인)
- [ ] JWT 콜백에서 DB role 조회 여부 확인
- [ ] 디버그 API로 token, session, DB 비교
- [ ] 로그아웃 후 재로그인 시도
- [ ] Vercel 로그에서 실제 실행되는 코드 확인
- [ ] 중복 설정 파일 존재 여부 확인

---

**최종 업데이트**: 2025-10-16
**작성자**: Claude (AI Assistant)
**검증자**: framei@naver.com
