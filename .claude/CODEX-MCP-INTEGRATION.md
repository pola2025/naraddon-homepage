# 🔧 Codex CLI MCP 통합 가이드

## ✅ 설정 완료

Codex CLI와 VSCode Extension이 이제 4 Agent 시스템과 통합되었습니다.

### 📍 설정 위치
- **Codex Config**: `~/.codex/config.toml`
- **VSCode MCP**: `.vscode/mcp.json`
- **프로젝트 루트**: `E:/Naraddon/homepage`

## 🔌 MCP 서버 목록

Codex CLI가 이제 다음 MCP 서버에 접근할 수 있습니다:

1. **Memory Server** - Claude 간 통신
2. **Filesystem Server** - 프로젝트 파일 접근
3. **Fetch Server** - 웹 리소스 접근
4. **GitHub Server** - PR/Issue 관리
5. **ESLint Server** - 코드 품질 검사

## 🚀 4 Agent 시스템 아키텍처

```
사용자 요청
    ↓
[Claude A - PM/Developer]
    ↓ (MCP Memory 통신)
[Claude B - UI/UX Reviewer]
    ↓ (MCP Memory 통신)
[Codex CLI - Security/Stability]
    ↓
최종 배포
```

## 💡 Codex CLI 사용 방법

### 1. MCP Memory를 통한 작업 수신

Codex는 이제 Claude B의 승인 후 자동으로 작업을 수신합니다:

```javascript
// Claude B가 MCP Memory에 저장
mcp__memory__store({
  key: "codex-review-request-001",
  value: JSON.stringify({
    taskId: "task-001",
    files: ["app/naraddon-tube/admin/page.tsx"],
    claudeBApproval: "PROCEED",
    claudeBFeedback: "UI/UX 최적화 완료",
    timestamp: Date.now()
  })
})
```

```javascript
// Codex CLI가 MCP Memory에서 읽기
mcp__memory__retrieve({
  key: "codex-review-request-001"
})
```

### 2. 보안 검증 실행

Codex CLI는 다음을 검증합니다:

- ✅ **보안 취약점** (XSS, SQL Injection, CSRF)
- ✅ **인증/인가** (JWT, API 키 관리)
- ✅ **에러 핸들링**
- ✅ **코드 복잡도**
- ✅ **성능 최적화**

### 3. 검증 결과 반환

```javascript
// Codex CLI가 결과를 MCP Memory에 저장
mcp__memory__store({
  key: "codex-result-001",
  value: JSON.stringify({
    taskId: "task-001",
    score: 92,
    verdict: "APPROVED",
    issues: [],
    suggestions: [
      "API 키를 환경변수로 이동 권장"
    ],
    timestamp: Date.now()
  })
})
```

## 📋 슬래시 커맨드

### Claude A: `/submit-for-codex`
```markdown
1. Claude B 승인 확인
2. MCP Memory에 작업 저장 (key: codex-review-request-{id})
3. Codex 검증 대기 (최대 3분)
4. 결과 수신 후 배포 여부 결정
```

### Codex CLI: `/auto-verify-loop`
```markdown
1. MCP Memory에서 codex-review-request-* 검색
2. 각 요청에 대해:
   - 파일 읽기 (MCP Filesystem)
   - 보안/안정성 검증
   - 결과 저장 (key: codex-result-{id})
3. 10초 대기 후 반복
```

## 🎯 실제 워크플로우

### VS Code 1 (Claude A)
```
사용자: "나라똔튜브 컴포넌트 분리"

Claude A:
  ✅ 계획 수립
  ✅ Claude B에게 검토 요청
  ⏳ Claude B 승인 대기...
  ✅ Claude B 승인: PROCEED
  📤 Codex에게 보안 검증 요청
  ⏳ Codex 검증 대기...
  ✅ Codex 승인: 92/100
  🚀 배포 실행
```

### VS Code 2 (Claude B)
```
[/auto-review-loop 실행 중]

Claude B:
  📥 작업 수신: task-001
  🔍 UI/UX 검토...
  ✅ 승인: PROCEED
  📤 Codex에게 전달
```

### Terminal (Codex CLI)
```
[/auto-verify-loop 실행 중]

Codex CLI:
  📥 검증 요청 수신: task-001
  🔒 보안 스캔 시작...
  ✅ XSS 방어: 통과
  ✅ SQL Injection: 통과
  ✅ 에러 핸들링: 통과
  ⚠️  권장사항: 1건
  📊 최종 점수: 92/100
  ✅ 승인: DEPLOY READY
```

## ⚡ 장점

### 1. **빠른 검증**
- API 호출 10-15분 → MCP 통신 1-2분

### 2. **통합 환경**
- VSCode Extension + CLI 공유 설정
- 별도 서버 불필요

### 3. **실시간 통신**
- MCP Memory로 즉시 데이터 공유
- 폴링 간격 10초

### 4. **영구 저장**
- 검증 기록 보존
- 재시작 후에도 작업 이어가기 가능

## 🔧 트러블슈팅

### Codex CLI 연결 확인
```bash
# Codex 버전 확인
codex --version

# MCP 서버 상태 확인
cat ~/.codex/config.toml
```

### MCP Memory 테스트
```bash
# Claude에서 실행
mcp__memory__store({ key: "test", value: "hello" })
mcp__memory__retrieve({ key: "test" })
mcp__memory__list()
```

### 설정 재시작
```bash
# VSCode 재시작
# Codex CLI 재시작
codex reset
```

## 📝 다음 단계

1. ✅ Codex MCP 설정 완료
2. 🔄 슬래시 커맨드 구현
3. 🔄 Dashboard에 Codex 상태 추가
4. 🔄 실전 테스트

---

**업데이트**: 2025-10-05
**작성자**: Claude A (4 Agent System)
