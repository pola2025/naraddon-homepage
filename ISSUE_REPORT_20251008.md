# 사용자 발견 이슈 보고서

**일시**: 2025-10-08 12:35 KST
**검증자**: 사용자 + Claude Code
**우선순위**: High

---

## 📋 발견된 문제

### 1. ✅ [수정 완료] 묻고 답하기 클릭 시 404 에러

#### 문제 설명
- **증상**: 사업자 목소리 페이지에서 "묻고 답하기" 관련 링크 클릭 시 404 Not Found 에러 발생
- **영향 범위**: `/business-voice/qna/*` 전체 라우트

#### 원인 분석
```
원인: Next.js App Router 디렉토리 구조 불일치

프로젝트 구조 문제:
- app/business-voice/ 디렉토리 존재 (우선순위 높음)
- src/app/business-voice/qna/ 디렉토리에만 페이지 존재
- Next.js는 app/ 우선, qna 서브디렉토리가 없어서 404 반환
```

#### 해결 방법
```bash
# src/app/business-voice/qna/ → app/business-voice/qna/ 복사
cp -r src/app/business-voice/qna app/business-voice/
```

#### 검증 결과
```bash
# 테스트 전
curl -I http://localhost:3000/business-voice/qna
→ HTTP/1.1 404 Not Found

# 수정 후
curl -I http://localhost:3000/business-voice/qna
→ HTTP/1.1 200 OK ✅

curl -I http://localhost:3000/business-voice/qna/68e5d3698f5ea84eaeced176
→ HTTP/1.1 200 OK ✅

curl -I http://localhost:3000/business-voice/qna/write
→ HTTP/1.1 200 OK ✅
```

#### 영향받은 경로
- ✅ `/business-voice/qna` (목록 페이지)
- ✅ `/business-voice/qna/[id]` (상세 페이지)
- ✅ `/business-voice/qna/write` (작성 페이지)

**상태**: ✅ 수정 완료 (2025-10-08 12:35)

---

### 2. ⚠️ [검증 필요] 똔톡 작성하기 인증 로직 미구현

#### 문제 설명
- **증상**: "똔톡 작성하기" 버튼 클릭 시 항상 "회원가입 후 작성 가능합니다" 알림 표시
- **사용자 질문**: 실제 가입 및 로그인 상태에서도 동일하게 나오는지 검증 필요
- **영향**: 로그인한 사용자도 게시글 작성 불가능

#### 현재 코드 분석

**위치**: `src/components/business-voice/TtontokCompact.tsx:101-104`

```typescript
const handleWriteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  alert('회원가입 후 작성 가능합니다.');
};
```

**문제점**:
1. ❌ 로그인 상태 체크 없음
2. ❌ 세션/인증 확인 로직 없음
3. ❌ 항상 동일한 알림 메시지 표시
4. ❌ 실제 작성 페이지로 이동하지 않음

#### 기대 동작
```typescript
// 올바른 동작
const handleWriteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();

  // 1. 로그인 상태 확인
  if (!session || !user) {
    alert('회원가입 후 작성 가능합니다.');
    // 로그인 페이지로 리다이렉트
    router.push('/login?returnUrl=/business-voice/ttontok/write');
    return;
  }

  // 2. 로그인한 경우 작성 페이지로 이동
  router.push('/business-voice/ttontok/write');
};
```

#### 추가 확인 사항

**작성 페이지 존재 여부**:
- ✅ `/app/business-voice/ttontok/write/page.tsx` 존재
- ✅ 작성 폼 구현됨
- ✅ 닉네임/비밀번호 기반 인증 사용

**현재 인증 방식**:
작성 페이지는 **비회원 작성 가능** 구조:
- 닉네임 입력 (필수)
- 비밀번호 입력 (필수, 수정/삭제 시 사용)
- 회원 인증 불필요

#### 모순점 발견

```
TtontokCompact 컴포넌트:
  → "회원가입 후 작성 가능" 알림

실제 작성 페이지:
  → 닉네임/비밀번호만 있으면 작성 가능 (비회원 OK)
```

