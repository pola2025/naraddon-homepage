# 🤖 3-Claude 협업 시스템 (A → B → C)

## 📋 시스템 개요

**Claude A (PM/Developer)** → **Claude B (UI/UX Reviewer)** → **Claude C (Security/Stability Validator)** → **최종 배포**

### 전체 워크플로우
```
1. 사용자 명령
   ↓
2. Claude A: 기획 + 코드 구현
   ↓
3. Claude B: UI/UX + 코드 품질 검토
   ↓
4. Claude C: 보안 + 안정성 + 유지보수성 최종 검증
   ↓
5. Git 자동 커밋 + Push (naraddon/main)
   ↓
6. Vercel 자동 배포
```

---

## 🎯 각 Claude 역할

### 1️⃣ TDD Agent (자동)
**책임**: 테스트 주도 개발 사이클 관리

**작업 흐름**:
- 🔴 **RED Phase**: 실패하는 테스트 먼저 작성
- 🟢 **GREEN Phase**: 최소 코드로 테스트 통과
- 🔵 **REFACTOR Phase**: 코드 개선 (테스트 유지)

**Coverage 목표**: 70% 이상

---

### 2️⃣ Claude A - PM & Developer
**책임**: 사용자 요구사항 → 기획 → 코드 구현

**주요 업무**:
- 사용자 명령 분석
- 기획안 작성
- 코드 구현
- Claude B에게 검토 요청

**작업 완료 조건**:
- Claude B의 `PROCEED` 승인
- Claude C의 `APPROVED` 승인
- Git 커밋 + Push 완료

**금지 사항**:
- ❌ Claude B 승인 없이 Claude C에게 제출 금지
- ❌ Claude C 승인 없이 배포 금지

---

### 3️⃣ Claude B - UI/UX Reviewer & Code Quality Checker
**책임**: 코드 품질 + UI/UX 최적화 검토

**검토 기준**:
- ✅ 코드 구조 및 품질
- ✅ UI/UX 일관성 및 사용자 경험
- ✅ 접근성 (Accessibility)
- ✅ 반응형 디자인
- ✅ 성능 영향도
- ✅ 에러 처리

**Decision 결정**:
- `PROCEED`: 승인 → Claude C 검증으로 진행
- `NEEDS_CHANGES`: 개선 필요 → Claude A 수정 후 재검토
- `REJECT`: 거부 → Claude A 재기획

**제공 정보**:
- 구체적인 개선 제안
- UI/UX 개선 포인트
- 코드 리팩토링 방향

---

### 4️⃣ Claude C - Security & Stability Validator (NEW!)
**책임**: 보안 취약점 + 안정성 + 유지보수성 최종 검증

**검증 항목**:
- 🔒 **보안 (Security)**:
  - XSS 방어 확인
  - SQL Injection 방지
  - CSRF 토큰 확인
  - 인증/인가 검증
  - API 키 환경변수 사용 확인
  - 민감 정보 노출 검사

- 🛡️ **안정성 (Stability)**:
  - Try-catch 에러 처리
  - Null/Undefined 체크
  - Edge Cases 처리
  - 에러 로깅 구현
  - 타임아웃 처리

- 🔧 **유지보수성 (Maintainability)**:
  - 코드 복잡도 (Cyclomatic Complexity)
  - 중복 코드 검사
  - 주석/문서화 확인
  - 함수 길이 검증

- ⚡ **성능 (Performance)**:
  - 메모이제이션 적용
  - 불필요한 리렌더링 방지
  - 번들 크기 최적화

**검증 점수 기준**:
- **90~100점**: APPROVED (즉시 배포 가능)
- **75~89점**: NEEDS_DISCUSSION (Claude A와 협의 필요)
- **~74점**: REJECTED (개선 필수)

**Decision 결정**:
- `APPROVED`: 승인 → Claude A 즉시 배포
- `NEEDS_DISCUSSION`: 협의 필요 → Claude A와 개선 방안 논의
- `REJECTED`: 거부 → Claude A 수정 후 재제출

