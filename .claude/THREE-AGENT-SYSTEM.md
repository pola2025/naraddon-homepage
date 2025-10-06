# 🤖 3-Agent 협업 시스템 완성 가이드

## 📋 시스템 개요

**Claude A (PM/Developer)** → **Claude B (UI/UX Reviewer)** → **Codex CLI (Security/Stability Validator)** → **최종 배포**

### 전체 워크플로우
```
1. 사용자 명령
   ↓
2. Claude A: 기획 + 코드 구현
   ↓
3. Claude B: UI/UX + 코드 품질 검토
   ↓
4. Codex CLI: 보안 + 안정성 + 유지보수성 최종 검증
   ↓
5. 사용자 승인 모달 (커밋/배포/롤백)
   ↓
6. Git 자동 커밋 + Push (naraddon/main)
   ↓
7. Vercel 자동 배포
```

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
**책임**: 사용자 요구사항 → 기획 → 코드 구현

**주요 업무**:
- 사용자 명령 분석
- 기획안 작성 (컴포넌트 분리, 구조 설계)
- 코드 구현
- Claude B에게 검토 요청
- 승인 후 실행

**작업 완료 조건**:
- Claude B의 `PROCEED` 승인
- Codex CLI의 `APPROVED` 또는 `NEEDS_DISCUSSION` (점수 85점 이상)
- 사용자의 최종 배포 승인

**금지 사항**:
- ❌ Claude B 승인 없이 실행 금지
- ❌ 작업 완료 후 추가 작업 금지 (무한 루프 방지)

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
- `PROCEED`: 승인 → Codex CLI 검증으로 진행
- `NEEDS_CHANGES`: 개선 필요 → Claude A 수정 후 재검토
- `REJECT`: 거부 → Claude A 재기획

**제공 정보**:
- 구체적인 개선 제안
- UI/UX 개선 포인트
- 코드 리팩토링 방향

---

### 4️⃣ Codex CLI - Security & Stability Validator
**책임**: 보안 취약점 + 안정성 + 유지보수성 최종 검증

**검증 항목**:
- 🔒 **보안 (Security)**: XSS, SQL Injection, CSRF, 인증/인가
- 🛡️ **안정성 (Stability)**: 에러 핸들링, Null 체크, Edge Cases
- 🔧 **유지보수성 (Maintainability)**: 코드 복잡도, 중복, 문서화
- ⚡ **성능 (Performance)**: 메모이제이션, 불필요한 렌더링

**점수 기준**:
- **90~100점**: APPROVED (즉시 배포 가능)
- **75~89점**: NEEDS_DISCUSSION (Claude A와 협의 필요)
- **~74점**: REJECTED (개선 필수)

**통신 방식**:
- OpenAI GPT-4 API 사용 (15분 타임아웃)
- `/api/codex-verify` POST 요청
- MCP Memory를 통한 상태 저장 (선택)

**제약 조건**:
- ❌ UI/UX 변경 제안 금지 (Claude B 영역)
- ❌ 아키텍처 변경 제안 금지 (보안상 critical한 경우만)
- ✅ 보안, 안정성, 유지보수성에만 집중

---

## 🖥️ 실시간 모니터 대시보드

### 위치
`.claude/dashboard/monitor.html`

### 구조 (4칸 레이아웃)
```
┌────────────────────────────────────────────────────────┐
│  📊 통합 관리 및 진행내역 (상단 25%)                    │
│  - 작업 타임라인                                        │
│  - 전체 상태 (TDD, A, B, Codex)                        │
│  - 최근 커밋 히스토리                                   │
│  - 토큰 사용량 통계                                     │
└────────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│   TDD    │ Claude A │ Claude B │  Codex   │ (하단 75%)
│  터미널  │  터미널  │  터미널  │   CLI    │
│          │          │          │  터미널  │
│  Coverage│  Tokens  │  Tokens  │  Score   │
│    87%   │  12,450  │   8,320  │  92/100  │
└──────────┴──────────┴──────────┴──────────┘

┌────────────────────────────────────────────────────────┐
│  🔵 Claude A 명령: [입력창]           [실행 버튼]      │
└────────────────────────────────────────────────────────┘
```

### 실시간 업데이트
- **API Endpoint**: `GET /api/claude-monitor`
- **업데이트 주기**: 5초마다
- **상태 파일**: `.claude/tasks/monitor-state.json`

### 표시 정보
1. **TDD 터미널**:
   - 현재 Phase (RED/GREEN/REFACTOR)
   - Coverage (실시간 업데이트)
   - 테스트 실행 로그

