# 심사관 상담 배정 로직 테스트 가이드

## 📋 테스트 목적
프로덕션 환경에서 심사관에게 상담이 정상적으로 배정되고, 기록 작성이 원활하게 동작하는지 검증

---

## 🔍 테스트 시나리오

### 1단계: 상담 배정 기능 테스트

#### 1.1 관리자 로그인
- **URL**: https://naraddon.com/auth/login
- **계정**: 관리자 계정으로 로그인
- **확인사항**: 로그인 후 `/admin/dashboard`로 자동 이동

#### 1.2 상담 신청 내역 확인
- **경로**: 관리자 대시보드 → 사용자 관리 또는 상담 관리
- **확인사항**:
  - 배정되지 않은 상담(status: 'pending') 존재 확인
  - 상담 정보 확인: 신청자 이름, 회사명, 상담 유형 등

#### 1.3 심사관에게 상담 배정
- **경로**: 상담 상세 페이지 → "담당자 배정" 버튼 클릭
- **테스트 케이스**:
  ```
  [TC-001] 심사관에게 상담 배정
  - 전제조건: examiner role을 가진 사용자가 존재
  - 실행: 상담 배정 드롭다운에서 심사관 선택 후 "배정" 클릭
  - 예상 결과:
    ✅ "상담이 [심사관명]님에게 배정되었습니다" 메시지 표시
    ✅ 상담 status가 'assigned'로 변경
    ✅ assignedStaffId가 심사관 이메일로 설정
    ✅ assignedAt 타임스탬프 기록
  ```

#### 1.4 배정 확인
- **확인사항**:
  - 상담 상세 페이지에서 "담당자: [심사관명]" 표시 확인
  - 상담 히스토리에 배정 기록 추가 확인

---

### 2단계: 심사관 대시보드 확인

#### 2.1 관리자에서 심사관 대시보드 접근
- **경로**: 관리자 사이드바 → "심사관 상담관리"
- **확인사항**:
  - 모든 심사관 목록 테이블 형식으로 표시
  - 검색 기능 동작 (이름/이메일/회사명)
  - 각 심사관의 통계 표시:
    - 배정된 상담 수
    - 완료된 상담 수
    - 검토 대기 수

#### 2.2 특정 심사관 상세 대시보드
- **경로**: 심사관 상담관리 → 특정 심사관 "상세보기" 클릭
- **확인사항**:
  ```
  [TC-002] 심사관 개별 대시보드 조회
  - URL: /admin/examiner-dashboard?examinerEmail=[심사관이메일]
  - 예상 결과:
    ✅ 심사관 이름, 회사명, 이메일 표시
    ✅ 통계 카드 3개 표시:
       - 📋 배정된 상담
       - ✅ 완료된 상담
       - 👁️ 검토 대기
    ✅ 최근 상담 목록 (최대 5건) 표시
    ✅ 각 상담 항목에 "상세보기" 링크
  ```

#### 2.3 데이터 정합성 검증
- **확인사항**:
  - 배정된 상담 수가 실제 DB 데이터와 일치
  - 최근 상담 목록의 데이터가 정확 (회사명, 상담유형, 상태 등)
  - undefined 또는 null 값이 표시되지 않음

---

### 3단계: 심사관 계정으로 기록 작성 테스트

#### 3.1 심사관 로그인
- **계정**: examiner role을 가진 계정으로 로그인
- **확인사항**: 헤더에 "심사관" 역할 표시

#### 3.2 심사관 대시보드 접근
- **경로**: 헤더 프로필 → "심사관 대시보드" 클릭
- **URL**: `/examiner/dashboard`
- **확인사항**:
  - 자신에게 배정된 상담만 표시
  - 통계가 자신의 활동만 반영