**제약 조건**:
- ❌ UI/UX 변경 제안 금지 (Claude B 영역)
- ❌ 아키텍처 변경 제안 금지 (보안상 critical한 경우만)
- ✅ 보안, 안정성, 유지보수성에만 집중

---

## 🖥️ 실시간 모니터 대시보드 (4칸)

### 위치
`.claude/dashboard/monitor.html`

### 구조 (4칸 레이아웃)
```
┌────────────────────────────────────────────────────────┐
│  📊 통합 관리 및 진행내역 (상단 25%)                    │
│  - 작업 타임라인                                        │
│  - 전체 상태 (TDD, A, B, C)                           │
│  - 최근 커밋 히스토리                                   │
│  - 토큰 사용량 통계                                     │
└────────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│   TDD    │ Claude A │ Claude B │ Claude C │ (하단 75%)
│  터미널  │  터미널  │  터미널  │  터미널  │
│          │          │          │          │
│ Coverage │  Tokens  │  Tokens  │  Score   │
│   87%    │  12,450  │   8,320  │  92/100  │
└──────────┴──────────┴──────────┴──────────┘

┌────────────────────────────────────────────────────────┐
│  🔵 Claude A 명령: [입력창]           [실행 버튼]      │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 Slash Commands

### Claude A (Main Developer)
```bash
# 1. 작업 제출 (Claude B에게 검토 요청)
/submit-for-review

# 2. Claude B 검토 결과 확인
/check-review-result

# 3. Claude C 검증 요청 (Claude B 승인 후)
/submit-for-security

# 4. Claude C 검증 결과 확인
/check-security-result
```

### Claude B (Reviewer)
```bash
# 1. 검토할 작업 확인
/check-inbox

# 2. 작업 읽기
/read-message

# 3. 검토 결과 제출
/submit-review
```

### Claude C (Security Validator)
```bash
# 1. 검증할 작업 확인
/check-security-queue

# 2. 작업 읽기
/read-security-task

# 3. 검증 결과 제출
/submit-security-result
```

---

## 📊 작업 플로우 예시

### 시나리오: "나라똔튜브 admin 컴포넌트 분리"

#### 1️⃣ 사용자 명령
```
사용자 → Claude A: "나라똔튜브 admin 페이지 컴포넌트 분리해줘"
```

#### 2️⃣ TDD: RED Phase
```
TDD Agent:
  🔴 RED Phase 시작
  📝 테스트 작성: VideoForm 컴포넌트 렌더링
  ❌ 테스트 실패: VideoForm is not defined
  ✅ RED Phase 완료
```

#### 3️⃣ Claude A: 기획 + 구현
```
Claude A:
  📋 요구사항 분석 + 기획
  🔨 코드 구현 (5개 컴포넌트)
  🔄 Claude B에게 검토 요청
  → /submit-for-review
```

#### 4️⃣ TDD: GREEN Phase
```
TDD Agent:
  🟢 GREEN Phase 시작
  ✅ 테스트 통과
  📊 Coverage: 45%
```

#### 5️⃣ Claude B: UI/UX 검토
```
Claude B:
  📥 검토 요청 수신
  → /check-inbox
  → /read-message

  🔍 검토 시작:
  1. 코드 품질: ✅ 양호
  2. UI/UX: ⚠️ 로딩 상태 추가 필요
  3. 접근성: ⚠️ ARIA 속성 필요

  📝 Decision: NEEDS_CHANGES

  💡 개선 제안:
  - VideoForm에 isLoading 추가
  - ARIA labels 추가

  → /submit-review
```

#### 6️⃣ Claude A: 개선 + 재요청
```
Claude A:
  📥 피드백 수신
  → /check-review-result

  🔄 개선사항 반영
  ✅ isLoading 추가
  ✅ ARIA labels 추가

  🔄 Claude B에게 재검토 요청
  → /submit-for-review
