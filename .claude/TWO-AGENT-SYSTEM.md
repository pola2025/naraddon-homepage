# 🤖 2-Agent 협업 시스템 (Claude A ↔ Claude B)

## 📋 시스템 개요

**Claude A (PM/Developer)** ↔ **Claude B (UI/UX Reviewer)** → **최종 배포**

### 전체 워크플로우 (간소화)
```
1. 사용자 명령
   ↓
2. Claude A: 기획 + 코드 구현
   ↓
3. Claude B: UI/UX + 코드 품질 검토
   ↓
4. Claude B 승인 → Claude A 실행
   ↓
5. Git 자동 커밋 + Push (naraddon/main)
   ↓
6. Vercel 자동 배포
```

**변경사항**: Codex CLI 제거 → Claude B가 최종 승인 권한 보유

---

## 🎯 각 에이전트 역할

### 1️⃣ TDD Agent (자동)
**책임**: 테스트 주도 개발 사이클 관리

**작업 흐름**:
- 🔴 **RED Phase**: 실패하는 테스트 먼저 작성
- 🟢 **GREEN Phase**: 최소 코드로 테스트 통과
- 🔵 **REFACTOR Phase**: 코드 개선 (테스트 유지)

**Coverage 목표**: 70% 이상

---

### 2️⃣ Claude A - PM & Developer
**책임**: 사용자 요구사항 → 기획 → 코드 구현 → 실행

**주요 업무**:
- 사용자 명령 분석
- 기획안 작성
- 코드 구현
- Claude B에게 검토 요청
- **Claude B 승인 시 즉시 실행** (Codex 검증 없이)

**작업 완료 조건**:
- Claude B의 `PROCEED` 승인 받음
- Git 커밋 + Push 완료
- 사용자에게 완료 보고

**금지 사항**:
- ❌ Claude B 승인 없이 실행 금지
- ❌ 작업 완료 후 추가 작업 금지 (무한 루프 방지)

---

### 3️⃣ Claude B - UI/UX Reviewer & Final Approver
**책임**: 코드 품질 + UI/UX 최적화 검토 + **최종 승인**

**검토 기준** (확장됨):
- ✅ 코드 구조 및 품질
- ✅ UI/UX 일관성 및 사용자 경험
- ✅ 접근성 (Accessibility)
- ✅ 반응형 디자인
- ✅ 성능 영향도
- ✅ 에러 처리
- ✅ **보안 기본 검증** (XSS, CSRF 등)
- ✅ **안정성 검증** (Null 체크, Edge Cases)

**Decision 결정** (최종 권한):
- `PROCEED`: 승인 → **Claude A 즉시 실행** (배포 진행)
- `NEEDS_CHANGES`: 개선 필요 → Claude A 수정 후 재검토
- `REJECT`: 거부 → Claude A 재기획

**제공 정보**:
- 구체적인 개선 제안
- UI/UX 개선 포인트
- 코드 리팩토링 방향
- **보안 및 안정성 경고 (있을 시)**

---

## 🖥️ 실시간 모니터 대시보드 (3칸)

### 위치
`.claude/dashboard/monitor.html`

### 구조 (3칸 레이아웃 - Codex 제거)
```
┌────────────────────────────────────────────────────────┐
│  📊 통합 관리 및 진행내역 (상단 25%)                    │
│  - 작업 타임라인                                        │
│  - 전체 상태 (TDD, A, B)                               │
│  - 최근 커밋 히스토리                                   │
│  - 토큰 사용량 통계                                     │
└────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│     TDD      │   Claude A   │   Claude B   │ (하단 75%)
│    터미널    │    터미널    │    터미널    │
│              │              │              │
│   Coverage   │    Tokens    │    Tokens    │
│     87%      │    12,450    │     8,320    │
└──────────────┴──────────────┴──────────────┘

┌────────────────────────────────────────────────────────┐
│  🔵 Claude A 명령: [입력창]           [실행 버튼]      │
└────────────────────────────────────────────────────────┘
```

### 표시 정보 (Codex 칸 제거)
1. **TDD 터미널**: RED/GREEN/REFACTOR Phase, Coverage
2. **Claude A 터미널**: 작업 상태, 토큰, 진행률
3. **Claude B 터미널**: 검토 상태, Decision, 개선 제안

