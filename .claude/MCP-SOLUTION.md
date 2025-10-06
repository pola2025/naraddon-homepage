# ✅ 해결책: MCP Memory Server를 활용한 Claude 간 통신

## 🎯 발견한 핵심 기능

`.vscode/mcp.json`에 이미 **Memory Server**가 설정되어 있습니다!

```json
"memory": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "description": "컨텍스트 기억 - 대화 중 중요한 정보를 저장하고 재사용합니다"
}
```

## 💡 작동 원리

### MCP Memory Server의 기능
1. **영구 저장소**: Claude가 정보를 저장하고 나중에 읽을 수 있음
2. **세션 간 공유**: 다른 Claude 인스턴스도 같은 메모리 접근 가능
3. **구조화된 데이터**: Key-value 형식으로 저장

### 두 Claude가 통신하는 방법

```
Claude A (VS Code 1)
  ↓
MCP Memory Write
  ↓
Shared Memory Store
  ↓
MCP Memory Read
  ↓
Claude B (VS Code 2)
```

## 🚀 구현 방법

### 1. MCP Memory 도구 확인

Claude Code는 MCP 서버가 있으면 자동으로 도구를 제공합니다:
- `mcp__memory__store` - 메모리에 저장
- `mcp__memory__retrieve` - 메모리에서 읽기
- `mcp__memory__list` - 저장된 항목 목록
- `mcp__memory__delete` - 항목 삭제

### 2. 통신 프로토콜

#### Claude A → Claude B (작업 요청)
```javascript
// Claude A가 실행
mcp__memory__store({
  key: "task-request-001",
  value: JSON.stringify({
    id: "task-001",
    type: "code-review",
    title: "나라똔튜브 Admin 컴포넌트 분리",
    files: ["app/naraddon-tube/admin/page.tsx"],
    description: "590줄 코드를 컴포넌트로 분리",
    status: "pending_review",
    timestamp: Date.now(),
    from: "claude-a",
    to: "claude-b"
  })
})
```

#### Claude B → Claude A (검토 결과)
```javascript
// Claude B가 실행
mcp__memory__store({
  key: "review-result-001",
  value: JSON.stringify({
    taskId: "task-001",
    status: "approved",
    feedback: "컴포넌트 분리 승인",
    suggestions: [...],
    decision: "PROCEED",
    autoExecute: true,
    timestamp: Date.now(),
    from: "claude-b",
    to: "claude-a"
  })
})
```

### 3. 폴링 메커니즘

#### Claude A - 검토 대기
```javascript
// 주기적으로 체크 (슬래시 커맨드로 실행)
async function waitForReview(taskId) {
  for (let i = 0; i < 30; i++) {  // 5분간 (10초 간격)
    const result = await mcp__memory__retrieve({
      key: `review-result-${taskId}`
    });

    if (result) {
      const review = JSON.parse(result);
      if (review.status === 'approved') {
        return 'PROCEED';
      } else {
        return 'STOP';
      }
    }

    await sleep(10000);  // 10초 대기
  }

  return 'TIMEOUT';
}
```

#### Claude B - 작업 모니터링
```javascript
// 주기적으로 체크 (슬래시 커맨드로 실행)
async function checkForTasks() {
  const tasks = await mcp__memory__list({
    prefix: "task-request-"
  });

  for (const task of tasks) {
    if (task.status === 'pending_review') {
      // 자동 검토
      const review = await reviewCode(task);
      // 결과 저장
      await mcp__memory__store({
        key: `review-result-${task.id}`,
        value: JSON.stringify(review)
      });
    }
  }
}
```

## 📋 슬래시 커맨드 구현

### Claude A용: `/submit-and-wait`
```markdown
---
description: Submit task to Claude B and wait for review (via MCP Memory)
---

1. Create task object
2. Store in MCP Memory with key "task-request-{taskId}"
3. Poll for "review-result-{taskId}" every 10 seconds for 5 minutes
4. When result found:
   - If approved: Ask user "실행할까요?"
   - If rejected: Show feedback and stop
   - If needs_changes: Show suggestions
```

### Claude B용: `/auto-review-loop`
```markdown
---
description: Continuously check for tasks and auto-review (via MCP Memory)
---

1. List all MCP Memory keys with prefix "task-request-"
2. For each pending task:
   - Read the code files
   - Analyze and make decision
   - Store review result with key "review-result-{taskId}"
3. Wait 10 seconds
4. Repeat (user can stop with Ctrl+C)
```

## 🎬 실제 사용 흐름

### VS Code 1 (Claude A - Main PM)
```
사용자: "나라똔튜브 컴포넌트 분리해줘"

Claude A:
  작업 계획 수립중...
  ✅ 계획 완료

  [MCP Memory에 저장]
  - Key: task-request-001
  - Value: { ... 작업 정보 ... }

  검토 요청 전송됨. 검토 대기중... (최대 5분)

  [10초마다 MCP Memory 확인]
  ...
  [30초 후]

  ✅ 검토 완료!
  상태: APPROVED
  제안:
  - VideoForm.tsx 생성
  - VideoList.tsx 생성
  - useNaraddonTube.ts 생성

  실행할까요? (y/n)

사용자: "y"

Claude A:
  컴포넌트 생성중...
  ✅ 완료!
```

### VS Code 2 (Claude B - Reviewer)
```
[백그라운드에서 /auto-review-loop 실행 중]

Claude B:
  MCP Memory 모니터링중...

  [새 작업 발견]
  📋 Task-001: 나라똔튜브 컴포넌트 분리

  파일 분석중...
  - app/naraddon-tube/admin/page.tsx (590줄)

  문제점:
  - 인증, UI, 로직이 한 파일에 혼재
  - 컴포넌트 분리 필요

  결정: APPROVED ✅

  [MCP Memory에 저장]
  - Key: review-result-001
  - Value: { status: "approved", ... }

  검토 완료. 계속 모니터링중...
```

## ✅ 장점

1. **자동 통신**: MCP Memory로 실시간 데이터 공유
2. **영구 저장**: Claude 재시작해도 정보 유지
3. **구조화**: JSON 형식으로 명확한 프로토콜
4. **VS Code 통합**: 별도 서버/데이터베이스 불필요
5. **양방향**: A→B, B→A 모두 가능

## 🔧 즉시 테스트 가능

MCP Memory 서버가 이미 설정되어 있으므로 **지금 바로 사용 가능**합니다!

---

**다음 단계**: 슬래시 커맨드 `/submit-and-wait` 와 `/auto-review-loop`를 생성할까요?