#### 3.3 상담 기록 작성
- **경로**: 심사관 대시보드 → 상담 선택 → "기록 작성"
- **테스트 케이스**:
  ```
  [TC-003] 상담 기록 작성 및 상태 변경
  - 실행:
    1. 배정된 상담 선택
    2. "상담 시작" 또는 "기록 작성" 버튼 클릭
    3. 상담 내용, 조언 사항 등 입력
    4. "저장" 클릭
  - 예상 결과:
    ✅ 상담 기록이 DB에 저장
    ✅ 상담 status가 'in_progress' → 'review' → 'completed'로 변경
    ✅ 히스토리에 기록 추가
  ```

---

## 🚨 주요 확인 포인트

### API 엔드포인트 검증

#### 1. `/api/admin/examiners` (심사관 목록)
```bash
# 확인사항
✅ userId를 통한 users 컬렉션 조인 동작
✅ email 필드 정상 반환 (ObjectId 변환 포함)
✅ 이메일이 없는 심사관은 email: null로 표시
```

#### 2. `/api/examiner/stats` (심사관 통계)
```bash
# 확인사항
✅ examinerEmail 파라미터로 특정 심사관 조회 (관리자)
✅ 심사관은 자신의 통계만 조회 가능
✅ assignedConsultations, completedConsultations, pendingReviews 정확성
✅ recentConsultations 배열 (최대 5건)
```

#### 3. `/api/consultations/[id]/assign` (상담 배정)
```bash
# 확인사항
✅ validRoles에 'examiner' 포함 확인
✅ 심사관 role 사용자에게 배정 가능
✅ assignedStaffId, assignedStaffName 정상 저장
✅ 알림 생성 (notifications 컬렉션)
```

#### 4. `/api/admin/users/[id]/role` (역할 변경)
```bash
# 확인사항
✅ examiner → user 전환 시 배정된 상담 확인
✅ 배정된 상담이 있으면 에러 반환 (재배정 필요)
✅ expert-examiners와 users 간 연결 해제
```

---

## 🐛 예상 문제 및 해결 방법

### 문제 1: 심사관에게 상담 배정 불가
**증상**: "유효하지 않은 담당자입니다" 에러
**원인**: validRoles에 'examiner' 미포함
**해결**: `/api/consultations/[id]/assign/route.ts` 49번째 줄 확인
```typescript
const validRoles = ['auditor', 'expert', 'examiner']; // examiner 포함 확인
```

### 문제 2: 심사관 이메일이 "이메일 없음"으로 표시
**증상**: 네이버로 가입한 심사관의 이메일이 표시되지 않음
**원인**: ObjectId 변환 누락
**해결**: `/api/admin/examiners/route.ts` 55-57번째 줄 확인
```typescript
const userIdQuery = typeof examiner.userId === 'string'
  ? new ObjectId(examiner.userId)
  : examiner.userId;
```

### 문제 3: 심사관 대시보드에서 undefined 표시
**증상**: examinerEmail이 undefined인 URL
**원인**: expert-examiners 컬렉션의 userId 연결 누락
**해결**: 관리자 페이지에서 "심사관 관리" → 해당 심사관 편집 → 사용자 계정 연결

### 문제 4: 통계 데이터가 0으로 표시
**증상**: 배정된 상담이 있는데 통계가 0
**원인**: consultations 컬렉션의 assignedStaffId가 이메일과 불일치
**해결**: DB에서 다음 쿼리로 확인
```javascript
db.consultations.find({ assignedStaffId: "심사관이메일@example.com" })
```

---

## ✅ 테스트 체크리스트

### 상담 배정 프로세스
- [ ] 관리자가 심사관에게 상담 배정 가능
- [ ] 배정 시 상담 status가 'assigned'로 변경
- [ ] 배정 히스토리 기록 생성
- [ ] 심사관에게 알림 생성

### 심사관 대시보드 (관리자 뷰)
- [ ] 심사관 목록 테이블 표시
- [ ] 검색 기능 동작 (이름/이메일/회사명)
- [ ] 각 심사관의 통계 정확성
- [ ] 특정 심사관 상세 대시보드 접근 가능
- [ ] 돋보기 아이콘이 검색창 내부에 표시