---

## 🔄 Slash Commands (간소화)

### Claude A (Main Developer)
```bash
# 1. 작업 제출 (Claude B에게 검토 요청)
/submit-for-review

# 2. Claude B 검토 결과 확인
/check-review-result
```

### Claude B (Reviewer & Approver)
```bash
# 1. 검토할 작업 확인
/check-inbox

# 2. 작업 읽기
/read-message

# 3. 검토 결과 제출 (최종 승인)
/submit-task
```

**변경사항**: `/submit-for-codex`, `/check-codex-result` 제거

---

## 📊 작업 플로우 예시 (간소화)

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

#### 5️⃣ Claude B: 검토 + 최종 승인
```
Claude B:
  📥 검토 요청 수신
  → /check-inbox
  → /read-message

  🔍 검토 시작:
  1. 코드 품질: ✅ 양호
  2. UI/UX: ⚠️ 로딩 상태 추가 필요
  3. 보안: ✅ XSS 방어됨
  4. 안정성: ✅ 에러 처리 OK

  📝 Decision: NEEDS_CHANGES

  💡 개선 제안:
  - VideoForm에 isLoading 추가
  - ErrorBoundary 구현

  → /submit-task
```

#### 6️⃣ Claude A: 개선 + 재요청
```
Claude A:
  📥 피드백 수신
  → /check-review-result

  🔄 개선사항 반영
  ✅ isLoading 추가
  ✅ ErrorBoundary 구현

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

  💬 "UI/UX 최적화 완료. 배포 가능합니다."

  → /submit-task
```

#### 8️⃣ TDD: REFACTOR Phase
```
TDD Agent:
  🔵 REFACTOR Phase 시작
  🔧 코드 리팩토링
  ✅ 전체 테스트 통과
  📊 최종 Coverage: 87%
```

#### 9️⃣ Claude A: 즉시 실행 (Codex 없이)
```
Claude A:
  ✅ Claude B 최종 승인 받음
  🚀 실행 시작

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

#### 🔟 Vercel 자동 배포
```
Vercel:
  🚀 Deployment triggered
  ✅ Build successful
  🌐 https://naraddon.com deployed
```

---

## 🚀 시작하기 (5분)

### 1단계: 대시보드 실행
```bash
# 브라우저에서 열기
start .claude/dashboard/monitor.html
```

### 2단계: 첫 작업 시작
```
대시보드 하단 입력창:
"나라똔튜브 admin 페이지 컴포넌트 분리해줘"

[실행] 버튼 클릭
```

### 3단계: 자동 진행
```
TDD → Claude A → Claude B → 승인 → 배포
(Codex 검증 없이 빠르게 진행)
```

---

## 📂 파일 구조 (간소화)

```
E:\Naraddon\homepage\
├── .claude/
│   ├── dashboard/
│   │   └── monitor.html              # 3칸 대시보드 (TDD, A, B)
│   ├── tasks/
│   │   ├── queue.json                # A → B 작업 큐
│   │   ├── review-queue.json         # B → A 검토 결과
│   │   └── monitor-state.json        # 실시간 상태
│   ├── commands/
│   │   ├── submit-for-review.md      # A: 검토 요청
│   │   ├── check-review-result.md    # A: 결과 확인
│   │   ├── check-inbox.md            # B: 작업 확인
│   │   ├── read-message.md           # B: 작업 읽기
│   │   └── submit-task.md            # B: 최종 승인
│   ├── ROLES-AND-RULES.md
│   ├── TWO-AGENT-SYSTEM.md           # 이 문서
│   └── QUICK-START.md
├── app/api/
│   ├── claude-monitor/route.ts       # 모니터 API
│   └── git-execute/route.ts          # Git 자동화 API
└── scripts/
    ├── watch-tasks.js                # B: 작업 큐 감시
    └── watch-reviews.js              # A: 검토 결과 감시
