# PRD: 관리자 권한 체크 시스템 리팩토링

## 1. 개요

### 1.1 배경
현재 관리자 권한 체크 로직이 여러 파일에 분산되어 있어 유지보수가 어렵고, `isAdmin` 플래그 도입 시 모든 파일을 개별 수정해야 하는 문제가 발생했습니다.

### 1.2 목표
- 권한 체크 로직을 **단일 소스**로 통합
- `isAdmin` 플래그와 `role` 기반 권한을 일관성 있게 처리
- 새로운 권한 요구사항 추가 시 **한 곳만 수정**

### 1.3 범위
- 기존 API 인터페이스 유지 (하위 호환성)

### 1.4 ⚠️ 절대 금지 사항 (Critical)

**네이버 로그인 로직 수정 금지**

```
절대 수정하면 안 되는 파일/영역:
├── app/auth-options.ts
│   ├── NaverProvider 설정
│   ├── signIn 콜백 (사용자 생성/업데이트)
│   └── JWT 토큰 생성 기본 로직
│
├── app/api/auth/[...nextauth]/route.ts
│   └── NextAuth 핸들러
│
└── 네이버 OAuth 관련 환경변수
    ├── NAVER_CLIENT_ID
    └── NAVER_CLIENT_SECRET
```

**이유:**
- 네이버 로그인 검증 로직 변경 시 **무한 리다이렉트** 발생
- 세션 생성/갱신 흐름이 깨지면 복구 어려움
- 과거 동일 문제로 장시간 디버깅 경험 있음

**허용되는 수정:**
- JWT 콜백에서 **DB 조회 후 토큰에 값 추가** (기존 패턴 유지)
- Session 콜백에서 **토큰 값을 세션에 복사** (기존 패턴 유지)

```typescript
// ✅ 허용: 기존 패턴 유지하며 값 추가
async jwt({ token, ... }) {
  // 기존 로직 유지
  if (dbUser) {
    token.role = dbUser.role;
    token.isAdmin = dbUser.isAdmin === true; // 값 추가만
  }
  return token;
}

// ❌ 금지: 인증 흐름 변경
async jwt({ token, ... }) {
  // 검증 로직 추가하면 안 됨
  if (!someCondition) {
    throw new Error('Unauthorized'); // 금지!
  }
}
```

---

## 2. 현재 상태 분석

### 2.1 권한 체크가 분산된 파일 목록

| 파일 | 체크 방식 | 문제점 |
|------|----------|--------|
| `app/admin/layout.tsx` | `role === 'admin' \|\| isAdmin` | API 호출 필요 |
| `app/admin/login/page.tsx` | `session.user.isAdmin \|\| role === 'admin'` | 세션 직접 체크 |
| `app/mypage/page.tsx` | `session.user.isAdmin \|\| role === 'admin'` | 세션 직접 체크 |
| `app/policy-news/admin/page.tsx` | `session.user.isAdmin \|\| role === 'admin'` | 세션 직접 체크 |
| `src/lib/auth/guards.ts` | `requireAdmin()`, `requirePerm()` | 서버 사이드 |
| `src/contexts/AuthContext.tsx` | `hasRole('admin')` | 클라이언트 사이드 |
| `src/components/Header.tsx` | `CanAccess role="admin"` | 컴포넌트 |
| `app/api/admin/check-session/route.ts` | DB 조회 | API |

### 2.2 현재 권한 판단 기준
```
관리자 = (role === 'admin') OR (role === 'super_admin') OR (isAdmin === true)
```

### 2.3 문제점
1. **중복 로직**: 동일한 권한 체크 로직이 10개 이상 파일에 분산
2. **불일치 위험**: 한 곳 수정 시 다른 곳 누락 가능
3. **테스트 어려움**: 권한 로직 변경 시 모든 파일 테스트 필요

---

## 3. 목표 아키텍처

### 3.1 통합 권한 체크 함수

```typescript
// lib/auth/admin-check.ts (신규)

/**
 * 관리자 권한 판단 - 단일 소스
 * 모든 관리자 권한 체크는 이 함수를 통해 수행
 */
export function isAdminUser(user: {
  role?: string;
  isAdmin?: boolean;
}): boolean {
  if (!user) return false;

  // isAdmin 플래그가 true면 관리자
  if (user.isAdmin === true) return true;

  // role이 admin 또는 super_admin이면 관리자
  if (user.role === 'admin' || user.role === 'super_admin') return true;

  return false;
}
```

