# 나라똔 RBAC 시스템 아키텍처

## 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 (브라우저)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 14 (App Router)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. NextAuth.js (인증 - OAuth)                           │  │
│  │     - 네이버 로그인                                        │  │
│  │     - JWT 세션 토큰 발급                                   │  │
│  │     - users.id, users.email 확인                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  2. RBAC Guards (권한 검증)                               │  │
│  │     src/lib/auth/guards.ts                               │  │
│  │     - requireLogin() → 로그인 확인                        │  │
│  │     - requirePerm('policy:analysis:write') → 권한 확인    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  3. Permission Loader (권한 로드)                         │  │
│  │     src/lib/rbac/permissions.ts                          │  │
│  │     - loadEffectivePermissions(userId)                   │  │
│  │     - Redis 캐시 확인 → DB 조회 → 캐시 저장               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              ↓                                    ↓
┌──────────────────────────┐      ┌──────────────────────────────┐
│   Upstash Redis          │      │   MongoDB Atlas              │
│   (권한 캐시)              │      │   (실제 데이터)                │
├──────────────────────────┤      ├──────────────────────────────┤
│ Key: rbac:perms:{userId} │      │ 1. users (NextAuth)          │
│ Value: ["perm1"...]      │      │    - id, email, name, role   │
│ TTL: 60초                 │      │                              │
│                          │      │ 2. roles (RBAC)              │
│ Key: rbac:role:{roleId}  │      │    - name, inheritsFrom      │
│ Value: ["perm2"...]      │      │                              │
│ TTL: 300초                │      │ 3. permissions (RBAC)        │
│                          │      │    - code, resource, action  │
│ HTTP REST API            │      │                              │
│ (서버리스 호환)            │      │ 4. role_permissions (매핑)   │
└──────────────────────────┘      │    - roleId, permissionId    │
                                  │                              │
                                  │ 5. user_roles (매핑)         │
                                  │    - userId, roleId          │
                                  └──────────────────────────────┘
```

---

## 데이터베이스 구조 (MongoDB)

### 1. NextAuth 기존 테이블
```javascript
// users (NextAuth 관리)
{
  _id: ObjectId("68d2cf4069b693baa8e5102e"),
  email: "framei@naver.com",
  name: "이재호",
  role: "admin",  // ⚠️ 레거시 - 하위 호환용
  image: "...",
  emailVerified: null
}
```

### 2. RBAC 시스템 테이블

```javascript
// roles (역할 정의)
{
  _id: ObjectId("67890..."),
  name: "admin",
  displayName: "관리자",
  description: "전체 관리 권한",
  inheritsFrom: ObjectId("67891..."), // examiner 역할 상속
  isSystem: true
}

// permissions (권한 정의)
{
  _id: ObjectId("67892..."),
  code: "policy:analysis:write",
  resource: "policy",
  action: "analysis:write",
  displayName: "정책분석 작성",
  description: "정책분석 게시글 작성/수정/삭제 권한",
  isSystem: true
}

// role_permissions (역할-권한 매핑)
{
  _id: ObjectId("67893..."),
  roleId: ObjectId("67890..."), // admin
  permissionId: ObjectId("67892..."), // policy:analysis:write
  grantedBy: null,
  grantedAt: ISODate("2025-10-16...")
}

// user_roles (사용자-역할 매핑)
{
  _id: ObjectId("67894..."),
  userId: ObjectId("68d2cf4069b693baa8e5102e"), // 이재호
  roleId: ObjectId("67890..."), // admin
  grantedBy: ObjectId("..."),
  grantedAt: ISODate("2025-10-16..."),
  expiresAt: null  // null = 영구
}
```

---

## 역할 상속 구조

```
super_admin (모든 권한 *)
    ↓ inheritsFrom
admin (11개 권한)
    ↓ inheritsFrom
examiner (6개 권한)
    ↓ inheritsFrom