```

**제거된 파일**:
- ~~app/api/codex-verify/route.ts~~ (Codex CLI 제거)
- ~~.claude/commands/submit-for-codex.md~~ (Codex 명령 제거)
- ~~.claude/commands/check-codex-result.md~~ (Codex 명령 제거)

---

## ⚡ 장점 (2-Agent 시스템)

### 1. **속도 향상**
- Codex CLI 검증 단계 제거 (평균 1~2분 단축)
- Claude B 승인 즉시 배포 진행

### 2. **단순화**
- 워크플로우 단계 감소: 6단계 → 4단계
- Slash Commands: 8개 → 5개
- API Routes: 3개 → 2개

### 3. **비용 절감**
- OpenAI API 호출 불필요 (Codex CLI 제거)
- 환경변수 설정 불필요

### 4. **유연성**
- Claude B가 최종 승인 권한 보유
- 보안 검토도 Claude B가 직접 수행

---

## 🔐 Claude B의 확장된 책임

### 기존 검토 항목
- ✅ 코드 품질
- ✅ UI/UX 최적화
- ✅ 접근성
- ✅ 성능

### 추가된 검토 항목 (Codex 대체)
- ✅ **기본 보안 검증**
  - XSS 방어 확인
  - CSRF 토큰 확인
  - 입력 검증 (sanitization)
  - API 인증/인가 확인

- ✅ **안정성 검증**
  - Try-catch 에러 처리
  - Null/Undefined 체크
  - Edge Cases 처리

- ✅ **유지보수성**
  - 코드 복잡도 평가
  - 중복 코드 검사
  - 주석/문서화 확인

**검토 시간**: Codex 제거로 **1~2분 단축**

---

## 🎯 성공 지표

### 평균 작업 시간 (Codex 제거 후)
- 간단한 작업: **2~3분** (기존 3~5분)
- 중간 작업: **4~7분** (기존 5~10분)
- 복잡한 작업: **7~15분** (기존 10~20분)

### 체크리스트
- [ ] 대시보드에서 3칸 모두 표시됨 (TDD, A, B)
- [ ] Claude B가 보안/안정성도 검토함
- [ ] Claude B 승인 즉시 배포 진행
- [ ] 평균 작업 시간 1~2분 단축

---

## 🐛 트러블슈팅

### Q1. Claude B가 보안 검토를 놓칠 수 있나요?
**A**: Claude B의 검토 기준에 보안 항목이 추가되었습니다. 주요 취약점(XSS, CSRF 등)은 필수 체크 항목입니다.

### Q2. Codex CLI 없이 품질이 떨어지지 않나요?
**A**: Claude B가 코드 리뷰 시 보안/안정성을 함께 검토하므로, 대부분의 경우 충분합니다. 필요 시 수동으로 보안 스캔 도구를 사용할 수 있습니다.

### Q3. 나중에 Codex를 다시 추가할 수 있나요?
**A**: 네, 언제든지 `/submit-for-codex` 명령과 `codex-verify` API를 복원하면 됩니다.

---

## 📚 참고 문서

- `.claude/ROLES-AND-RULES.md` - 역할 및 규칙 상세
- `.claude/QUICK-START.md` - 빠른 시작 가이드
- `CLAUDE.md` - 프로젝트 전체 가이드

---

## ✅ 완성 체크리스트

### 필수 구성 요소
- [x] 모니터 대시보드 (3칸 레이아웃)
- [x] API Routes (claude-monitor, git-execute)
- [x] Slash Commands (5개)
- [x] Watch Scripts (tasks, reviews)
- [x] 역할 정의 문서 (업데이트)
- [x] 2-Agent 가이드 문서 (이 문서)

### Codex 제거 작업
- [ ] monitor.html에서 Codex 칸 제거 (3칸으로 변경)
- [ ] ROLES-AND-RULES.md에서 Codex 관련 내용 제거
- [ ] commands/에서 codex 관련 명령 제거
- [ ] Claude B 검토 기준에 보안/안정성 추가

---

## 🎉 완성!

**2-Agent 협업 시스템**으로 간소화 완료!

### 핵심 변경사항
- ✅ Codex CLI 제거 (OpenAI API 불필요)
- ✅ Claude B가 최종 승인 권한 보유
- ✅ 워크플로우 단순화 (6단계 → 4단계)
- ✅ 평균 1~2분 시간 단축

**Happy Coding! 🚀**

---

*최종 업데이트: 2025-10-06*
*문서 버전: 2.0.0 (Codex 제거)*
*작성자: Claude Code*