### 3.2 적용 계층

```
┌─────────────────────────────────────────────────────┐
│                    클라이언트                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Header    │  │   MyPage    │  │ AdminLayout │ │
│  │ (CanAccess) │  │             │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┼────────────────┘        │
│                          ▼                         │
│              ┌─────────────────────┐               │
│              │    AuthContext      │               │
│              │  isAdminUser(user)  │               │
│              └──────────┬──────────┘               │
└─────────────────────────┼───────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────┐
│                    서버 사이드                       │
│                          ▼                         │
│              ┌─────────────────────┐               │
│              │   guards.ts         │               │
│              │  requireAdmin()     │               │
│              │  isAdminUser(user)  │               │
│              └──────────┬──────────┘               │
│                          │                         │
│              ┌───────────┴───────────┐             │
│              ▼                       ▼             │
│     ┌─────────────┐         ┌─────────────┐       │
│     │  API Routes │         │ check-session│       │
│     └─────────────┘         └─────────────┘       │
└─────────────────────────────────────────────────────┘
```

---

## 4. 구현 계획

### 4.1 Phase 1: 핵심 함수 생성 (우선순위: 높음)

**작업 내용:**
1. `lib/auth/admin-check.ts` 파일 생성
2. `isAdminUser()` 함수 구현
3. 단위 테스트 작성

**예상 영향:** 없음 (신규 파일)

### 4.2 Phase 2: 서버 사이드 통합 (우선순위: 높음)

**작업 내용:**
1. `src/lib/auth/guards.ts` 수정
   - `requireAdmin()` 에서 `isAdminUser()` 사용
   - `requirePerm()` 에서 `isAdminUser()` 사용
2. `app/api/admin/check-session/route.ts` 수정
   - `isAdminUser()` 사용하여 `isAdmin` 반환

**수정 파일:**
- `src/lib/auth/guards.ts`
- `app/api/admin/check-session/route.ts`

### 4.3 Phase 3: 클라이언트 사이드 통합 (우선순위: 중간)

**작업 내용:**
1. `src/contexts/AuthContext.tsx` 수정
   - `hasRole('admin')` 내부에서 `isAdminUser()` 사용
   - `user.isAdmin` 필드 추가
2. `src/components/CanAccess.tsx` 수정
   - `role="admin"` 체크 시 `isAdminUser()` 사용

**수정 파일:**
- `src/contexts/AuthContext.tsx`
- `src/components/CanAccess.tsx`

### 4.4 Phase 4: 개별 페이지 정리 (우선순위: 낮음)

**작업 내용:**
1. 각 페이지에서 직접 권한 체크하는 코드 제거
2. AuthContext 또는 CanAccess 컴포넌트 사용으로 통일

**수정 파일:**
- `app/admin/layout.tsx`
- `app/admin/login/page.tsx`
- `app/mypage/page.tsx`
- `app/policy-news/admin/page.tsx`
- `app/naraddon-tube/admin/page.tsx`
- `app/admin/users/page.tsx`

---

## 5. 상세 구현 명세

### 5.1 lib/auth/admin-check.ts

```typescript
/**
 * 관리자 권한 체크 유틸리티
 *
 * @purpose 모든 관리자 권한 판단을 단일 소스로 통합
 * @context isAdmin 플래그와 role 기반 권한을 모두 지원
 */

export interface AdminCheckUser {
  role?: string;
  isAdmin?: boolean;
}

/**
 * 관리자 권한 판단
 *
 * @param user 사용자 객체 (세션, DB 등에서 가져온)
 * @returns 관리자이면 true
 */
export function isAdminUser(user: AdminCheckUser | null | undefined): boolean {
  if (!user) return false;

  // isAdmin 플래그가 명시적으로 true인 경우
  if (user.isAdmin === true) return true;

  // role이 admin 또는 super_admin인 경우
  if (user.role === 'admin' || user.role === 'super_admin') return true;

  return false;
}

/**
 * 슈퍼 관리자 권한 판단
 *
 * @param user 사용자 객체
 * @returns 슈퍼 관리자이면 true
 */
export function isSuperAdminUser(user: AdminCheckUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'super_admin';
}
```

### 5.2 guards.ts 수정

