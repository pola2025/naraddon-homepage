# 🤖 두 Claude 자동 협업 시스템 - 완벽 가이드

## 🎯 시스템 개요

사용자 개입 없이 두 Claude Code 인스턴스가 자동으로 협업하는 시스템입니다.

### 핵심 기능
- ✅ **완전 자동화**: 사용자 개입 없는 작업 위임 및 검토
- ✅ **실시간 모니터링**: 브라우저에서 TDD처럼 상태 확인
- ✅ **자동 컨텍스트 관리**: 토큰 한계 도달 시 자동 clear + 대화 저장
- ✅ **시각화 대시보드**: 실시간 작업 추적 및 로그 확인

---

## 📋 구성 요소

### 1. Claudine MCP Server
- **역할**: 백그라운드 Claude Code 인스턴스 태스크 위임
- **상태**: ✅ 설치 완료 (`.mcp.json`)
- **명령어**: `npx claudine mcp start`

### 2. Inbox 시스템
- **경로**: `.claude/inbox/`
- **구조**:
  ```
  .claude/inbox/
  ├── to-claude-a/    # Claude B → Claude A (검토 결과)
  ├── to-claude-b/    # Claude A → Claude B (작업 요청)
  └── archive/        # 처리 완료된 메시지
  ```

### 3. 컨텍스트 모니터
- **파일**: `.claude/scripts/context-monitor.js`
- **기능**:
  - 토큰 사용량 실시간 추적
  - 90% 도달 시 경고
  - 97.5% 도달 시 자동 clear + 대화 저장

### 4. 시각화 대시보드
- **URL**: http://localhost:3002
- **파일**: `.claude/dashboard/monitor.html`
- **서버**: `.claude/dashboard/server.js`

---

## 🚀 실행 방법

### 준비 단계

#### 1. 모든 디렉토리 생성 확인
```bash
# 자동으로 생성되지만, 수동 확인 시:
mkdir -p .claude/inbox/to-claude-a
mkdir -p .claude/inbox/to-claude-b
mkdir -p .claude/inbox/archive
mkdir -p .claude/conversations
mkdir -p .claude/dashboard
mkdir -p .claude/scripts
```

#### 2. 필수 패키지 설치 확인
```bash
# chokidar (파일 감시)
npm install --save-dev chokidar

# Claudine은 npx로 자동 설치됨
```

---

### 실행 순서

#### 터미널 1: 대시보드 서버 실행
```bash
# 시각화 대시보드 시작
node .claude/dashboard/server.js

# 출력:
# 🚀 Claude 협업 모니터 서버 시작
#    📊 대시보드: http://localhost:3002
#    📡 API: http://localhost:3002/api/claude-monitor
#    🔄 실시간 업데이트: http://localhost:3002/events
```

**브라우저에서 http://localhost:3002 열기** → 실시간 모니터링 시작

#### 터미널 2: Claude A (Main PM/Coder)
```bash
# VS Code에서 Claude Code 실행
# 사용자가 작업 요청
```

**예시 대화:**
```
사용자: "나라똔튜브 admin 페이지 컴포넌트 분리해줘"

Claude A:
  계획 수립 완료.

  작업:
  - 590줄 코드 분석
  - 5개 컴포넌트로 분리
  - 각 컴포넌트 80-150줄 목표

  [자동으로 Claude B에게 검토 요청]

  ✅ 검토 요청 전송됨
  📊 대시보드에서 확인하세요: http://localhost:3002
```

#### 터미널 3: Claudine MCP Server (백그라운드)
```bash
# 자동으로 백그라운드 실행됨
# 또는 수동 실행:
npx claudine mcp start
```

---

## 🔄 자동 워크플로우

### 1단계: Claude A가 작업 계획 수립
```javascript
// 사용자: "나라똔튜브 admin 컴포넌트 분리해줘"
// Claude A가 자동으로 작업 JSON 생성
{
  "id": "task-1728098400000",
  "title": "나라똔튜브 Admin 컴포넌트 분리",
  "files": ["app/naraddon-tube/admin/page.tsx"],
  "description": "590줄 코드를 5개 컴포넌트로 분리",
  "requirements": [
    "VideoForm.tsx 생성",
    "VideoList.tsx 생성",
    "ThumbnailUpload.tsx 생성",
    "useNaraddonTube.ts 생성",
    "page.tsx 리팩토링"
  ]
}
```

### 2단계: Claudine으로 Claude B에게 자동 위임
```javascript
// Claude A가 자동 실행
await claudine.DelegateTask({
  prompt: `
    Review 요청:
    - Task: [작업 JSON]
    - 분석 후 .claude/inbox/to-claude-a/review-{taskId}.json 생성
    - Decision: APPROVE/REJECT/NEEDS_CHANGES
  `,
  timeout: 600000 // 10분
});

// 대시보드 표시:
// 📤 Claude A → Claude B: 검토 요청
```

