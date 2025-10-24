# Notion 일일 업무일지 설정 가이드

## 개요
시간순으로 정렬된 커밋 메시지 형태의 작업 내역을 Notion에 자동 기록합니다.

---

## 1. Notion 데이터베이스 생성

### 데이터베이스 구조
Notion에서 새 데이터베이스를 다음과 같이 생성하세요:

**데이터베이스 이름**: `업무일지`

**속성 (Properties)**:
| 속성명 | 타입 | 설명 |
|--------|------|------|
| 제목 | Title | YYYY-MM-DD 업무일지 |
| 날짜 | Date | 작업 날짜 |
| 프로젝트 | Multi-select | 나라똔, 디자인, Claude 등 |
| 태그 | Multi-select | feat, fix, docs, style 등 |

### 뷰 설정
1. **타임라인 뷰**: 날짜별로 시간순 정렬
2. **테이블 뷰**: 프로젝트별 필터링
3. **캘린더 뷰**: 월별 작업 현황

---

## 2. 환경변수 설정

`.env.local` 파일에 다음을 추가하세요:

```bash
# Notion API Key
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Notion 데이터베이스 ID (일일 업무일지)
NOTION_DAILY_LOG_DB=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### API Key 발급 방법
1. https://www.notion.so/my-integrations 접속
2. `+ New integration` 클릭
3. 이름: `Homepage Daily Log`
4. Associated workspace: 본인 워크스페이스 선택
5. Capabilities:
   - ✅ Read content
   - ✅ Insert content
   - ✅ Update content
6. `Submit` 클릭
7. `Internal Integration Token` 복사 → `NOTION_API_KEY`에 붙여넣기

### 데이터베이스 ID 확인 방법
1. Notion에서 `업무일지` 데이터베이스 열기
2. 우측 상단 `...` → `Copy link to view` 클릭
3. URL 형식: `https://www.notion.so/{workspace}/{database_id}?v={view_id}`
4. `{database_id}` 부분 복사 (32자리 문자열)
5. `.env.local`의 `NOTION_DAILY_LOG_DB`에 붙여넣기

### 데이터베이스 연결
1. Notion 데이터베이스 페이지 열기
2. 우측 상단 `...` → `Connections` 클릭
3. 위에서 만든 Integration (`Homepage Daily Log`) 선택
4. `Confirm` 클릭

---

## 3. 사용 방법

### 수동 로그 추가
```bash
# 기본 형식
node scripts/notion-daily-log.js add [프로젝트] [타입] [범위] [메시지]

# 예시
node scripts/notion-daily-log.js add 나라똔 feat Header "색상 변경"
node scripts/notion-daily-log.js add 디자인 style Button "SVG 아이콘 적용"
node scripts/notion-daily-log.js add Claude docs skill "Design Guardian 문서 작성"
```

### Git 커밋 기반 로그
```bash
# Git 커밋 메시지로 자동 로그
node scripts/notion-daily-log.js git 나라똔 "feat(design): Design Guardian 구현"
node scripts/notion-daily-log.js git 디자인 "style(Button): 네온 그린으로 변경"
```

### Design Guardian 작업 로그
```bash
# 디자인 작업 전용
node scripts/notion-daily-log.js design Button color "네온 그린으로 변경"
node scripts/notion-daily-log.js design Header layout "레이아웃 개선"
```

### 테스트
```bash
# 테스트 로그 추가
node scripts/notion-daily-log.js test
```

---

## 4. 자동화 설정

### Git Hook 통합
`.git/hooks/post-commit` 파일 생성:

```bash
#!/bin/sh
# Git 커밋 후 자동으로 Notion에 로그 추가

COMMIT_MSG=$(git log -1 --pretty=%B)
PROJECT="나라똔"  # 프로젝트명 설정

node scripts/notion-daily-log.js git "$PROJECT" "$COMMIT_MSG"
```

권한 설정:
```bash
chmod +x .git/hooks/post-commit
```

### Design Guardian 통합
`.claude/skills/design-guardian/skill.md`에 추가:

```javascript
// 디자인 변경 후 자동 로그
async function afterDesignChange(component, changeType, description) {
  // Obsidian 기록
  const obsidianLink = await saveToObsidian(component, changeType, description);

  // Notion 로그
  await exec(`node scripts/notion-daily-log.js design "${component}" "${changeType}" "${description}"`);
}
```

---

## 5. 로그 형식

### Notion 페이지 예시