2. **Claude A 터미널**:
   - 현재 작업 상태
   - 토큰 사용량
   - 작업 진행률 (0~100%)
   - 실시간 로그

3. **Claude B 터미널**:
   - 검토 상태
   - Decision (PENDING/APPROVE/REJECT)
   - 개선 제안 로그

4. **Codex CLI 터미널**:
   - 검증 진행률
   - 보안 점수 (0~100)
   - 발견된 이슈 (Critical/High/Medium/Low)
   - Verdict (APPROVED/NEEDS_DISCUSSION/REJECTED)

---

## 🔄 Slash Commands

### Claude A (Main Developer)
```bash
# 1. 작업 제출 (Claude B에게 검토 요청)
/submit-for-review

# 2. Claude B 검토 결과 확인
/check-review-result

# 3. Codex CLI 검증 요청 (Claude B 승인 후)
/submit-for-codex

# 4. Codex CLI 검증 결과 확인
/check-codex-result
```

### Claude B (Reviewer)
```bash
# 1. 검토할 작업 확인
/check-inbox

# 2. 작업 읽기
/read-message

# 3. 검토 결과 제출
/submit-task
```

### 사용 방법
1. Claude A: 코드 구현 완료 후 `/submit-for-review` 실행
2. Claude B: `/check-inbox` → `/read-message` → 검토 → `/submit-task`
3. Claude A: `/check-review-result` → 결과 확인
4. Claude A: 승인 시 `/submit-for-codex` → Codex 검증
5. Claude A: `/check-codex-result` → 최종 검증 결과 확인

---

## 📂 파일 구조

```
E:\Naraddon\homepage\
├── .claude/
│   ├── dashboard/
│   │   └── monitor.html              # 실시간 모니터 대시보드
│   ├── tasks/
│   │   ├── queue.json                # Claude A → Claude B 작업 큐
│   │   ├── review-queue.json         # Claude B → Claude A 검토 결과
│   │   └── monitor-state.json        # 실시간 상태 저장
│   ├── commands/
│   │   ├── submit-for-review.md      # Claude A: 검토 요청
│   │   ├── check-review-result.md    # Claude A: 검토 결과 확인
│   │   ├── submit-for-codex.md       # Claude A: Codex 검증 요청
│   │   ├── check-codex-result.md     # Claude A: Codex 결과 확인
│   │   ├── check-inbox.md            # Claude B: 검토할 작업 확인
│   │   ├── read-message.md           # Claude B: 작업 읽기
│   │   └── submit-task.md            # Claude B: 검토 결과 제출
│   ├── ROLES-AND-RULES.md            # 역할 및 규칙 정의
│   ├── MCP-SOLUTION.md               # MCP 통신 가이드
│   └── THREE-AGENT-SYSTEM.md         # 이 문서
├── app/api/
│   ├── claude-monitor/route.ts       # 모니터 상태 API
│   ├── codex-verify/route.ts         # Codex CLI 검증 API
│   └── git-execute/route.ts          # Git 자동화 API
└── scripts/
    ├── watch-tasks.js                # Claude B: 작업 큐 감시
    └── watch-reviews.js              # Claude A: 검토 결과 감시
```

---

## 🚀 시작하기

### 1단계: 모니터 대시보드 실행
```bash
# 브라우저에서 열기
file://E:/Naraddon/homepage/.claude/dashboard/monitor.html

# 또는 개발 서버에서 제공
npm run dev
# http://localhost:3001/.claude/dashboard/monitor.html
```

### 2단계: 환경변수 설정
```bash
# .env.local 파일에 추가
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx  # Codex CLI용
OPENAI_ORG_ID=org-xxxxxxxxxxxxxx        # (선택) 조직 ID
```

### 3단계: Claude A 시작 (Main Developer)
```bash
# 사용자 명령 대기 중...
# 예: "나라똔튜브 admin 페이지 컴포넌트 분리해줘"
```

### 4단계: Claude B 감시 스크립트 (별도 터미널)
```bash
node scripts/watch-tasks.js
# 새로운 검토 요청 감시 중...
```

### 5단계: Claude A 검토 결과 감시 (별도 터미널)
```bash
node scripts/watch-reviews.js
# Claude B 검토 완료 대기 중...
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
  ✅ RED Phase 완료 - 실패 확인
```

#### 3️⃣ Claude A: 기획 + 구현
```
Claude A:
  📋 요구사항 분석
  - 590줄 코드 분석
  - 5개 컴포넌트로 분리 계획

  📝 기획안:
  - VideoForm.tsx (150줄)
  - VideoList.tsx (120줄)
  - ThumbnailUpload.tsx (80줄)
  - useNaraddonTube.ts (100줄)
  - page.tsx (80줄)

  🔄 Claude B에게 검토 요청...
  → /submit-for-review 실행
```