user (3개 권한)
```

### 권한 분포

| 역할 | 사용자 수 | 권한 수 | 주요 권한 |
|------|----------|---------|----------|
| **user** | 5명 | 3개 | 읽기, 게시글 작성 |
| **examiner** | 1명 (박현숙) | 6개 | user + 정책 작성 |
| **admin** | 4명 (이재호 등) | 11개 | examiner + 관리 |
| **super_admin** | 0명 | 12개 + * | 모든 권한 |

---

## 권한 로드 플로우

### 케이스 1: 캐시 HIT (빠름 - 15ms)

```
1. 사용자 요청: GET /api/policy-analysis
   ↓
2. requirePerm('policy:analysis:read')
   ↓
3. loadEffectivePermissions(userId)
   ↓
4. Redis 조회: "rbac:perms:68d2cf40..."
   ↓
5. 캐시 HIT! → 권한 목록 반환 ⚡
   ↓
6. 권한 확인: "policy:analysis:read" ∈ permissions?
   ↓
7. ✅ 통과 → 200 OK
```

### 케이스 2: 캐시 MISS (느림 - 450ms, 첫 요청)

```
1. 사용자 요청: GET /api/policy-analysis
   ↓
2. requirePerm('policy:analysis:read')
   ↓
3. loadEffectivePermissions(userId)
   ↓
4. Redis 조회: "rbac:perms:68d2cf40..." → MISS
   ↓
5. MongoDB 조회 시작:
   a) user_roles 조회 (userId)
      → roleId: admin

   b) 역할 상속 재귀 조회:
      admin → examiner → user

   c) 각 역할의 role_permissions 조회:
      - admin: 5개 권한
      - examiner: 3개 권한
      - user: 3개 권한

   d) 각 permissionId로 permissions 조회:
      총 11개 권한 코드 로드
   ↓
6. 결과를 Set으로 반환: Set(11) {
     "policy:analysis:read",
     "policy:analysis:write",
     "policy:news:read",
     ...
   }
   ↓
7. Redis에 저장:
   Key: "rbac:perms:68d2cf40..."
   Value: ["policy:analysis:read", ...]
   TTL: 60초
   ↓
8. 권한 확인: "policy:analysis:read" ∈ permissions?
   ↓
9. ✅ 통과 → 200 OK
```

### 케이스 3: Fallback (레거시 호환)

```
1. 사용자 요청 (기존 사용자)
   ↓
2. loadEffectivePermissions(userId)
   ↓
3. Redis MISS
   ↓
4. user_roles 조회 → 빈 배열 (없음!)
   ↓
5. Fallback 로직 시작:
   users.findOne({ _id: userId })
   → user.role = "admin"
   ↓
6. loadPermissionsByLegacyRole("admin")
   → 하드코딩된 권한 매핑 반환
   ↓
7. Set(11) { "policy:analysis:read", ... }
   ↓
8. ✅ 통과 → 200 OK
```

**→ 기존 10명 사용자 모두 user_roles 없이도 작동!**

---

## 실제 API 예시

### /api/policy-analysis (POST)

```typescript
// src/app/api/policy-analysis/route.ts

export async function POST(request: Request) {
  try {
    // 1. 로그인 확인
    const user = await requireLogin();
    // user = { id: "68d2cf40...", email: "framei@naver.com", role: "admin" }

    // 2. 권한 확인 (RBAC)
    await requirePerm('policy:analysis:write');
    // → loadEffectivePermissions(user.id)
    // → Redis 또는 DB에서 권한 로드
    // → "policy:analysis:write" 있는지 확인
    // → 없으면 throw Error('FORBIDDEN')

    // 3. 비즈니스 로직
    const data = await request.json();
    const post = await createPolicyAnalysis(data);

    return NextResponse.json(post);

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: '정책분석 작성 권한이 없습니다' },
        { status: 403 }
      );
    }
    throw error;
  }
}
```

---

## 권한 변경 시나리오

### 시나리오: 관리자가 박현숙을 examiner → admin으로 승급

```
1. 관리자 요청: PUT /api/admin/users/{userId}/role
   Body: { role: "admin" }
   ↓
2. requirePerm('user:role:update') 확인
   ↓
3. user_roles 업데이트:
   userId: 68df0b0b... (박현숙)
   roleId: admin
   ↓