### 3단계: Claude B 백그라운드 자동 실행
```javascript
// Claude B (Claudine이 자동으로 실행)
// 1. 파일 읽기
const code = await readFile("app/naraddon-tube/admin/page.tsx");

// 2. 코드 분석
const analysis = analyzeComplexity(code);

// 3. 검토 결과 작성
{
  "taskId": "task-1728098400000",
  "status": "approved",
  "decision": "PROCEED",
  "feedback": "컴포넌트 분리 계획 승인. 구조 명확함.",
  "suggestions": [
    "VideoForm.tsx - 폼 로직만 (150줄)",
    "VideoList.tsx - 목록 렌더링 (120줄)",
    // ...
  ]
}

// 대시보드 표시:
// 📥 Claude B → Claude A: 검토 완료 (APPROVED)
```

### 4단계: Claude A 자동 실행
```javascript
// 파일 감시가 검토 결과 감지
// Claude A 자동 트리거

// 1. 검토 결과 읽기
const review = await readFile(`.claude/inbox/to-claude-a/review-{taskId}.json`);

// 2. Decision 확인 → PROCEED
if (review.decision === "PROCEED") {
  // 3. 자동 실행 (사용자 개입 없음)
  await createComponent("components/naraddon-tube/VideoForm.tsx");
  await createComponent("components/naraddon-tube/VideoList.tsx");
  // ...

  // 4. 완료 보고
  console.log("✅ 컴포넌트 분리 완료");
}

// 대시보드 표시:
// ✅ 작업 완료: 나라똔튜브 컴포넌트 분리
```

---

## 📊 대시보드 사용법

### 메인 화면 구성

#### 1. 상태 카드
- **Claude A (Main PM/Coder)**
  - 상태: 실행 중 / 대기 중
  - 현재 작업: 작업 제목
  - 완료된 작업: N개

- **Claude B (Reviewer)**
  - 상태: 검토 중 / 대기 중
  - 현재 검토: 작업 제목
  - 검토 완료: N개

- **컨텍스트 사용량**
  - 현재 토큰: 123,456
  - 프로그레스 바:
    - 0-90%: 파란색 (정상)
    - 90-97.5%: 주황색 (경고)
    - 97.5%+: 빨간색 (위험)
  - 자동 clear까지: 남은 토큰 수

#### 2. 작업 큐
- 진행 중 작업: 노란색 테두리 + 깜빡임
- 완료된 작업: 회색 처리
- 대기 중 작업: 파란색 테두리

#### 3. 타임라인
- 최근 10개 이벤트 표시
- 시간순 정렬
- 작업 전달, 검토 완료 등 주요 이벤트

#### 4. 실시간 로그
- 색상별 로그:
  - 🟢 초록: 성공 (INFO, SUCCESS)
  - 🟡 노랑: 경고 (WARNING)
  - 🔵 파랑: 정보 (INFO)
  - 🔴 빨강: 에러 (ERROR)
- 자동 스크롤
- 최대 100줄 유지

---

## 🔧 자동 컨텍스트 관리

### 토큰 추적
```javascript
// 매 응답마다 자동으로 토큰 카운트
// .claude/scripts/context-monitor.js가 자동 실행

// 90% 도달 시
⚠️ 경고: 토큰 92.3% 사용 중 - 곧 자동 clear됩니다

// 97.5% 도달 시
🚨 컨텍스트 한계 도달! 자동 clear 실행...
✅ 대화 요약 저장: .claude/conversations/summary-2025-10-05T12-00-00.md
✅ 전체 대화 아카이브: .claude/conversations/archive-2025-10-05T12-00-00.json
🔄 컨텍스트 초기화 완료
```

### 대화 복구
```javascript
// 새 세션 시작 시 자동으로 이전 대화 요약 로드
📂 이전 대화 복구:

# 대화 요약 (2025-10-05T12:00:00Z)

## 📊 통계
- 총 메시지: 45개
- 사용자 메시지: 12개
- 어시스턴트 메시지: 33개
- 총 토큰: 195,234

## 💬 주요 대화 내용
1. 나라똔튜브 admin 컴포넌트 분리
2. Admin 인증 로직 개선
3. 대시보드 API 에러 수정
...
```

---

## 📁 폴더 구조 전체

```
.claude/
├── inbox/
│   ├── to-claude-a/              # B → A 검토 결과
│   │   └── review-{id}.json
│   ├── to-claude-b/              # A → B 작업 요청
│   │   └── task-{id}.json
│   └── archive/                  # 처리 완료
│       ├── task-{id}.json
│       └── review-{id}.json
│
├── conversations/
│   ├── summary-{timestamp}.md    # 자동 저장된 요약
│   ├── archive-{timestamp}.json  # 전체 대화 아카이브
│   └── .checkpoint.json          # 토큰 체크포인트
│
├── dashboard/
│   ├── monitor.html              # 시각화 대시보드
│   └── server.js                 # 대시보드 서버
│
├── scripts/
│   ├── context-monitor.js        # 토큰 사용량 추적
│   ├── watch-reviews.js          # 자동 검토 결과 감시
│   └── watch-tasks.js            # 자동 작업 감시
│
├── workflows/
│   └── auto-collaboration.md     # 워크플로우 문서
│
├── commands/                      # 슬래시 커맨드
│   ├── submit-for-review.md
│   ├── check-inbox.md
│   └── check-review-result.md
│
├── .mcp.json                     # MCP 서버 설정
└── COLLABORATION-SETUP.md        # 이 문서
```

