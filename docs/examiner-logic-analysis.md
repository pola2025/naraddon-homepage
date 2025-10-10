# 기업심사관 로직 분석 및 개선사항

**작성일**: 2025-10-10
**목적**: 기업심사관 시스템의 현재 상태 분석 및 누락된 로직 파악

---

## 📋 목차
1. [현재 시스템 구조](#현재-시스템-구조)
2. [기업심사관 프로세스 분석](#기업심사관-프로세스-분석)
3. [발견된 문제점](#발견된-문제점)
4. [누락된 로직](#누락된-로직)
5. [개선 방안](#개선-방안)

---

## 🏗️ 현재 시스템 구조

### 데이터베이스 컬렉션

#### 1. `users` 컬렉션
- 사용자 계정 정보 저장
- **주요 필드**:
  - `role`: 'user', 'examiner', 'expert', 'admin'
  - `email`: 사용자 이메일 (로그인 ID)
  - `examinerId`: 연결된 심사관 카드 ID (optional)
  - `name`, `profile`, `status` 등

#### 2. `expert-examiners` 컬렉션
- 심사관 카드 정보 (웹사이트에 표시되는 프로필)
- **주요 필드**:
  - `_id`: 카드 ID
  - `name`: 심사관 이름
  - `companyName`: 회사명
  - `position`: 직책
  - `userId`: 연결된 사용자 ID (optional)
  - ⚠️ **이메일 필드 없음**

#### 3. `consultations` 컬렉션
- 상담 정보 저장
- **주요 필드**:
  - `assignedStaffId`: 배정된 담당자 **이메일** ⚠️
  - `assignedStaffName`: 담당자 이름
  - `status`: 상담 상태
  - `userName`, `companyName` 등

---

## 🔄 기업심사관 프로세스 분석

### 1️⃣ 일반회원 → 기업심사관 승격 ✅

**API**: `/api/admin/users/[id]/role` (PUT)

**프로세스**:
```
관리자가 회원 관리에서 "심사관 지정" 클릭
↓
모달 팝업: 신규 프로필 생성 or 기존 카드 연결 선택
↓
[신규 생성 선택 시]
  1. expert-examiners 컬렉션에 새 카드 생성
  2. users.role = 'examiner' 업데이트
  3. users.examinerId = 생성된 카드 ID
  4. expert-examiners.userId = 사용자 ID
↓
[기존 카드 연결 시]
  1. users.role = 'examiner' 업데이트
  2. users.examinerId = 선택된 카드 ID
  3. expert-examiners.userId = 사용자 ID
```

**코드 위치**:
- `app/api/admin/users/[id]/role/route.ts:66-103`
- `app/admin/users/page.tsx:460-618`

**현재 상태**: ✅ **정상 작동**

---

### 2️⃣ 상담 배정 ⚠️ **문제 있음**

**API**: `/api/consultations/[id]/assign` (PUT)

**프로세스**:
```
관리자가 상담 목록에서 "배정" 버튼 클릭
↓
담당자 선택 (드롭다운)
↓
[현재 코드 - 문제!]
  - staff.role이 'auditor' 또는 'expert'인지만 체크 ❌
  - 'examiner' role은 체크 안함 ❌
↓
consultations.assignedStaffId = staff.email (이메일 저장)
consultations.status = 'assigned'
```

**코드 위치**:
- `app/api/consultations/[id]/assign/route.ts:48-54`

**문제점**:
```typescript
// 현재 코드 (문제!)
if (!staff || (staff.role !== 'auditor' && staff.role !== 'expert')) {
  return NextResponse.json(
    { error: '유효하지 않은 담당자입니다.' },
    { status: 400 }
  );
}
```

**개선 필요**:
```typescript
// 수정된 코드
if (!staff || !['auditor', 'expert', 'examiner'].includes(staff.role)) {
  return NextResponse.json(
    { error: '유효하지 않은 담당자입니다.' },
    { status: 400 }
  );
}
```

---

### 3️⃣ 심사관 대시보드 조회 ✅ (최근 수정)

**API**: `/api/examiner/stats` (GET)

**프로세스**:
```
심사관 로그인 → 대시보드 접속
↓
/api/examiner/stats?examinerEmail={email}
↓
consultations에서 assignedStaffId = email인 상담 조회
↓
통계 반환:
  - assignedConsultations: 배정된 상담 수
  - completedConsultations: 완료된 상담 수
  - pendingReviews: 검토 대기 수
  - averageRating: 평균 평점
  - recentConsultations: 최근 상담 5건
```

**코드 위치**:
- `app/api/examiner/stats/route.ts`

**현재 상태**: ✅ **정상 작동** (이메일로 조회)

---

### 4️⃣ 관리자의 심사관 모니터링 ✅ (최근 수정)

**페이지**: `/admin/examiner-dashboards`

**프로세스**:
```
관리자 로그인 → 심사관별 대시보드 접속
↓
/api/admin/examiners (심사관 목록 조회)
  - expert-examiners 전체 조회
  - userId로 users 컬렉션 조인하여 이메일 가져오기 ✅
↓
각 심사관별로 /api/examiner/stats?examinerEmail={email} 호출
↓
테이블 형식으로 모든 심사관 통계 표시
↓
"상세보기" 클릭 → /admin/examiner-dashboard?examinerEmail={email}
```

**코드 위치**:
- `app/admin/examiner-dashboards/page.tsx`
- `app/admin/examiner-dashboard/page.tsx`
- `app/api/admin/examiners/route.ts:46-71` (이메일 조인 로직)

**현재 상태**: ✅ **정상 작동** (최근 수정 완료)

---

## 🚨 발견된 문제점

### ⚠️ 1. 상담 배정 API에서 'examiner' role 체크 안함

**위치**: `app/api/consultations/[id]/assign/route.ts:49`

**문제**:
- 'auditor'와 'expert'만 배정 가능
- **'examiner' role은 배정 불가** ❌

**영향**:
- 기업심사관으로 승격해도 상담 배정 불가
- 관리자가 배정 시도 시 "유효하지 않은 담당자" 에러 발생

**해결책**: role 체크에 'examiner' 추가

---

### ⚠️ 2. expert-examiners 컬렉션에 이메일 필드 없음

**문제**:
- 심사관 카드에 이메일이 직접 저장되지 않음
- userId를 통한 users 컬렉션 조인 필요

**영향**:
- API 응답이 복잡해짐
- 성능 이슈 가능 (N+1 조회)

**해결책**:
- expert-examiners에 email 필드 추가 (선택사항)
- 또는 현재처럼 조인 사용 (이미 구현됨)

---

### ⚠️ 3. 레거시 role 혼용 ('auditor' vs 'examiner')

**문제**:
- 과거: 'auditor' (감사관)
- 현재: 'examiner' (심사관)
- 일부 코드에서 혼용

**영향**:
- 혼란 가능성
- 일관성 부족

**해결책**: 'examiner'로 통일

---

## 📝 누락된 로직

### ❌ 1. 심사관 상담 작성 권한 체크 부족

**현재 상황**:
- 기업심사관은 "본인 상담건 작성 및 관리만" 가능해야 함
- 하지만 권한 체크 로직 확인 필요

**확인 필요**:
- `/api/consultations` POST 엔드포인트
- 심사관이 다른 심사관 상담 수정 가능한지?

---

### ❌ 2. 심사관 역할 해제 프로세스

**현재 상황**:
- 심사관으로 승격하는 로직은 있음 ✅
- 심사관 역할을 해제하는 로직은?

**필요한 작업**:
- 역할 해제 시:
  - users.role 변경
  - users.examinerId 제거
  - expert-examiners.userId 제거 또는 null 설정
  - 배정된 상담 처리 방법?

---

### ❌ 3. 심사관 삭제 시 상담 재배정

**현재 상황**:
- 심사관 카드 삭제 시 배정된 상담은?
- 재배정 프로세스가 있는지?

**필요한 작업**:
- 심사관 삭제 전 배정된 상담 확인
- 재배정 또는 경고 메시지

---

### ❌ 4. 상담 배정 시 심사관 자동 추천

**개선 아이디어**:
- 상담 카테고리에 맞는 심사관 추천
- 워크로드가 적은 심사관 우선 표시
- 전문 분야 매칭

---

## ✅ 개선 방안

### 🔧 즉시 수정 필요 (HIGH)

#### 1. 상담 배정 API 수정
```typescript
// app/api/consultations/[id]/assign/route.ts

// 변경 전
if (!staff || (staff.role !== 'auditor' && staff.role !== 'expert')) {

// 변경 후
if (!staff || !['auditor', 'expert', 'examiner'].includes(staff.role)) {
```

#### 2. 심사관 역할 해제 API 추가
```typescript
// app/api/admin/users/[id]/role/route.ts

// examiner → user 전환 시:
if (user.role === 'examiner' && newRole !== 'examiner') {
  // 1. expert-examiners에서 userId 제거
  await db.collection('expert-examiners').updateOne(
    { userId: userId },
    { $unset: { userId: '' } }
  );

  // 2. users에서 examinerId 제거
  updateData.$unset = { examinerId: '' };

  // 3. 배정된 상담 확인 및 경고
  const assignedConsultations = await db.collection('consultations')
    .countDocuments({ assignedStaffId: user.email });

  if (assignedConsultations > 0) {
    return NextResponse.json({
      error: `배정된 상담이 ${assignedConsultations}건 있습니다. 먼저 재배정해주세요.`,
      assignedConsultations
    }, { status: 400 });
  }
}
```

---

### 🚀 중기 개선 (MEDIUM)

#### 1. 심사관 워크로드 관리
- 각 심사관의 현재 배정 상담 수 표시
- 배정 제한 설정 (예: 최대 10건)

#### 2. 상담 자동 배정 시스템
- 카테고리별 심사관 자동 추천
- 워크로드 기반 자동 배정

#### 3. 심사관 성과 분석
- 완료율, 평균 처리 시간
- 고객 만족도 통계

---

### 💡 장기 개선 (LOW)

#### 1. 심사관 포털
- 심사관 전용 대시보드 강화
- 상담 일정 관리 캘린더

#### 2. 고객 피드백 시스템
- 상담 후 평가
- 심사관별 리뷰 관리

---

## 📊 데이터 흐름 다이어그램

```
┌─────────────┐
│  일반 회원  │
└──────┬──────┘
       │ 관리자가 승격
       ▼
┌─────────────────────┐
│ users (role=examiner) │
│ examinerId: ABC123    │
└──────┬─────┬──────────┘
       │     │
       │     └──────────────────┐
       ▼                        ▼
┌──────────────────┐    ┌────────────────────┐
│ expert-examiners │    │   consultations    │
│ _id: ABC123      │    │ assignedStaffId:   │
│ userId: 사용자ID  │    │ user@email.com     │
│ name: 김심사      │    │ status: assigned   │
│ companyName: XX   │    └────────────────────┘
└──────────────────┘              │
                                  │ 관리자가 배정
                                  ▼
                          ┌─────────────────┐
                          │  심사관 대시보드 │
                          │  - 배정 상담 조회 │
                          │  - 진행 상황 관리 │
                          └─────────────────┘
```

---

## ✅ 체크리스트

### 즉시 수정
- [ ] 상담 배정 API에 'examiner' role 추가
- [ ] 역할 해제 시 배정 상담 확인 로직 추가

### 확인 필요
- [ ] 심사관 상담 작성 권한 체크
- [ ] 심사관이 다른 심사관 상담 수정 가능 여부
- [ ] 심사관 삭제 시 상담 처리 방법

### 개선 제안
- [ ] 자동 배정 시스템
- [ ] 워크로드 관리
- [ ] 성과 분석 대시보드

---

## 📝 결론

**현재 시스템 상태**: 대부분 정상 작동 ✅

**주요 문제점**:
1. 상담 배정 API에서 'examiner' role 체크 누락 ⚠️
2. 역할 해제 프로세스 미비 ⚠️

**다음 단계**:
1. 상담 배정 API 수정 (즉시)
2. 역할 해제 로직 추가 (즉시)
3. 권한 체크 로직 확인 (단기)
4. 자동 배정 시스템 검토 (중기)

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-10