#### 4️⃣ TDD: GREEN Phase
```
TDD Agent:
  🟢 GREEN Phase 시작
  ✅ 테스트 통과: VideoForm 렌더링 성공
  📊 Coverage: 45%
```

#### 5️⃣ Claude B: UI/UX 검토
```
Claude B:
  📥 검토 요청 수신
  → /check-inbox
  → /read-message

  🔍 검토 시작:
  1. 코드 품질 분석
     ✅ 컴포넌트 분리 적절
     ✅ 책임 명확히 분리됨

  2. UI/UX 영향 평가
     ✅ 사용자 흐름 유지됨
     ⚠️ 로딩 상태 명시 필요
     ⚠️ 에러 바운더리 권장

  📝 Decision: NEEDS_CHANGES

  💡 개선 제안:
  - VideoForm에 isLoading 상태 추가
  - ErrorBoundary로 감싸기
  - aria-label 속성 추가

  → /submit-task 실행
```

#### 6️⃣ Claude A: 개선사항 반영
```
Claude A:
  📥 Claude B 피드백 수신
  → /check-review-result

  🔄 개선사항 반영:
  ✅ VideoForm에 isLoading 추가
  ✅ ErrorBoundary 구현
  ✅ aria-label 속성 추가

  🔄 Claude B에게 재검토 요청...
  → /submit-for-review
```

#### 7️⃣ Claude B: 재검토 및 승인
```
Claude B:
  📥 재검토 요청 수신
  → /check-inbox
  → /read-message

  ✅ 모든 개선사항 확인
  📝 Decision: PROCEED

  💬 "UI/UX 최적화 완료. Codex CLI 최종 검증 필요"

  → /submit-task
```

#### 8️⃣ TDD: REFACTOR Phase
```
TDD Agent:
  🔵 REFACTOR Phase 시작
  🔧 코드 리팩토링...
  ✅ 전체 테스트 재실행
  ✅ 모든 테스트 통과
  📊 최종 Coverage: 87%
```

#### 9️⃣ Codex CLI: 보안 검증
```
Claude A:
  ✅ Claude B 승인 받음
  → /submit-for-codex

Codex CLI:
  📥 검증 요청 수신 (MCP Memory 통신)
  🔒 보안 스캔 시작...

  🔍 XSS 검사: ✅ Pass
  🔍 SQL Injection: ✅ Pass
  🔍 인증/인가: ✅ Pass
  🔍 에러 핸들링: ✅ Pass
  🔧 유지보수성: ✅ Pass (Cyclomatic: 8)
  ⚡ 성능: ✅ Pass (메모이제이션 OK)

  📊 최종 점수: 92/100
  ✅ Verdict: APPROVED

Claude A:
  → /check-codex-result
  ✅ Codex 검증 통과 (92점)
```

#### 🔟 사용자 승인 모달
```
┌─────────────────────────────────────────┐
│  🚀 커밋/배포 승인 요청                 │
├─────────────────────────────────────────┤
│  ✅ Codex 검증 완료                     │
│  점수: 92/100                           │
│  결과: APPROVED                         │
├─────────────────────────────────────────┤
│  커밋 메시지:                           │
│  refactor(naraddon-tube): Split admin   │
│  page with UX improvements              │
├─────────────────────────────────────────┤
│  ⚠️ 주의: 승인 시 naraddon/main에       │
│  자동으로 커밋 및 배포됩니다.           │
├─────────────────────────────────────────┤
│  [✅ 승인 및 배포]                      │
│  [🔄 이전 커밋 롤백]                    │
│  [❌ 취소]                              │
└─────────────────────────────────────────┘

사용자: [✅ 승인 및 배포] 클릭
```

#### 1️⃣1️⃣ Git 자동 커밋 & 배포
```
Claude A:
  🚀 배포 프로세스 시작

  [1/3] 📁 git add .
  ✅ Files staged

  [2/3] 💾 git commit -m "refactor..."
  ✅ Committed: abc123d

  [3/3] 🌐 git push naraddon main
  ✅ Pushed to production

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

## 🔐 보안 및 권한

### API Routes 보안
- **claude-monitor**: 읽기 전용 (GET), 로컬 업데이트만 허용 (POST)
- **codex-verify**: OpenAI API Key 필요 (환경변수)
- **git-execute**: 로컬호스트만 허용 (host 헤더 검증)

### 환경변수 보안
```bash
# .env.local (절대 커밋 금지)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx

