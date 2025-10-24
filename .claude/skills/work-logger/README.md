# Work Logger Skill

## 개요
**Obsidian → Notion 자동 연동 시스템**

Obsidian에 작업 내용을 저장하면 자동으로 Notion 일일 업무일지에 타임라인 추가

## 워크플로우

```
1. Obsidian에 문서 작성/저장
   ↓
2. File Watcher가 변경 감지
   ↓
3. 파일 메타데이터 파싱
   ↓
4. Notion에 자동 기록
   ↓
5. 페이지 요약 업데이트
```

## 설치

### 1. 필수 패키지 설치
```bash
npm install chokidar
npm install @notionhq/client  # 이미 설치됨
```

### 2. 환경변수 설정
`.env.local`에 이미 설정됨:
```bash
NOTION_API_KEY=ntn_xxxxx
NOTION_DAILY_LOG_DB=292d286a32098071870dd03585d03db9
```

### 3. Watcher 실행
```bash
node .claude/skills/work-logger/obsidian-watcher.js
```

백그라운드 실행 (Windows):
```powershell
Start-Process node -ArgumentList ".claude/skills/work-logger/obsidian-watcher.js" -WindowStyle Hidden
```

## 사용법

### Obsidian 문서 작성

파일 위치: `F:/obsidian/Pola/Projects/[프로젝트]/01-변경기록/2025-10-20-작업명.md`

템플릿:
```markdown
---
날짜: 2025-10-20
프로젝트: 나라똔
타입: feat
범위: Header
---

# 네온 그린 색상 적용

## 작업 내용
Header 컴포넌트에 네온 그린 색상 적용
- 기존 파란색 → 네온 그린 (#00ff00)
- hover 효과 추가

## 변경된 파일
- `src/components/Header.tsx`
- `src/styles/header.css`

## 관련 링크
- [디자인 가이드](obsidian://...)
```

### 저장하면 자동으로

**Notion 일일 업무일지**에 추가됨:
```
• [14:30:25] [나라똔] feat(Header): 네온 그린 색상 적용
```

## 프로젝트 구조

```
F:/obsidian/Pola/Projects/
├── 나라똔/
│   ├── 00-가이드라인/
│   ├── 01-변경기록/    ← 여기에 저장
│   ├── 02-트러블슈팅/  ← 버그 수정은 여기
│   └── 03-검토기록/
├── 디자인/
│   └── ... (동일 구조)
└── Claude/
    └── ... (동일 구조)
```

## 타입별 폴더 매핑

- `feat`, `docs`, `style`, `refactor` → `01-변경기록/`
- `fix` → `02-트러블슈팅/`
- `test` → `03-검토기록/`

## Notion 결과

### 테이블 뷰
| 업무일시 | 프로젝트명 | 진행내용 |
|---------|----------|---------|
| 2025-10-20 업무일지 📝 | 나라똔, 디자인, Claude | 5개 작업: feat(3), fix(1), docs(1) |

### 페이지 내부
```
📋 2025-10-20 작업 내역

• [14:30:25] [나라똔] feat(Header): 네온 그린 색상 적용
• [15:20:10] [디자인] fix(Button): SVG 아이콘 깨짐 수정
• [16:45:33] [Claude] docs(README): Skill 사용법 추가
```

## 수동 기록

Watcher 없이 수동으로 기록:

```bash
# Notion만 기록
node scripts/notion-daily-log.js add 나라똔 feat Header "색상 변경"

# Obsidian + Notion 동시 기록
node .claude/skills/work-logger/auto-logger.js 나라똔 feat Header "색상 변경"
```

## 트러블슈팅

### Watcher가 감지 안 함
- Obsidian 파일이 올바른 경로에 있는지 확인
- YAML Front Matter 형식이 올바른지 확인
- `.md` 확장자인지 확인

### Notion 기록 실패
- 환경변수 확인: `NOTION_API_KEY`, `NOTION_DAILY_LOG_DB`
- Integration이 데이터베이스에 연결되었는지 확인

### chokidar 에러
```bash
npm install chokidar
```

## 파일

- `skill.md` - Skill 설명
- `auto-logger.js` - Notion 자동 기록 로직
- `obsidian-watcher.js` - Obsidian 파일 감시
- `README.md` - 사용 가이드 (이 파일)

## 관련 스크립트

- `scripts/notion-daily-log.js` - Notion API 핵심 로직
- `scripts/log-today-work.js` - 세션 작업 일괄 기록
- `scripts/update-summary.js` - 페이지 요약 업데이트

## 다음 단계

1. **Watcher 자동 시작**: Windows 시작 프로그램에 등록
2. **Git Hooks 통합**: 커밋 시 자동 기록
3. **AI 요약**: OpenAI로 작업 내용 자동 요약
