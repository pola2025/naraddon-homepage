# Work Logger Skill

## Purpose
모든 주요 작업을 자동으로 기록하는 시스템
- **Obsidian**: 상세 문서 (변경 사항, 트러블슈팅, 검토)
- **Notion**: 일일 타임라인 (시간순 요약)

## When to Use
**IMPORTANT: Claude는 다음 상황에서 자동으로 이 Skill을 사용해야 합니다:**

1. 기능 구현 완료 후
2. 버그 수정 완료 후
3. 디자인 변경 완료 후
4. 문서 작성 완료 후
5. 테스트 완료 후

**자동 실행 조건:**
- 사용자가 명시적으로 요청하지 않아도
- 의미 있는 작업이 완료되면
- 자동으로 기록

## How It Works

### 1. 작업 분석
완료된 작업의 내용을 분석:
- 프로젝트명 (나라똔, 디자인, Claude 등)
- 타입 (feat, fix, docs, style, refactor, test 등)
- 범위 (컴포넌트명, 파일명 등)
- 변경 내용 요약

### 2. Obsidian 기록
프로젝트별 Obsidian 폴더에 상세 기록:
- **나라똔**: `F:/obsidian/Pola/Projects/나라똔/`
- **디자인**: `F:/obsidian/Pola/Projects/디자인/`
- **Claude**: `F:/obsidian/Pola/Projects/Claude/`

기록 내용:
- 변경 기록 (`01-변경기록/`)
- 트러블슈팅 (`02-트러블슈팅/`)
- 검토 기록 (`03-검토기록/`)

### 3. Notion 타임라인 기록
동시에 Notion 일일 업무일지에 요약 추가:
```
• [HH:MM:SS] [프로젝트] type(scope): 작업 내용
```

## Commands

### 수동 기록
```bash
# Notion에만 기록
node scripts/notion-daily-log.js add [프로젝트] [타입] [범위] [메시지]

# 예시
node scripts/notion-daily-log.js add 나라똔 feat Header "색상 변경"
```

### 자동 기록 (Claude가 수행)
작업 완료 시 Claude가 **자동으로 다음 명령 실행**:

```javascript
// Claude가 내부적으로 실행하는 코드
const { autoLog } = require('./.claude/skills/work-logger/claude-auto-log');

await autoLog({
  project: '나라똔',  // 또는 '디자인', 'Claude'
  type: 'feat',      // feat/fix/docs/style/refactor/test
  scope: 'Header',   // 컴포넌트/기능명
  message: '네온 그린 색상 적용',  // 한 줄 요약
  description: '상세 설명...',    // 상세 내용
  files: ['src/components/Header.tsx']  // 변경된 파일
});
```

**결과:**
1. Obsidian 문서 자동 생성
2. Notion 타임라인 자동 추가
3. 페이지 요약 자동 업데이트

**사용자 경험:**
- 사용자는 아무것도 안 해도 됨
- Claude가 작업 완료 메시지와 함께 자동 기록
- "✅ 작업이 Obsidian과 Notion에 기록되었습니다" 메시지 표시

## 기록 형식

### Conventional Commits
- **feat**: 새 기능
- **fix**: 버그 수정
- **docs**: 문서 작성/수정
- **style**: 디자인/스타일 변경
- **refactor**: 리팩토링
- **test**: 테스트 추가/수정
- **chore**: 기타 작업

### 예시
```
feat(Header): 네온 그린 색상 적용
fix(auth): JWT 콜백 role undefined 해결
docs(README): 설치 가이드 추가
style(Button): SVG 아이콘으로 교체
```

## Integration

### Git Hooks (옵션)
자동 기록을 위한 Git Hooks:
```bash
# 설치
node scripts/install-git-hooks.js

# 커밋 시 자동 기록
git commit -m "feat(Header): 색상 변경"
# → Notion에 자동 기록됨
```

### Claude 자동 기록
Claude가 작업 완료 후 자동으로:
1. 변경된 파일 확인
2. 작업 내용 요약
3. Obsidian + Notion 동시 기록

## Files
- `scripts/notion-daily-log.js` - Notion 로깅 핵심
- `scripts/log-today-work.js` - 일괄 기록 (세션 종료 시)
- `scripts/update-summary.js` - 페이지 요약 업데이트
- `scripts/clean-notion-pages.js` - 페이지 정리
- `.claude/obsidian-config.json` - Obsidian 프로젝트 설정

## Environment Variables
```bash
NOTION_API_KEY=ntn_xxxxx
NOTION_DAILY_LOG_DB=292d286a32098071870dd03585d03db9
```

## Obsidian Projects
```json
{
  "naraddon": {
    "name": "나라똔",
    "path": "Projects/나라똔"
  },
  "design": {
    "name": "디자인",
    "path": "Projects/디자인"
  },
  "claude": {
    "name": "Claude",
    "path": "Projects/Claude"
  }
}
```