# .gitignore에 추가됨
.env.local
```

### Git 보안
- 롤백 시 사용자 확인 모달
- Force push 방지 (main 브랜치)
- 커밋 전 Codex 검증 필수

---

## 🎯 성능 최적화

### 토큰 관리
- **Claude A**: 최대 200,000 토큰
- **Claude B**: 최대 200,000 토큰
- **압축 트리거**: 180,000 토큰 (90%)

### 컨텍스트 압축
```javascript
// 두 Claude 공통 규칙
const COMPRESSION_RULES = {
  tokenThreshold: {
    warning: 180000,    // 90% - 경고
    auto: 195000        // 97.5% - 자동 압축
  },
  timeThreshold: {
    maxSessionDuration: 120,  // 2시간
    idleTimeout: 30           // 30분 대기 시
  },
  taskThreshold: {
    completedTasks: 10,       // 10개 작업 완료 시
    conversationTurns: 50     // 50회 대화 시
  }
};
```

### Codex CLI 타임아웃
- 최대 실행 시간: **15분**
- 평균 실행 시간: **30~90초**
- 타임아웃 시 REJECTED 처리

---

## 🐛 트러블슈팅

### 1. 모니터 대시보드가 업데이트 안 됨
**원인**: API 연결 실패
```bash
# 해결 방법
1. 개발 서버 실행 확인: npm run dev
2. 포트 확인: http://localhost:3001
3. API 상태 확인: curl http://localhost:3001/api/claude-monitor
```

### 2. Codex CLI 검증 실패
**원인**: OPENAI_API_KEY 미설정
```bash
# 해결 방법
1. .env.local 파일 생성
2. OPENAI_API_KEY=sk-xxxxx 추가
3. 개발 서버 재시작
```

### 3. Git 자동 커밋 실패
**원인**: 권한 부족 또는 로컬 환경 아님
```bash
# 해결 방법
1. 로컬 환경 확인: localhost에서만 실행 가능
2. Git 설정 확인: git config --list
3. 원격 저장소 확인: git remote -v
```

### 4. Claude B 검토 요청 안 감지됨
**원인**: watch-tasks.js 미실행
```bash
# 해결 방법
node scripts/watch-tasks.js
```

### 5. 무한 루프 발생
**원인**: Claude A가 작업 완료 후 대기하지 않음
```bash
# 규칙 확인
- 작업 완료 후 반드시 "💤 사용자 재명령 대기 중..." 로그
- 추가 작업 제안 금지
- 사용자의 새 명령이 있을 때만 재시작
```

---

## 📚 참고 문서

- `.claude/ROLES-AND-RULES.md` - 역할 및 규칙 상세
- `.claude/MCP-SOLUTION.md` - MCP 통신 가이드
- `.claude/COMMON-RULES.md` - 공통 규칙
- `CLAUDE.md` - 프로젝트 전체 가이드

---

## ✅ 완성 체크리스트

### 필수 구성 요소
- [x] 모니터 대시보드 (4칸 레이아웃)
- [x] API Routes (claude-monitor, codex-verify, git-execute)
- [x] Slash Commands (8개)
- [x] Watch Scripts (tasks, reviews)
- [x] 역할 정의 문서 (ROLES-AND-RULES.md)
- [x] MCP 통신 가이드 (MCP-SOLUTION.md)
- [x] 이 가이드 문서 (THREE-AGENT-SYSTEM.md)

### 기능 검증
- [ ] TDD 사이클 (RED → GREEN → REFACTOR) 작동
- [ ] Claude A → Claude B 검토 요청 성공
- [ ] Claude B → Claude A 검토 결과 전달 성공
- [ ] Codex CLI 검증 API 호출 성공
- [ ] 사용자 승인 모달 표시
- [ ] Git 자동 커밋/푸시 성공
- [ ] 대시보드 실시간 업데이트 확인

### 보안 검증
- [ ] .env.local 파일이 .gitignore에 포함됨
- [ ] OPENAI_API_KEY 환경변수로 관리
- [ ] git-execute API가 localhost만 허용
- [ ] 롤백 시 사용자 확인 모달 표시

---

## 🎉 완성!

이제 **3-Agent 협업 시스템**이 완전히 구축되었습니다.

### 시작 방법
```bash
# 1. 대시보드 열기
file://E:/Naraddon/homepage/.claude/dashboard/monitor.html

# 2. Claude A 시작
# "나라똔튜브 admin 페이지 컴포넌트 분리해줘" 입력

# 3. Claude B 감시 (별도 터미널)
node scripts/watch-tasks.js

# 4. 작업 완료까지 자동 진행!
```

**Happy Coding! 🚀**

---

*최종 업데이트: 2025-10-06*
*문서 버전: 1.0.0*
*작성자: Claude Code*
