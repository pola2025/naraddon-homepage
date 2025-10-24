# Claude 작업 추적

이 디렉토리는 Claude가 수행한 모든 작업을 추적합니다.

## 📁 구조

```
claude/
├── README.md              # 이 파일
├── updates.md             # 작업 업데이트 로그 (시간순)
├── skills/                # Skill 시스템 문서
│   └── changelog.md       # Skill 변경 이력
└── sessions/              # 세션별 상세 기록
    └── YYYY-MM-DD-HH-MM.md
```

## 📝 파일 설명

### `updates.md`
- Claude의 모든 작업을 시간순으로 기록
- 커밋 전 자동 업데이트
- 간단한 한 줄 요약 형식

### `skills/changelog.md`
- Skill 시스템 변경 이력
- 새 Skill 추가
- 기존 Skill 개선
- 버그 수정

### `sessions/`
- 세션별 상세 작업 내용
- 파일 변경 목록
- 실행한 명령어
- 트러블슈팅 과정

## 🚀 사용 방법

### 작업 업데이트 추가
```bash
node scripts/claude-update.js "작업 내용 요약"
```

### 세션 기록 생성
```bash
node scripts/claude-session.js
```

## 📊 통계

업데이트는 자동으로 집계됩니다:
- 총 작업 수
- 카테고리별 분류
- 주간/월간 통계