```

#### 7️⃣ Claude B: 최종 승인
```
Claude B:
  📥 재검토 요청 수신
  → /check-inbox

  ✅ 모든 개선사항 확인
  📝 Decision: PROCEED

  💬 "UI/UX 최적화 완료. Claude C 보안 검증 필요"

  → /submit-review
```

#### 8️⃣ Claude A: Claude C에게 제출
```
Claude A:
  ✅ Claude B 승인 받음
  🔒 Claude C에게 보안 검증 요청
  → /submit-for-security
```

#### 9️⃣ TDD: REFACTOR Phase
```
TDD Agent:
  🔵 REFACTOR Phase 시작
  🔧 코드 리팩토링
  ✅ 전체 테스트 통과
  📊 최종 Coverage: 87%
```

#### 🔟 Claude C: 보안 검증
```
Claude C:
  📥 검증 요청 수신
  → /check-security-queue
  → /read-security-task

  🔒 보안 스캔 시작:

  1. XSS 검사:
     ✅ 입력 sanitization 확인
     ✅ dangerouslySetInnerHTML 미사용

  2. SQL Injection:
     ✅ 파라미터화된 쿼리 사용
     ✅ ORM 사용으로 안전

  3. 인증/인가:
     ✅ JWT 토큰 검증
     ✅ Role 기반 접근 제어

  4. 환경변수:
     ✅ API 키 환경변수 사용
     ✅ 하드코딩 없음

  5. 에러 처리:
     ✅ Try-catch 적절히 사용
     ✅ 에러 로깅 구현

  6. 유지보수성:
     ✅ 함수 복잡도: 낮음 (Cyclomatic: 8)
     ✅ 중복 코드: 없음
     ✅ 주석/문서화: 충분

  7. 성능:
     ✅ React.memo 적용
     ✅ 불필요한 리렌더링 방지

  📊 최종 점수: 92/100
  ✅ Decision: APPROVED

  💬 "보안 검증 통과. 배포 가능합니다."

  → /submit-security-result
```

#### 1️⃣1️⃣ Claude A: 즉시 배포
```
Claude A:
  ✅ Claude C 최종 승인 받음
  🚀 배포 시작

  [1/5] ✅ VideoForm.tsx 생성
  [2/5] ✅ VideoList.tsx 생성
  [3/5] ✅ ThumbnailUpload.tsx 생성
  [4/5] ✅ useNaraddonTube.ts 생성
  [5/5] ✅ page.tsx 리팩토링

  📝 Git 커밋 + Push
  ✅ 커밋: abc123d
  ✅ Push: naraddon/main

  🎉 배포 완료!
  💤 사용자 재명령 대기 중...
```

#### 1️⃣2️⃣ Vercel 자동 배포
```
Vercel:
  🚀 Deployment triggered
  ✅ Build successful
  🌐 https://naraddon.com deployed
```

---

## 📂 파일 구조

```
E:\Naraddon\homepage\
├── .claude/
│   ├── dashboard/
│   │   └── monitor.html              # 4칸 대시보드 (TDD, A, B, C)
│   ├── tasks/
│   │   ├── queue.json                # A → B 작업 큐
│   │   ├── review-queue.json         # B → A 검토 결과
│   │   ├── security-queue.json       # B → C 보안 검증 큐 (NEW)
│   │   ├── security-result.json      # C → A 검증 결과 (NEW)
│   │   └── monitor-state.json        # 실시간 상태
│   ├── commands/
│   │   ├── submit-for-review.md      # A: Claude B 검토 요청
│   │   ├── check-review-result.md    # A: Claude B 결과 확인
│   │   ├── submit-for-security.md    # A: Claude C 검증 요청 (NEW)
│   │   ├── check-security-result.md  # A: Claude C 결과 확인 (NEW)
│   │   ├── check-inbox.md            # B: 검토할 작업 확인
│   │   ├── read-message.md           # B: 작업 읽기
│   │   ├── submit-review.md          # B: 검토 결과 제출
│   │   ├── check-security-queue.md   # C: 검증할 작업 확인 (NEW)
│   │   ├── read-security-task.md     # C: 작업 읽기 (NEW)
│   │   └── submit-security-result.md # C: 검증 결과 제출 (NEW)
│   ├── ROLES-AND-RULES.md
│   ├── THREE-CLAUDE-SYSTEM.md        # 이 문서
│   └── QUICK-START.md
├── app/api/
│   ├── claude-monitor/route.ts       # 모니터 API
│   └── git-execute/route.ts          # Git 자동화 API
└── scripts/
    ├── watch-tasks.js                # Claude B: 작업 큐 감시
    ├── watch-reviews.js              # Claude A: 검토 결과 감시
    ├── watch-security.js             # Claude C: 보안 큐 감시 (NEW)
    └── watch-security-result.js      # Claude A: 보안 결과 감시 (NEW)