**결론**: 로직 불일치 발견

#### 권장 수정 방안

##### 옵션 A: 비회원 작성 허용 (현재 페이지 구조 유지)
```typescript
// TtontokCompact.tsx
const handleWriteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  // 직접 작성 페이지로 이동
  router.push('/business-voice/ttontok/write');
};
```

**변경 필요**:
```diff
- <a href="#" onClick={handleWriteClick} className="write-btn">
+ <Link href="/business-voice/ttontok/write" className="write-btn">
    <i className="fas fa-edit" /> 똔톡 작성하기
- </a>
+ </Link>
```

##### 옵션 B: 회원 전용으로 변경
```typescript
// 1. NextAuth 세션 사용
import { useSession } from 'next-auth/react';

const { data: session } = useSession();

const handleWriteClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();

  if (!session) {
    alert('회원가입 후 작성 가능합니다.');
    router.push('/login?returnUrl=/business-voice/ttontok/write');
    return;
  }

  router.push('/business-voice/ttontok/write');
};
```

**변경 필요**:
- 작성 페이지에서 닉네임 자동 입력 (세션에서 가져오기)
- 비밀번호 필드 제거 (회원 인증으로 대체)

#### 우선순위

**긴급도**: Medium
**중요도**: High
**추천**: 옵션 A (빠른 수정, 기존 구조 유지)

**상태**: ⚠️ 수정 대기 (사용자 의사결정 필요)

---

## 🔍 근본 원인 분석

### 1. 디렉토리 구조 불일치
```
문제: app/ 와 src/app/ 혼재 사용
영향: 라우팅 404 에러

해결: 일관된 디렉토리 사용 필요
```

### 2. 기획-구현 불일치
```
문제: 메시지("회원가입 필요") ≠ 실제 기능(비회원 가능)
영향: 사용자 혼란, 기능 사용 불가

해결: 비즈니스 로직 명확화 필요
```

---

## 📊 영향 분석

| 문제 | 심각도 | 영향 범위 | 사용자 경험 |
|-----|--------|----------|------------|
| 묻고 답하기 404 | 🔴 Critical | 전체 Q&A 기능 | 서비스 접근 불가 |
| 똔톡 작성 로직 | 🟡 Medium | 똔톡 작성 | 혼란 및 작성 불가 |

---

## ✅ 수정 체크리스트

### 묻고 답하기 404 에러
- [x] 원인 파악 (디렉토리 구조)
- [x] 파일 복사 (`app/business-voice/qna/`)
- [x] 테스트 완료 (200 OK)
- [x] 검증 완료

### 똔톡 작성하기 인증 로직
- [x] 문제 확인 (TtontokCompact.tsx:101)
- [x] 현재 로직 분석
- [x] 작성 페이지 구조 확인
- [x] 권장 수정 방안 제시
- [ ] 사용자 의사결정 대기 (옵션 A vs B)
- [ ] 코드 수정
- [ ] 테스트

---

## 🚀 다음 액션

### 즉시 처리 완료
1. ✅ 묻고 답하기 404 에러 수정
2. ✅ 테스트 및 검증

### 사용자 결정 필요
**질문**: 똔톡 작성을 어떻게 하실 건가요?

**옵션 A** (권장):
- 비회원도 작성 가능 (현재 페이지 구조 유지)
- 빠른 수정 (1줄 변경)
- 사용자 진입 장벽 낮음

**옵션 B**:
- 회원 전용
- 인증 시스템 구현 필요
- 사용자 관리 가능

---

## 📝 관련 파일

### 수정 완료
- `app/business-voice/qna/page.tsx` (복사됨)
- `app/business-voice/qna/[id]/page.tsx` (복사됨)
- `app/business-voice/qna/write/page.tsx` (복사됨)

### 수정 대기
- `src/components/business-voice/TtontokCompact.tsx` (Line 101-104, 242)

---

**작성일**: 2025-10-08 12:40 KST
**작성자**: Claude Code
**다음 단계**: 사용자 의사결정 후 똔톡 인증 로직 수정
