# 🚀 3-Agent 시스템 빠른 시작 가이드

## 📌 5분 만에 시작하기

### 1️⃣ 환경변수 설정 (1분)
```bash
# .env.local 파일 생성 (프로젝트 루트)
echo "OPENAI_API_KEY=sk-your-api-key-here" >> .env.local
```

### 2️⃣ 모니터 대시보드 실행 (1분)
```bash
# 브라우저에서 열기
start .claude/dashboard/monitor.html

# 또는 개발 서버 실행 후
npm run dev
# http://localhost:3001/.claude/dashboard/monitor.html
```

### 3️⃣ 첫 작업 시작 (3분)
```
대시보드 하단 입력창에 명령 입력:
"나라똔튜브 admin 페이지 컴포넌트 분리해줘"

[실행] 버튼 클릭

→ 자동으로 진행됩니다!
```

---

## 🎯 실시간 모니터링

### 대시보드에서 확인할 수 있는 것
```
┌─────────────────────────────────────────────────┐
│ TDD          │ Claude A     │ Claude B  │ Codex │
│ Coverage:87% │ Tokens:12.4K │ Reviewing │ 92/100│
│ 🟢 GREEN     │ 🚀 작업 중   │ 🔍 검토중 │ ✅ OK │
└─────────────────────────────────────────────────┘
```

### 진행 과정
1. **TDD**: 🔴 RED → 🟢 GREEN → 🔵 REFACTOR
2. **Claude A**: 기획 → 구현 → 검토 요청
3. **Claude B**: 코드 품질 검토 → UI/UX 평가 → 승인/거부
4. **Codex CLI**: 보안 스캔 → 안정성 검증 → 점수 산출

---

## ⚡ 주요 명령어

### Claude A (Main Developer)
| 명령어 | 설명 |
|--------|------|
| `/submit-for-review` | Claude B에게 검토 요청 |
| `/check-review-result` | 검토 결과 확인 |
| `/submit-for-codex` | Codex CLI 검증 요청 |
| `/check-codex-result` | Codex 결과 확인 |

### Claude B (Reviewer)
| 명령어 | 설명 |
|--------|------|
| `/check-inbox` | 검토할 작업 확인 |
| `/read-message` | 작업 내용 읽기 |
| `/submit-task` | 검토 결과 제출 |

---

## 🔄 전체 워크플로우 (자동)

```
사용자 명령
    ↓
TDD: RED Phase (테스트 작성)
    ↓
Claude A: 코드 구현
    ↓
TDD: GREEN Phase (테스트 통과)
    ↓
Claude A: 검토 요청 → Claude B
    ↓
Claude B: UI/UX 검토
    ↓
  PROCEED? ─┬─ YES → Codex CLI 검증
            └─ NO → Claude A 수정
    ↓
Codex CLI: 보안 검증
    ↓
  APPROVED? ─┬─ YES → 사용자 승인 모달
             └─ NO → Claude A 개선
    ↓
사용자: [✅ 승인 및 배포]
    ↓
Git 자동 커밋 + Push (naraddon/main)
    ↓
Vercel 자동 배포
    ↓
🎉 완료!
```

---

## 🐛 문제 해결

### Q1. 대시보드가 업데이트 안 됨
```bash
# 개발 서버 재시작
npm run dev
```

### Q2. Codex 검증 실패
```bash
# API Key 확인
cat .env.local | grep OPENAI
# OPENAI_API_KEY=sk-xxxxx 있어야 함
```

### Q3. Git 커밋 실패
```bash
# localhost에서만 실행 가능
# 브라우저 주소창 확인: localhost:3001
```

### Q4. Claude B가 검토 안 함
```bash
# 감시 스크립트 실행 (별도 터미널)
node scripts/watch-tasks.js
```

---

## 📊 성공 지표

### 체크리스트
- [ ] 대시보드에서 4칸 모두 표시됨
- [ ] TDD Coverage가 실시간 업데이트됨
- [ ] Claude A 토큰이 증가함
- [ ] Claude B Decision이 표시됨
- [ ] Codex 점수가 표시됨 (0~100)
- [ ] 커밋 히스토리에 새 커밋 추가됨

### 예상 시간
- 간단한 작업: **3~5분**
- 중간 작업: **5~10분**
- 복잡한 작업: **10~20분**

---

## 🎉 첫 작업 추천

### 초보자용
```
"나라똔튜브 admin 페이지에 로딩 스피너 추가해줘"
```

### 중급자용
```
"나라똔튜브 admin 페이지 컴포넌트 분리해줘"
```

### 고급자용
```
"나라똔튜브 전체 아키텍처를 마이크로서비스로 리팩토링해줘"
```

---

## 📚 더 알아보기

- **전체 가이드**: `.claude/THREE-AGENT-SYSTEM.md`
- **역할 정의**: `.claude/ROLES-AND-RULES.md`
- **MCP 통합**: `.claude/MCP-SOLUTION.md`
- **프로젝트 규칙**: `CLAUDE.md`

---

**Happy Coding! 🚀**

*최종 업데이트: 2025-10-06*