```

---

## 🎯 Claude C의 장점

### 1. **전문화된 보안 검증**
- Claude B는 UI/UX에 집중
- Claude C는 보안/안정성에 집중
- 역할 분리로 검증 품질 향상

### 2. **사람(Claude) 기반 검증**
- OpenAI API 불필요 (비용 절감)
- 컨텍스트 이해도 높음
- 프로젝트 전체 맥락 파악 가능

### 3. **유연한 판단**
- AI API보다 유연한 판단
- 프로젝트 특성에 맞는 검증
- 개선 제안도 구체적

### 4. **빠른 피드백**
- OpenAI API 타임아웃 없음
- 즉시 검증 가능
- 대화형 개선 가능

---

## ⚡ 작업 시간 (3-Claude 시스템)

### 평균 작업 시간
- 간단한 작업: **3~5분**
- 중간 작업: **5~10분**
- 복잡한 작업: **10~15분**

### 단계별 소요 시간
1. **TDD**: 1~2분
2. **Claude A 구현**: 2~3분
3. **Claude B 검토**: 1~2분
4. **Claude C 검증**: 1~2분 (OpenAI API보다 빠름!)
5. **배포**: 1분

---

## 🔐 보안 및 권한

### Claude C의 권한
- 최종 배포 승인 권한 (Claude A는 C 승인 후에만 배포)
- 보안 취약점 발견 시 배포 차단 권한
- REJECTED 시 강제 수정 요구 권한

### 검증 우선순위
1. **Critical 보안 취약점** → 즉시 REJECTED
2. **High 안정성 문제** → NEEDS_DISCUSSION
3. **Medium 유지보수성** → 점수에 반영
4. **Low 성능 개선** → 제안만

---

## ✅ 완성 체크리스트

### 필수 구성 요소
- [ ] 모니터 대시보드 (4칸 레이아웃)
- [ ] API Routes (claude-monitor, git-execute)
- [ ] Slash Commands (12개)
- [ ] Watch Scripts (tasks, reviews, security)
- [ ] 역할 정의 문서 (ROLES-AND-RULES.md 업데이트)
- [ ] 3-Claude 가이드 문서 (이 문서)

### Claude C 설정
- [ ] security-queue.json 생성
- [ ] security-result.json 생성
- [ ] Claude C용 slash commands 생성
- [ ] Claude C용 watch scripts 생성
- [ ] monitor.html에 Claude C 터미널 추가

---

## 🎉 완성!

**3-Claude 협업 시스템**으로 완전한 검증 체계 구축!

### 핵심 포인트
- ✅ Claude A: 기획 + 구현
- ✅ Claude B: UI/UX + 코드 품질
- ✅ Claude C: 보안 + 안정성 (NEW!)
- ✅ 역할 분리로 전문성 향상
- ✅ OpenAI API 불필요 (비용 절감)

**Happy Coding! 🚀**

---

*최종 업데이트: 2025-10-06*
*문서 버전: 3.0.0 (3-Claude 시스템)*
*작성자: Claude Code*