```typescript
// 기존
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireLogin();
  if (user.isAdmin === true || user.role === 'admin' || user.role === 'super_admin') {
    return user;
  }
  throw new Error('FORBIDDEN');
}

// 변경 후
import { isAdminUser } from '@/lib/auth/admin-check';

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireLogin();
  if (isAdminUser(user)) {
    console.log('[requireAdmin] Access granted:', { email: user.email });
    return user;
  }
  console.warn('[requireAdmin] Access denied:', { email: user.email });
  throw new Error('FORBIDDEN');
}
```

### 5.3 AuthContext.tsx 수정

```typescript
// 기존
const hasRole = (role: string): boolean => {
  if (!user) return false;
  if (role === 'admin' && user.isAdmin) return true;
  return user.role === role || (user.role === 'admin' && role !== 'admin');
};

// 변경 후
import { isAdminUser } from '@/lib/auth/admin-check';

const hasRole = (role: string): boolean => {
  if (!user) return false;
  if (role === 'admin') return isAdminUser(user);
  return user.role === role;
};
```

---

## 6. 테스트 계획

### 6.1 단위 테스트

```typescript
// __tests__/lib/auth/admin-check.test.ts

describe('isAdminUser', () => {
  it('isAdmin이 true면 관리자', () => {
    expect(isAdminUser({ isAdmin: true, role: 'user' })).toBe(true);
  });

  it('role이 admin이면 관리자', () => {
    expect(isAdminUser({ role: 'admin' })).toBe(true);
  });

  it('role이 super_admin이면 관리자', () => {
    expect(isAdminUser({ role: 'super_admin' })).toBe(true);
  });

  it('둘 다 아니면 관리자 아님', () => {
    expect(isAdminUser({ role: 'user', isAdmin: false })).toBe(false);
  });

  it('null이면 관리자 아님', () => {
    expect(isAdminUser(null)).toBe(false);
  });
});
```

### 6.2 통합 테스트

1. 관리자 대시보드 접근 테스트
   - `isAdmin: true, role: user` → 접근 가능
   - `isAdmin: false, role: admin` → 접근 가능
   - `isAdmin: false, role: user` → 접근 불가

2. API 권한 테스트
   - `/api/admin/*` 엔드포인트 접근 테스트

---

## 7. 마이그레이션 체크리스트

### Phase 1 완료 조건
- [ ] `lib/auth/admin-check.ts` 생성
- [ ] `isAdminUser()` 함수 구현
- [ ] 단위 테스트 통과

### Phase 2 완료 조건
- [ ] `guards.ts`에서 `isAdminUser()` 사용
- [ ] `check-session` API에서 `isAdminUser()` 사용
- [ ] 서버 사이드 권한 체크 정상 동작

### Phase 3 완료 조건
- [ ] `AuthContext.tsx`에서 `isAdminUser()` 사용
- [ ] `CanAccess.tsx`에서 `isAdminUser()` 사용
- [ ] 클라이언트 사이드 권한 체크 정상 동작

### Phase 4 완료 조건
- [ ] 모든 페이지에서 직접 권한 체크 코드 제거
- [ ] 통합 테스트 통과
- [ ] 문서화 완료

---

## 8. 롤백 계획

각 Phase는 독립적으로 롤백 가능:
- Phase 1: 파일 삭제
- Phase 2~4: git revert 사용

---

## 9. 일정

| Phase | 예상 작업량 | 의존성 |
|-------|-----------|--------|
| Phase 1 | 파일 1개, 함수 2개 | 없음 |
| Phase 2 | 파일 2개 수정 | Phase 1 |
| Phase 3 | 파일 2개 수정 | Phase 1 |
| Phase 4 | 파일 6개 수정 | Phase 2, 3 |

---

---

## 10. 확장 요구사항: 전체 역할 권한 체계화

### 10.1 역할 정의

| 역할 | 코드 | 권한 범위 |
|------|------|----------|
| 슈퍼 관리자 | `super_admin` | 모든 권한 + 역할 부여 |
| 관리자 | `admin` 또는 `isAdmin: true` | 콘텐츠 관리, 사용자 조회 |
| 기업심사관 | `examiner` | 정책분석 작성, 심사 내역 |
| 전문가 | `expert` | 전문가 대시보드 |
| 일반 사용자 | `user` | 기본 기능 |

### 10.2 통합 역할 체크 함수