---

## 🎬 실제 사용 예시

### 시나리오: 나라똔튜브 Admin 컴포넌트 분리

#### 1. 사용자가 Claude A에게 요청
```
사용자: "나라똔튜브 admin 페이지 590줄이나 되는데 컴포넌트로 분리해줘"
```

#### 2. Claude A 자동 실행
```
Claude A:
  계획 수립 완료.

  📋 작업 내역:
  1. app/naraddon-tube/admin/page.tsx 분석
  2. 5개 컴포넌트로 분리:
     - VideoForm.tsx (폼 로직 150줄)
     - VideoList.tsx (목록 120줄)
     - ThumbnailUpload.tsx (업로드 UI 80줄)
     - useNaraddonTube.ts (데이터 훅 100줄)
     - page.tsx (레이아웃 80줄)

  🔄 Claude B에게 검토 요청 중...

  [Claudine DelegateTask 자동 실행]

  ✅ 검토 요청 전송 완료
  📊 대시보드: http://localhost:3002
```

#### 3. 대시보드 표시 (실시간)
```
[12:34:56] 📤 Claude A → Claude B: 나라똔튜브 Admin 컴포넌트 분리
[12:35:12] 🔍 Claude B 검토 중...
[12:35:45] ✅ Claude B → Claude A: 검토 완료 (APPROVED)
[12:35:46] 🚀 Claude A 실행 시작
[12:36:30] ✅ 작업 완료: 나라똔튜브 컴포넌트 분리
```

#### 4. Claude B 백그라운드 검토 (자동)
```
Claude B (백그라운드):
  📂 파일 읽기: app/naraddon-tube/admin/page.tsx
  📊 코드 분석:
     - 총 590줄
     - 인증 로직: 80줄
     - 폼 처리: 150줄
     - 목록 렌더링: 120줄
     - 썸네일 업로드: 80줄
     - 기타: 160줄

  ✅ 검토 결과: APPROVED

  💡 제안사항:
  - VideoForm.tsx: 폼 로직만 분리 (150줄)
  - VideoList.tsx: 목록 렌더링 (120줄)
  - ThumbnailUpload.tsx: 업로드 UI (80줄)
  - useNaraddonTube.ts: 데이터 훅 (100줄)
  - page.tsx: 레이아웃 통합 (80줄)

  [검토 결과 저장]
  → .claude/inbox/to-claude-a/review-task-1728098400000.json
```

#### 5. Claude A 자동 실행 (사용자 개입 없음)
```
Claude A:
  📥 검토 결과 수신: APPROVED

  🚀 자동 실행 시작...

  [1/5] ✅ VideoForm.tsx 생성 완료
  [2/5] ✅ VideoList.tsx 생성 완료
  [3/5] ✅ ThumbnailUpload.tsx 생성 완료
  [4/5] ✅ useNaraddonTube.ts 생성 완료
  [5/5] ✅ page.tsx 리팩토링 완료

  ✅ 모든 작업 완료!

  📊 결과:
  - 590줄 → 80줄 (86% 감소)
  - 5개 컴포넌트 생성
  - 타입 안전성 개선
  - 재사용성 향상
```

---

## 🔍 문제 해결

### Q1. 대시보드가 안 열려요
```bash
# 포트 확인
netstat -ano | findstr :3002

# 프로세스 종료 후 재시작
taskkill /F /PID [PID번호]
node .claude/dashboard/server.js
```

### Q2. Claudine이 작동 안 해요
```bash
# MCP 서버 상태 확인
npx claudine status

# 재시작
npx claudine mcp stop
npx claudine mcp start
```

### Q3. 파일 감시가 안 돼요
```bash
# 폴더 권한 확인
ls -la .claude/inbox/

# 수동으로 폴더 생성
mkdir -p .claude/inbox/to-claude-a
mkdir -p .claude/inbox/to-claude-b
```

### Q4. 토큰 추적이 안 돼요
```bash
# context-monitor.js 직접 실행
node .claude/scripts/context-monitor.js

# 체크포인트 확인
cat .claude/conversations/.checkpoint.json
```

---

## ✅ 완전 자동화 체크리스트

- [x] Claude A → Claude B 작업 위임 (Claudine)
- [x] Claude B 백그라운드 자동 실행
- [x] 검토 결과 자동 전달
- [x] Claude A 자동 실행
- [x] 토큰 한계 자동 감지
- [x] 자동 대화 저장 및 clear
- [x] 이전 대화 자동 복구
- [x] 실시간 시각화 대시보드
- [x] TDD 스타일 상태 확인

**🎉 사용자 개입 필요 없음 - 완전 자동화 달성!**

---

## 📚 추가 자료

- **Claudine 문서**: https://github.com/dean0x/claudine
- **MCP 가이드**: https://modelcontextprotocol.io
- **워크플로우 상세**: `.claude/workflows/auto-collaboration.md`
- **대시보드 API**: http://localhost:3002/api/claude-monitor

---

*최종 업데이트: 2025-10-05*
*문서 버전: 1.0.0*