### 심사관 대시보드 (심사관 본인 뷰)
- [ ] 자신에게 배정된 상담만 표시
- [ ] 통계가 자신의 활동만 반영
- [ ] 최근 상담 목록 표시

### 상담 기록 작성
- [ ] 심사관이 배정된 상담에 접근 가능
- [ ] 상담 기록 작성 및 저장
- [ ] 상담 상태 변경 (in_progress → review → completed)
- [ ] 기록 히스토리 추가

### 역할 관리
- [ ] examiner 역할 부여 시 expert-examiners 연결
- [ ] examiner 역할 해제 시 배정된 상담 확인
- [ ] 배정된 상담이 있으면 역할 해제 차단

---

## 📊 모니터링 포인트

### 브라우저 콘솔 로그
```javascript
// 심사관 통계 API 호출 확인
[Examiner Stats API] Session: { email: '...' }
[Examiner Stats API] User role: examiner
[Examiner Stats API] Admin requesting stats for: ...

// 심사관 목록 API 호출 확인
[Examiners API] User not found for examiner ... // 경고: userId 연결 누락
```

### 네트워크 탭 확인
- `/api/admin/examiners`: 200 OK, examiners 배열에 email 필드 포함 확인
- `/api/examiner/stats?examinerEmail=...`: 200 OK, 통계 데이터 반환 확인
- `/api/consultations/[id]/assign`: 200 OK, 배정 성공 메시지 확인

### MongoDB 컬렉션 확인
```javascript
// 상담 배정 확인
db.consultations.findOne({ _id: ObjectId("...") })
// ➜ assignedStaffId: "심사관이메일@example.com"
// ➜ assignedStaffName: "심사관 이름"
// ➜ status: "assigned"

// 알림 생성 확인
db.notifications.find({ userId: "심사관이메일@example.com", type: "consultation_assigned" })

// 역할 변경 로그 확인
db.roleLogs.find({ userId: "...", newRole: "examiner" })
```

---

## 🎯 성공 기준

### 필수 조건 (Must Have)
1. ✅ 심사관에게 상담 배정 가능
2. ✅ 심사관 대시보드에서 배정된 상담 확인 가능
3. ✅ 심사관이 상담 기록 작성 가능
4. ✅ 통계 데이터가 정확하게 표시
5. ✅ undefined 또는 null 값이 UI에 표시되지 않음

### 선택 조건 (Nice to Have)
1. 📧 심사관에게 배정 알림 이메일/SMS 발송
2. 📊 실시간 통계 업데이트
3. 🔔 상담 상태 변경 시 관리자에게 알림

---

## 📝 테스트 결과 기록 템플릿

```markdown
### 테스트 일시
YYYY-MM-DD HH:MM

### 테스트 환경
- URL: https://naraddon.com
- 브라우저: Chrome / Safari / Firefox
- 관리자 계정: [계정명]
- 심사관 계정: [계정명]

### 테스트 결과

#### TC-001: 심사관에게 상담 배정
- 결과: ✅ 성공 / ❌ 실패
- 상담 ID: ...
- 배정된 심사관: ...
- 발생 이슈: (있는 경우)

#### TC-002: 심사관 개별 대시보드 조회
- 결과: ✅ 성공 / ❌ 실패
- 확인한 심사관: ...
- 통계 데이터: 배정 N건, 완료 N건, 검토대기 N건
- 발생 이슈: (있는 경우)

#### TC-003: 상담 기록 작성 및 상태 변경
- 결과: ✅ 성공 / ❌ 실패
- 상담 ID: ...
- 작성한 내용: ...
- 상태 변경: ... → ...
- 발생 이슈: (있는 경우)

### 전체 평가
- 배포 가능 여부: ✅ 예 / ❌ 아니오
- 추가 수정 필요 사항: ...
```

---

**작성일**: 2025-10-10
**최종 업데이트**: 2025-10-10