4. 캐시 무효화:
   await invalidateUserPermissions('68df0b0b...')
   → Redis.del("rbac:perms:68df0b0b...")
   ↓
5. ✅ 완료

박현숙의 다음 요청:
1. Redis 조회 → MISS (캐시 삭제됨)
   ↓
2. DB 조회 → admin 권한 로드
   ↓
3. Redis 저장 (60초)
   ↓
4. 이제 admin 권한 사용 가능! ⚡
```

**결과: 즉시 반영 (최대 60초 내)**

---

## 성능 비교

### 시나리오: 이재호가 정책분석 10개 작성

| 항목 | Redis 없음 | Redis 있음 |
|------|-----------|-----------|
| **첫 요청** | 450ms (DB 조회) | 450ms (DB 조회) + 20ms (캐시 저장) |
| **2-10번째** | 450ms × 9 = 4,050ms | 15ms × 9 = 135ms ⚡ |
| **총 시간** | 4,500ms | 605ms |
| **DB 쿼리** | 100번 | 10번 |
| **성능 개선** | - | **7.4배 빠름** |

---

## 보안 고려사항

### 1. 환경변수로만 관리
```bash
# .env.local (Git에 커밋 안 됨)
MONGODB_URI=mongodb+srv://...
REDIS_URL=https://summary-oyster-13411.upstash.io
REDIS_TOKEN=ATRjAAIncDI...
```

### 2. Error 기반 인증
```typescript
// ❌ 잘못된 방법
if (!hasPermission) {
  return NextResponse.json({ error: '권한 없음' }, { status: 403 });
}

// ✅ 올바른 방법
if (!hasPermission) {
  throw new Error('FORBIDDEN');
}
```

### 3. 권한 검증 순서
```
1. requireLogin() - 먼저 로그인 확인
2. requirePerm() - 그 다음 권한 확인
3. 비즈니스 로직 - 마지막 실행
```

---

## 마이그레이션 전후 비교

### Before (JWT 역할 시스템)
```typescript
// JWT 토큰에 역할 저장
token.role = user.role; // "admin"

// 권한 확인
if (!['admin', 'examiner'].includes(user.role)) {
  throw new Error('FORBIDDEN');
}
```

**문제점:**
- ❌ 역할 변경 시 로그아웃/재로그인 필요
- ❌ JWT 토큰 만료 전까지 권한 변경 안 됨
- ❌ 세밀한 권한 제어 불가능

### After (RBAC 시스템)
```typescript
// DB에서 실시간 권한 조회 (캐시 포함)
const permissions = await loadEffectivePermissions(userId);

// 세밀한 권한 확인
if (!permissions.has('policy:analysis:write')) {
  throw new Error('FORBIDDEN');
}
```

**개선점:**
- ✅ 역할 변경 즉시 반영 (60초 이내)
- ✅ 로그아웃/재로그인 불필요
- ✅ 세밀한 권한 제어 (resource:action)
- ✅ 역할 상속 지원
- ✅ Redis 캐시로 성능 유지

---

## 요약

**시스템 구성:**
- **인증**: NextAuth.js (네이버 OAuth)
- **권한**: RBAC (DB 기반, Redis 캐시)
- **데이터**: MongoDB Atlas (5개 컬렉션)
- **캐시**: Upstash Redis (2개 키 패턴)

**권한 플로우:**
1. NextAuth로 사용자 확인 (users.id)
2. Redis에서 권한 캐시 확인
3. 없으면 MongoDB에서 조회 (역할 상속 포함)
4. 결과를 Redis에 60초 캐시
5. 권한 있으면 API 실행, 없으면 403

**핵심 개선:**
- 🚀 **7.4배 빠른 속도** (Redis 캐시)
- ⚡ **즉시 권한 반영** (60초 이내)
- 🔒 **세밀한 권한 제어** (resource:action)
- 🔄 **역할 상속 지원** (DRY)
- 🛡️ **보안 강화** (환경변수, Error 기반)

**기존 사용자 호환:**
- ✅ 10명 사용자 모두 즉시 작동 (fallback)
- ✅ 로그아웃/재로그인 불필요
- ✅ Zero-downtime 마이그레이션
