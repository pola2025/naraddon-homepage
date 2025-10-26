# 인증 구조 분석 및 정리 계획

**작성일**: 2025-10-26
**목적**: 네이버 로그인을 보호하면서 권한 구조 정리

---

## 🔍 현재 상황 분석

### 1. authOptions 파일 현황

| 파일 경로 | 용도 | 상태 |
|---------|------|------|
| `app/auth-options.ts` | **NextAuth 진입점** (네이버 로그인) | ✅ 사용 중 (보호 필수) |
| `lib/auth/authOptions.ts` | 대부분의 API에서 사용 | ✅ 사용 중 |
| `lib/auth-options.ts` | ? | ❓ 확인 필요 |
| `lib/lib/auth/authOptions.ts` | 중복? | ❌ 삭제 대상 |
| `src/lib/auth/authOptions.ts` | 중복? | ❌ 삭제 대상 |

### 2. 사용처 매핑

**NextAuth 로그인 처리:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import { authOptions } from '../../../auth-options'; // ← 네이버 로그인 처리
```

**나머지 모든 API (45개):**
```typescript
import { authOptions } from '@/lib/auth/authOptions';
```

### 3. 주요 차이점

#### app/auth-options.ts (네이버 로그인용)
- ❌ MongoDBAdapter 없음 (JWT 전용)
- ✅ 네이버 OAuth 설정
- ✅ signIn, jwt, session 콜백
- ✅ examinerId 로직 포함

#### lib/auth/authOptions.ts (API용)
- ✅ MongoDBAdapter 있음
- ✅ 네이버 OAuth 설정
- ✅ 복잡한 콜백 (로그인 활동 추적 등)
- ✅ examinerId 로직 포함

---

## ⚠️ 문제점

1. **설정 이원화**
   - 로그인 처리: JWT 전용
   - API 처리: Database Adapter
   - → **일관성 없음**

2. **OAuthAccountNotLinked 에러 원인**
   - MongoDBAdapter가 있으면 accounts 테이블 사용
   - 없으면 JWT만 사용
   - 두 방식이 섞여서 계정 연결 실패

3. **중복 파일**
   - `lib/lib/`, `src/lib/` 등 불필요한 중복

---

## 🎯 정리 계획 (네이버 로그인 보호)

### 원칙
1. ✅ **네이버 로그인은 절대 건드리지 않음**
2. ✅ **단계별 안전한 마이그레이션**
3. ✅ **각 단계마다 테스트**

### 옵션 A: 두 파일 통합 (권장)

**목표**: `app/auth-options.ts`를 마스터로, `lib/auth/authOptions.ts` 내용 병합

**장점**:
- 설정 일원화
- 네이버 로그인 유지
- MongoDBAdapter 추가 가능

**단계**:
1. `app/auth-options.ts`에 MongoDBAdapter 추가
2. 모든 콜백 로직 병합 (중복 제거)
3. 다른 파일들을 `app/auth-options.ts` 참조하도록 변경
4. 테스트 후 중복 파일 삭제

### 옵션 B: 완전 분리 유지

**목표**: 네이버 로그인용과 API용을 명확히 분리

**장점**:
- 네이버 로그인 완전 격리
- 안전

**단점**:
- 설정 이원화 지속
- 유지보수 복잡

---

## 📋 실행 계획 (옵션 A 기준)

### Phase 1: 분석 및 백업
- [ ] 현재 동작 확인
- [ ] 전체 백업
- [ ] 테스트 환경 구축

### Phase 2: 통합 준비
- [ ] `app/auth-options.ts`에 MongoDBAdapter 추가
- [ ] 콜백 로직 병합
- [ ] examinerId 로직 통합

### Phase 3: 마이그레이션
- [ ] 모든 API가 통합된 설정 사용
- [ ] import 경로 통일

### Phase 4: 정리
- [ ] 중복 파일 삭제
- [ ] 문서화

### Phase 5: 검증
- [ ] 네이버 로그인 테스트
- [ ] 권한 관리 테스트
- [ ] 심사관 대시보드 테스트

---

## 🚨 리스크 관리

| 리스크 | 영향도 | 완화 방안 |
|--------|--------|----------|
| 네이버 로그인 중단 | 🔴 높음 | Phase별 롤백 포인트 |
| 기존 사용자 세션 무효화 | 🟡 중간 | 점진적 마이그레이션 |
| 권한 관리 오류 | 🟡 중간 | 단위 테스트 필수 |

---

## 💡 권장 사항

**즉시 조치**:
1. 중복 파일 삭제 (`lib/lib/`, `src/lib/`)
2. import 경로 통일

**단계적 조치**:
1. `app/auth-options.ts` 강화 (MongoDBAdapter 추가)
2. 모든 API 마이그레이션
3. `lib/auth/authOptions.ts` 삭제

---

## 📞 승인 필요

사용자 승인 후 다음 중 선택:
- [ ] 옵션 A: 통합 (권장)
- [ ] 옵션 B: 분리 유지
- [ ] 기타: _________________

**다음 단계**: 사용자 승인 후 Phase 1 시작