```
# 2025-10-20 업무일지

## 작업 내역

• [14:30:25] [나라똔] feat(design-guardian): Design Guardian Skill 구현 완료
  • 파일: `scripts/check-design-patterns.js`, `.claude/skills/design-guardian/`
  • AI 패턴 감지 및 Obsidian 자동 기록 시스템
  • Obsidian: Projects/디자인/00-가이드라인/README.md

• [15:45:10] [디자인] style(Button): SVG 아이콘 적용
  • 변경 타입: icon-change

• [16:20:33] [나라똔] fix(Header): 색상 개수 3개로 축소
  • 파일: `src/components/Header.tsx`
  • 무지개 그라디언트 제거, 네온 그린 2색으로 변경
```

### 커밋 메시지 타입
| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새 기능 | feat(auth): 로그인 기능 추가 |
| `fix` | 버그 수정 | fix(api): 중복 요청 문제 해결 |
| `docs` | 문서 | docs(readme): 설치 가이드 추가 |
| `style` | 디자인/스타일 | style(button): 색상 변경 |
| `refactor` | 리팩토링 | refactor(auth): 로직 개선 |
| `test` | 테스트 | test(api): 단위 테스트 추가 |
| `chore` | 기타 | chore(deps): 패키지 업데이트 |
| `perf` | 성능 | perf(query): 쿼리 최적화 |

---

## 6. 컨텍스트 정보

### 자동으로 포함되는 정보
- **시간**: `[HH:MM:SS]` 형식
- **프로젝트**: `[나라똔]`, `[디자인]` 등
- **커밋 메시지**: `feat(scope): message` 형식
- **파일 목록**: 변경된 파일들 (선택)
- **Obsidian 링크**: 관련 문서 링크 (선택)
- **상세 설명**: 추가 설명 (선택)

### 토큰 사용량 (예상)
- **최소 로그** (시간+프로젝트+메시지): ~50 토큰
- **컨텍스트 포함** (파일+설명+링크): ~200 토큰
- **하루 10개 작업 기준**: ~500-2000 토큰

---

## 7. Obsidian과 차이점

| 항목 | Obsidian | Notion |
|------|----------|--------|
| **강점** | 양방향 링크, 로컬 파일, 상세 문서 | 시간순 정렬, 협업, 뷰 다양성 |
| **약점** | 시간순 타임라인 부족 | 검색 속도, 오프라인 |
| **용도** | 상세 기록, 트러블슈팅 | 일일 요약, 진행 현황 |

### 권장 사용법
1. **Obsidian**: 상세 문서, 트러블슈팅, 가이드라인
2. **Notion**: 시간순 작업 내역, 일일 요약, 전체 진행 현황

---

## 8. 트러블슈팅

### NOTION_API_KEY 오류
```bash
❌ NOTION_API_KEY 환경변수가 설정되지 않았습니다.
```

**해결**:
1. `.env.local` 파일 확인
2. `NOTION_API_KEY=secret_...` 형식 확인
3. 따옴표 없이 입력

### 데이터베이스 연결 실패
```bash
❌ Could not find database
```

**해결**:
1. Integration이 데이터베이스에 연결되었는지 확인
2. `NOTION_DAILY_LOG_DB` ID가 정확한지 확인
3. Integration 권한 확인 (Read, Insert, Update)

### 한글 깨짐
```bash
❌ 한글이 깨져서 표시됨
```

**해결**:
- Node.js 18 이상 사용
- `UTF-8` 인코딩 확인

---

## 9. 예시 워크플로우

### 아침
```bash
# 오늘 할 일 계획 추가
node scripts/notion-daily-log.js add 나라똔 chore planning "오늘 작업 계획"
```

### 작업 중
```bash
# 기능 개발
git commit -m "feat(design): Design Guardian 구현"
# → Git hook이 자동으로 Notion에 기록

# 디자인 변경
node scripts/notion-daily-log.js design Button color "네온 그린 적용"
# → Obsidian + Notion 모두 기록
```

### 저녁
```bash
# Notion 타임라인 뷰에서 오늘 작업 확인
# Obsidian에서 상세 문서 확인
```

---

## 10. 향후 개선 사항

- [ ] Slack 알림 통합
- [ ] 주간/월간 리포트 자동 생성
- [ ] GitHub Actions 통합
- [ ] AI 요약 기능 (GPT로 일일 요약)

---

**버전**: 1.0.0
**작성일**: 2025-10-20
**문의**: Issues 탭