```typescript
// lib/auth/role-check.ts

export type UserRole = 'super_admin' | 'admin' | 'examiner' | 'expert' | 'user';

export interface RoleCheckUser {
  role?: string;
  isAdmin?: boolean;
}

/**
 * 역할 계층 (상위 역할은 하위 역할 권한 포함)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  examiner: 60,
  expert: 40,
  user: 20,
};

/**
 * 관리자 권한 판단
 */
export function isAdmin(user: RoleCheckUser | null): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  return user.role === 'admin' || user.role === 'super_admin';
}

/**
 * 슈퍼 관리자 권한 판단
 */
export function isSuperAdmin(user: RoleCheckUser | null): boolean {
  if (!user) return false;
  return user.role === 'super_admin';
}

/**
 * 심사관 권한 판단
 */
export function isExaminer(user: RoleCheckUser | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true; // 관리자는 심사관 권한 포함
  return user.role === 'examiner';
}

/**
 * 전문가 권한 판단
 */
export function isExpert(user: RoleCheckUser | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true; // 관리자는 전문가 권한 포함
  return user.role === 'expert';
}

/**
 * 특정 역할 이상인지 판단
 */
export function hasRoleOrHigher(user: RoleCheckUser | null, requiredRole: UserRole): boolean {
  if (!user) return false;
  if (user.isAdmin && requiredRole !== 'super_admin') return true;

  const userLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}
```

### 10.3 API 정리 대상

**현재 중복 API:**

| 기능 | 중복 파일 | 통합 방안 |
|------|----------|----------|
| 세션 체크 | `check-session`, `auth/session` | `check-session`으로 통합 |
| 사용자 조회 | `admin/users`, `users/[id]` | 경로 통합 |
| 역할 체크 | 각 페이지 개별 구현 | `role-check.ts` 사용 |

### 10.4 권한별 접근 가능 기능

```
┌────────────────────────────────────────────────────────────┐
│                        기능 매트릭스                        │
├──────────────────┬──────┬───────┬──────┬──────┬──────────┤
│       기능       │super │ admin │exami │expert│  user   │
│                  │admin │       │ner   │      │         │
├──────────────────┼──────┼───────┼──────┼──────┼──────────┤
│ 역할 부여/해제   │  ✓   │   -   │  -   │  -   │    -    │
│ 사용자 관리      │  ✓   │   ✓   │  -   │  -   │    -    │
│ 게시판 관리      │  ✓   │   ✓   │  -   │  -   │    -    │
│ 정책분석 작성    │  ✓   │   ✓   │  ✓   │  -   │    -    │
│ 정책소식 작성    │  ✓   │   ✓   │  ✓   │  -   │    -    │
│ 전문가 대시보드  │  ✓   │   ✓   │  -   │  ✓   │    -    │
│ 심사관 대시보드  │  ✓   │   ✓   │  ✓   │  -   │    -    │
│ 마이페이지       │  ✓   │   ✓   │  ✓   │  ✓   │    ✓    │
│ 콘텐츠 조회      │  ✓   │   ✓   │  ✓   │  ✓   │    ✓    │
└──────────────────┴──────┴───────┴──────┴──────┴──────────┘
```

---

## 11. 구현 계획 (확장)

### Phase 5: 역할 체크 통합 (Phase 1~4 완료 후)

**작업 내용:**
1. `lib/auth/role-check.ts` 생성
2. 모든 역할 체크 함수 통합
3. guards.ts에서 역할 체크 함수 사용

### Phase 6: 중복 API 정리

**작업 내용:**
1. 중복 API 식별 및 제거
2. 라우트 통합
3. 클라이언트 호출 코드 업데이트

### Phase 7: 문서화 및 테스트

**작업 내용:**
1. API 문서 업데이트
2. 역할별 접근 권한 문서화
3. E2E 테스트 작성

---

## 12. 최종 아키텍처

```
lib/auth/
├── role-check.ts      # 역할 판단 함수 (단일 소스)
├── guards.ts          # 서버 사이드 권한 가드
└── permissions.ts     # RBAC 퍼미션 (기존)

contexts/
└── AuthContext.tsx    # 클라이언트 사이드 권한 (role-check 사용)

components/
└── CanAccess.tsx      # 조건부 렌더링 (AuthContext 사용)

app/api/admin/
└── check-session/     # 세션 + 역할 정보 반환 (단일 API)
```

---

*문서 버전: 1.1*
*작성일: 2025-12-03*
*업데이트: 전체 역할 권한 체계화 추가*
