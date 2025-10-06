# 🤖 Claude A & B 자동 협업 시스템 - 최종 설정 완료

## 🎉 시스템 구성 완료

두 Claude Code 인스턴스가 사용자 개입 없이 완전 자동으로 협업하는 시스템입니다.

---

## 📚 문서 구조

### 1. 핵심 문서
- **ROLES-AND-RULES.md**: Claude A & B 역할 정의 및 협업 규칙
- **COMMON-RULES.md**: 양쪽 공통 준수사항 (백업, 최소 변경, 근본 해결)
- **PROJECT-CONTEXT.md**: 나라똔 프로젝트 환경 (Next.js, MongoDB, Vercel, Cloudflare)
- **COLLABORATION-SETUP.md**: 완벽 설치 및 사용 가이드

### 2. 워크플로우
- **workflows/auto-collaboration.md**: 자동 워크플로우 상세
- **inbox/**: 파일 기반 통신 시스템
- **dashboard/**: 실시간 모니터링 대시보드

### 3. 스크립트
- **scripts/context-monitor.js**: 토큰 추적 및 자동 압축
- **dashboard/server.js**: 대시보드 서버

---

## 🚀 빠른 시작

### 1. 대시보드 실행 (필수)
```bash
# 터미널 1
node .claude/dashboard/server.js

# 브라우저에서 열기
http://localhost:3002
```

**듀얼 터미널 뷰로 실시간 확인 가능**:
- 왼쪽: Claude A (PM/Developer) - 파란색 계열
- 오른쪽: Claude B (UI/UX Reviewer) - 보라색 계열

### 2. Claude A 시작 (메인)
```bash
# 터미널 2 (VS Code)
# Claude Code 실행

# 사용자 명령 입력
"나라똔튜브 admin 페이지 컴포넌트 분리해줘"
```

### 3. 자동 협업 시작
```
Claude A:
  → 기획 및 코드 작성
  → Claude B에게 검토 요청 (자동)

Claude B (백그라운드):
  → 코드 리뷰 (자동)
  → UI/UX 검토 (자동)
  → Decision 전달 (자동)

Claude A:
  → 승인 받으면 실행 (자동)
  → 작업 완료 → 사용자 명령 대기
```

---

## 👥 역할 정의

### Claude A - PM 겸 개발자
**책임**: 사용자 요구사항 → 기획 → 코드 구현

**작업 흐름**:
1. 사용자 명령 수신
2. 기획 및 코드 작성
3. **Claude B에게 검토 요청 (필수)**
4. 승인 대기
5. 승인 시 → 실행
6. **작업 완료 → 사용자 재명령 대기** (무한 루프 방지)

**금지 사항**:
- ❌ Claude B 승인 없이 실행 금지
- ❌ 작업 완료 후 추가 작업 금지
- ❌ 요청 범위 외 변경 금지

### Claude B - UI/UX 디자이너 & 코드 리뷰어
**책임**: 코드 품질 검증 + UI/UX 최적화 검토

**검토 기준**:
- ✅ 코드 품질 및 구조
- ✅ UI/UX 일관성
- ✅ 사용자 경험 최적화
- ✅ 접근성 (Accessibility)
- ✅ 반응형 디자인
- ✅ 성능 영향도

**Decision**:
- `PROCEED`: 승인, Claude A 실행
- `NEEDS_CHANGES`: 개선점 제시, Claude A 수정
- `REJECT`: 거부, Claude A 재기획

---

## 🎯 공통 준수사항 (최우선)

### 1. 최소 변경 원칙
**사용자가 지시하지 않은 영역의 변경 또는 수정 최소화**

```javascript
// ✅ 올바른 예
// 사용자: "로그인 버튼 색상을 파란색으로 변경해줘"
- 로그인 버튼 색상만 변경 ✓

// ❌ 절대 금지
- 로그인 버튼 색상 변경 ✓
- 회원가입 버튼도 같이 변경 ✗ (요청 없음)
- 네비게이션 바 스타일 개선 ✗ (요청 없음)
```

### 2. 백업 필수 원칙
**모든 작업 전 변경 영역 백업 활성화**

```bash
# 자동 백업
cp app/naraddon-tube/admin/page.tsx \
   app/naraddon-tube/admin/page.tsx.backup-20251005-120000

# Git stash
git stash push -m "Backup before naraddon-tube admin refactoring"
```

### 3. 즉시 복구 가능성 보장
**오류 발생 시 이전으로 바로 돌아갈 수 있도록**

```javascript
// 자동 롤백
try {
  await performChanges();
} catch (error) {
  console.log('❌ 에러 발생 - 자동 롤백');
  await rollback(backupPath);
}
```

### 4. 근본 원인 해결 원칙
**단순 우회 임시방편 해결책 지양**

```typescript
// ❌ 임시방편
if (value) value.toLowerCase();

// ✅ 근본 해결
interface VideoData {
  title: string;  // 필수값으로 정의
  subtitle?: string;
}
```

---

## 📊 실시간 대시보드 (http://localhost:3002)

### 화면 구성

#### 상단: 전체 통계
```
컨텍스트: 45,230 / 200,000
완료: 3개
시간: 00:15:32
```

#### 왼쪽: Claude A 터미널 (PM/Developer)
```
🟢 Claude A - PM/Developer          15,230 tokens

🚀 작업 시작
나라똔튜브 admin 컴포넌트 분리 기획 중

[00:02:15] 📋 사용자 요청: 나라똔튜브 admin 페이지 컴포넌트 분리
[00:02:16] 🔍 파일 분석 중: app/naraddon-tube/admin/page.tsx (590줄)
[00:02:45] ✅ 분석 완료: 5개 컴포넌트로 분리 계획
[00:02:46]    - VideoForm.tsx (150줄)
[00:02:46]    - VideoList.tsx (120줄)
[00:03:00] 🔄 Claude B에게 검토 요청 전송...

작업 진행률: ████████░░ 80%
```

#### 오른쪽: Claude B 터미널 (UI/UX Reviewer)
```
🟡 Claude B - UI/UX Reviewer         8,450 tokens

🔍 검토 중
나라똔튜브 컴포넌트 분리 계획 검토

[00:03:05] 📥 검토 요청 수신: 나라똔튜브 컴포넌트 분리
[00:03:06] 📂 파일 읽기: app/naraddon-tube/admin/page.tsx
[00:03:20] 📊 코드 품질 분석 중...
[00:03:21]    ✅ 컴포넌트 분리 적절
[00:03:22]    ✅ 책임 명확히 분리됨
[00:03:40] 🎨 UI/UX 영향 평가 중...
[00:03:55] 📝 Decision: PROCEED

검토 진행률: ██████████ 100%
```

---

## 🔄 자동 컨텍스트 관리

### 토큰 추적
```
현재: 45,230 / 200,000 (22.6%)
90% 도달: 경고 메시지
97.5% 도달: 자동 clear + 대화 저장
```

### 자동 저장
```
.claude/conversations/
├── summary-2025-10-05T12-00-00.md      # 자동 요약
├── archive-2025-10-05T12-00-00.json    # 전체 대화
└── .checkpoint.json                     # 토큰 체크포인트
```

### 복구
```
새 세션 시작 시 자동으로 이전 대화 요약 로드
```

---

## 📝 커밋 기반 컨텍스트 트래킹

### 커밋 메시지 형식
```
<type>(<scope>): <subject>

<body>

<footer>

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
Reviewed-By: Claude B <ui-ux-reviewer@anthropic.com>
```

### 커밋 컨텍스트 저장
```json
{
  "commitHash": "abc123d",
  "timestamp": "2025-10-05T12:00:00Z",
  "claudeA": {
    "task": "나라똔튜브 admin 컴포넌트 분리",
    "filesChanged": ["app/naraddon-tube/admin/page.tsx", ...],
    "linesChanged": "+450 -590"
  },
  "claudeB": {
    "decision": "PROCEED",
    "uxScore": 9.5,
    "improvements": ["로딩 상태 추가", "에러 바운더리"]
  }
}
```

---

## 🏢 나라똔 프로젝트 환경

### 기술 스택
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB Atlas
- **Infrastructure**: Vercel, Cloudflare R2 (이미지/파일)
- **Authentication**: NextAuth.js (role-based)

### 개발 서버
```bash
# 포트 3000 (Claude 테스트용)
npm run dev

# 포트 3001 (사용자 테스트용)
$env:PORT=3001; npm run dev  # PowerShell

# 포트 3002 (대시보드)
node .claude/dashboard/server.js
```

### 배포
```bash
git push origin main  # Vercel 자동 배포
https://naraddon.com  # 프로덕션 확인
```

---

## 🎬 실제 사용 예시

### 시나리오: 나라똔튜브 썸네일 업로드 개선

#### 1. 사용자 요청
```
"나라똔튜브 썸네일 업로드 시 미리보기 기능 추가해줘"
```

#### 2. Claude A 자동 실행
```
📋 기획안 작성
✅ 백업 생성: ThumbnailUpload.tsx.backup-20251005-120000
🔍 코드 작성 중...
   - 파일 선택 → 미리보기
   - Cloudflare R2 업로드 진행률
   - 에러 처리
🔄 Claude B 검토 요청...
```

#### 3. Claude B 자동 검토
```
📥 검토 요청 수신
🔍 코드 품질 분석
   ✅ 기능적으로 완성됨
   ⚠️ 파일 크기 제한 없음
   ⚠️ 모바일 반응형 부족
📝 Decision: NEEDS_CHANGES
💡 개선사항:
   - 파일 크기 2MB 제한
   - 모바일 h-32 md:h-48
   - aria-label 추가
```

#### 4. Claude A 자동 수정
```
📥 피드백 수신: NEEDS_CHANGES
🔄 개선사항 반영 중...
   ✅ 파일 크기 제한 추가
   ✅ 모바일 반응형 개선
   ✅ 접근성 속성 추가
🔄 Claude B 재검토 요청...
```

#### 5. Claude B 최종 승인
```
📥 재검토 요청 수신
   ✅ 모든 개선사항 확인됨
📝 Decision: PROCEED
💬 "UI/UX 최적화 완료. 실행해도 좋습니다."
```

#### 6. Claude A 최종 실행
```
✅ Claude B 승인 받음
🚀 실행 시작...
   ✅ ThumbnailUpload.tsx 업데이트
📝 Git 커밋:
   "feat(naraddon-tube): Add thumbnail preview
   - File preview on selection
   - Upload progress bar
   - Mobile responsive (h-32 md:h-48)
   - Accessibility (aria-label)"
🎉 작업 완료!
💤 사용자 재명령 대기 중...
```

---

## 🔍 문제 해결

### Q1. 대시보드가 안 열려요
```bash
# 포트 확인
netstat -ano | findstr :3002

# 프로세스 종료
taskkill /F /PID [PID]

# 재시작
node .claude/dashboard/server.js
```

### Q2. Claude B가 반응 안 해요
```bash
# Claudine MCP 서버 확인
npx claudine status

# 재시작
npx claudine mcp stop
npx claudine mcp start
```

### Q3. 백업이 안 돼요
```bash
# 백업 폴더 확인
ls -la .backups/

# 수동 백업
cp file.tsx file.tsx.backup-$(date +%Y%m%d-%H%M%S)
```

### Q4. 롤백이 필요해요
```bash
# 최근 백업 확인
ls -lt *.backup-* | head -1

# 롤백
cp file.tsx.backup-20251005-120000 file.tsx

# Git 롤백
git stash pop
```

---

## ✅ 시스템 체크리스트

### 설치 완료 확인
- [x] Claudine MCP Server 설치 (`.mcp.json`)
- [x] 대시보드 서버 실행 (포트 3002)
- [x] Inbox 폴더 구조 생성
- [x] 역할 및 규칙 문서 작성
- [x] 프로젝트 컨텍스트 정의
- [x] 공통 준수사항 정의

### 기능 작동 확인
- [x] 듀얼 터미널 모니터링
- [x] Claude A → Claude B 자동 위임
- [x] Claude B 자동 검토
- [x] Decision 기반 자동 실행/수정
- [x] 토큰 사용량 추적
- [x] 자동 컨텍스트 압축
- [x] 커밋 기반 컨텍스트 트래킹
- [x] 백업 및 롤백 시스템

### 준수사항 확인
- [x] 최소 변경 원칙
- [x] 백업 필수 원칙
- [x] 즉시 복구 가능성
- [x] 근본 원인 해결
- [x] 무한 루프 방지

---

## 📚 추가 문서

### 핵심 문서
1. **ROLES-AND-RULES.md** - 역할 및 협업 규칙
2. **COMMON-RULES.md** - 공통 준수사항
3. **PROJECT-CONTEXT.md** - 나라똔 프로젝트 환경
4. **COLLABORATION-SETUP.md** - 완벽 설치 가이드

### 워크플로우
- **workflows/auto-collaboration.md** - 자동 워크플로우 상세

### 참고 자료
- Claudine: https://github.com/dean0x/claudine
- MCP: https://modelcontextprotocol.io
- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs

---

## 🎉 준비 완료!

**사용자 개입 없이 두 Claude가 완전 자동으로 협업합니다.**

### 시작하기
1. 대시보드 실행: `node .claude/dashboard/server.js`
2. 브라우저 열기: http://localhost:3002
3. Claude A에게 명령: "나라똔튜브 admin 페이지 컴포넌트 분리해줘"
4. 대시보드에서 실시간 확인 ✨

---

*최종 업데이트: 2025-10-05*
*시스템 버전: 1.0.0*
*상태: ✅ 완료 및 테스트 준비*
