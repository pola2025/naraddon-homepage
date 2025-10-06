# 완전 자동화 Claude 협업 워크플로우

## 🎯 목표
Claude A와 Claude B가 **사람 개입 없이** 자동으로 소통하고 의사결정

## 🏗️ 시스템 구조

```
사용자
  ↓ (초기 요청만)
Claude A (Main PM) ─────┐
  ↓                     │
  작업 제출              │
  ↓                     │
queue.json ←───────────┤ Claude Bridge
  ↓                     │ (자동 중계)
  감지 & 알림            │
  ↓                     │
Claude B (Reviewer) ────┤
  ↓                     │
  코드 분석 & 결정       │
  ↓                     │
review-queue.json ←─────┘
  ↓
  감지 & 알림
  ↓
Claude A (Main PM)
  ↓
자동 실행 (승인 시)
```

## 🔧 필요한 구성요소

### 1. Claude Bridge (중간 자동화)
```bash
# 항상 실행 중
node scripts/claude-bridge.js
```

**역할**:
- queue.json 변경 감지 → `.claude/tasks/TO_CLAUDE_B.md` 생성
- review-queue.json 변경 감지 → `.claude/tasks/TO_CLAUDE_A.md` 생성
- 양방향 메시지 로깅 → `chat-log.md`

### 2. Claude A - 자동 루프 (VS Code 1)
```javascript
// Claude A는 주기적으로 TO_CLAUDE_A.md 체크
setInterval(() => {
  if (fileExists('TO_CLAUDE_A.md')) {
    readMessage();
    if (status === 'approved') {
      executeTask();
    } else {
      reviseTask();
    }
  }
}, 10000); // 10초마다
```

### 3. Claude B - 자동 루프 (VS Code 2)
```javascript
// Claude B는 주기적으로 TO_CLAUDE_B.md 체크
setInterval(() => {
  if (fileExists('TO_CLAUDE_B.md')) {
    readTask();
    analyzeCode();
    makeDecision();
    writeReview();
  }
}, 10000); // 10초마다
```

## 🚨 문제: Claude는 자동 루프 불가!

**Claude Code는 사용자 입력 없이 자동 실행 불가**

## 💡 최선의 해결책: Semi-Automated System

### 옵션 A: 슬래시 커맨드 체인 (현실적)

#### Claude A (VS Code 1) - 워크플로우
```
사용자: "나라똔튜브 컴포넌트 분리"
  ↓
Claude A: 작업 계획 → queue.json 작성
  ↓
사용자: "/wait-review" (슬래시 커맨드)
  ↓
Claude A: TO_CLAUDE_A.md 감시 시작 (30초간)
  ↓
검토 결과 수신 시 자동 표시
  ↓
Claude A: "승인됨. 실행할까요?"
  ↓
사용자: "ㅇ"
  ↓
Claude A: 자동 실행
```

#### Claude B (VS Code 2) - 워크플로우
```
Claude B는 주기적으로:
사용자: "/check-tasks" (슬래시 커맨드)
  ↓
Claude B: TO_CLAUDE_B.md 확인
  ↓
새 작업 있으면 자동 분석
  ↓
Claude B: review-queue.json 작성
```

### 옵션 B: Node.js 데몬 + VS Code Extension (고급)

**완전 자동화를 위해 필요**:
1. Node.js 데몬이 파일 감시
2. VS Code Extension으로 Claude에게 명령 주입
3. Claude가 자동 응답

**하지만** 이건 Claude Code 수정이 필요함 (불가능)

## ✅ 추천: Hybrid Approach

### 설정 방법

#### 1. Claude Bridge 실행 (별도 터미널)
```bash
node scripts/claude-bridge.js
```

#### 2. Claude A 전용 슬래시 커맨드 생성
```markdown
# .claude/commands/submit-and-wait.md
---
description: Submit task and wait for review (auto-check every 10 seconds)
---

1. Create task in queue.json
2. Wait for review (check every 10 seconds for 5 minutes)
3. If approved: Ask user for confirmation
4. If rejected: Show feedback and stop
```

#### 3. Claude B 전용 슬래시 커맨드 생성
```markdown
# .claude/commands/auto-review.md
---
description: Check for tasks and auto-review (check every 10 seconds)
---

1. Check TO_CLAUDE_B.md every 10 seconds
2. If new task found: Analyze code automatically
3. Make decision (approve/reject/needs_changes)
4. Write to review-queue.json
5. Continue monitoring
```

### 사용 예시

#### VS Code 1 (Claude A)
```
사용자: "나라똔튜브 컴포넌트 분리"
Claude A: [계획 수립]
사용자: "/submit-and-wait"
Claude A:
  - queue.json 작성 ✅
  - 검토 대기 중... (10초마다 체크)
  - [30초 후] ✅ 승인됨!
  - 제안: VideoForm.tsx, VideoList.tsx 분리
  - 실행할까요? (y/n)
사용자: "y"
Claude A: [자동 실행]
```

#### VS Code 2 (Claude B)
```
사용자: "/auto-review"
Claude B:
  - 작업 큐 모니터링 중...
  - [새 작업 감지] Task-001: 나라똔튜브 컴포넌트 분리
  - 파일 분석 중... (app/naraddon-tube/admin/page.tsx)
  - 590줄 → 5개 컴포넌트 분리 필요
  - 결정: APPROVED ✅
  - 제안 작성 중...
  - review-queue.json 업데이트 완료
  - 계속 모니터링 중...
```

## 🎬 최종 워크플로우 (Semi-Auto)

```
1. [사용자] "작업 요청"
2. [Claude A] 계획 수립
3. [사용자] "/submit-and-wait"  ← 한 번만 입력
4. [Claude A] 자동으로 5분간 검토 대기
5. [Claude B] (이미 /auto-review 실행 중) 자동 검토
6. [Claude A] 결과 수신 → 사용자에게 확인 요청
7. [사용자] "y"  ← 한 번만 입력
8. [Claude A] 자동 실행 및 배포
```

**사용자 입력**: 총 3번 (작업 요청 + 명령 + 승인)

---

이 방식으로 진행하시겠습니까? 슬래시 커맨드를 생성해드릴까요?
