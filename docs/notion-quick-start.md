# Notion 일일 업무일지 - 빠른 시작 가이드

## 5분 만에 시작하기

### 1단계: 환경변수 설정 (2분)

`.env.local` 파일에 추가:
```bash
NOTION_API_KEY=secret_your_api_key_here
NOTION_DAILY_LOG_DB=your_database_id_here
```

**어디서 가져오나요?**
- API Key: https://www.notion.so/my-integrations → New integration
- DB ID: Notion 데이터베이스 URL에서 복사

자세한 설정: `docs/notion-daily-log-setup.md` 참고

---

### 2단계: Git Hooks 설치 (1분)

```bash
node scripts/install-git-hooks.js
```

이제 자동으로:
- `git commit` → Notion에 로그 추가
- `git push` → Obsidian 동기화

---

### 3단계: 테스트 (1분)

```bash
# 테스트 로그 추가
node scripts/notion-daily-log.js test

# Notion에서 확인
# → 오늘 날짜 페이지에 로그가 추가되어 있어야 함
```

---

## 일상 사용법

### 자동 (권장)
```bash
# 평소대로 커밋만 하면 됨
git add .
git commit -m "feat(design): Design Guardian 구현"
git push

# → Notion에 자동으로 기록됨 ✅
```

### 수동
```bash
# 커밋 없이 작업 기록
node scripts/notion-daily-log.js add 나라똔 feat Header "색상 변경"

# 디자인 작업 기록
node scripts/notion-daily-log.js design Button color "네온 그린 적용"
```

---

## Notion에서 보는 방법

### 타임라인 뷰 (시간순 정렬)
```
• [14:30:25] [나라똔] feat(design-guardian): Design Guardian Skill 구현 완료
• [15:45:10] [디자인] style(Button): SVG 아이콘 적용
• [16:20:33] [나라똔] fix(Header): 색상 개수 3개로 축소
```

### 프로젝트별 필터
- 나라똔만 보기
- 디자인만 보기
- Claude만 보기

### 캘린더 뷰
- 월별 작업 현황
- 일별 작업량 확인

---

## 문제 해결

### "NOTION_API_KEY 환경변수가 설정되지 않았습니다"
→ `.env.local` 파일 확인

### "Could not find database"
→ Integration이 데이터베이스에 연결되었는지 확인

### 더 자세한 도움말
→ `docs/notion-daily-log-setup.md` 참고

---

## 토큰 사용량

**하루 10개 작업 기준**: 약 500-2000 토큰 (매우 경제적)

- 최소 로그: ~50 토큰
- 상세 로그: ~200 토큰

---

## Obsidian과 비교

| 기능 | Obsidian | Notion |
|------|----------|--------|
| 시간순 정렬 | ❌ 약함 | ✅ 강력 |
| 상세 문서 | ✅ 강력 | ⚠️ 보통 |
| 협업 | ❌ 어려움 | ✅ 쉬움 |
| 검색 | ✅ 빠름 | ⚠️ 느림 |

**결론**: 둘 다 사용하세요!
- Obsidian: 상세 기록
- Notion: 시간순 요약

---

**더 자세한 내용**: `docs/notion-daily-log-setup.md`
