# 옵시디언 필수 플러그인 가이드 (Claude 자동화 최적화)

## 🎯 우리 시스템에 필수적인 플러그인

### 1. ⭐ Dataview (필수 중의 필수)
**설치 우선순위: 1위**

#### 기능
- SQL 같은 쿼리로 노트 검색/집계
- 동적 문서 목록 자동 생성
- 메타데이터 기반 분석

#### 우리 시스템 활용
```dataview
# 최근 7일 완료된 트러블슈팅
TABLE 날짜, 발생기능, 에러타입, 소요시간
FROM "Projects/나라똔/05-트러블슈팅"
WHERE 해결여부 = "해결완료" AND 날짜 >= date(today) - dur(7d)
SORT 날짜 DESC

# JWT 인증 관련 모든 문서
LIST
FROM #기능/관리자/인증/JWT
SORT file.mtime DESC

# bases 활용: RBAC 아키텍처에 의존하는 모든 작업
TABLE 날짜, 카테고리, 상태
FROM [[RBAC아키텍처]].bases
SORT 날짜 DESC
```

#### 설치 방법
```
Settings → Community plugins → Browse → "Dataview" 검색 → Install → Enable
```

#### 설정 권장사항
```
Settings → Dataview
✅ Enable JavaScript Queries
✅ Enable Inline Queries
✅ Enable Dataview JS
```

---

### 2. ⭐ Templater (자동화 핵심)
**설치 우선순위: 2위**

#### 기능
- 템플릿 자동 적용
- 동적 변수 (날짜, 시간, 파일명 등)
- 스크립트 실행 가능

#### 우리 시스템 활용
```markdown
# 트러블슈팅 템플릿
---
title: <% tp.file.title %>
날짜: <% tp.date.now("YYYY-MM-DD") %>
프로젝트: 나라똔
카테고리: 트러블슈팅
발생기능: <% tp.system.prompt("발생 기능?") %>
에러타입: <% tp.system.prompt("에러 타입?") %>
---

#나라똔 #트러블슈팅

# <% tp.file.title %>

## 📋 문제 요약
발생일시:: <% tp.date.now("YYYY-MM-DD HH:mm") %>

## 🔍 상세 상황
<% tp.file.cursor() %>
```

#### Claude와 연동
```javascript
// Templater 스크립트: .claude/templates/troubleshooting.js
async function generateTroubleshootingDoc() {
  // Claude API 호출하여 메타데이터 자동 생성
  const metadata = await callClaudeAPI({
    prompt: "현재 대화에서 트러블슈팅 메타데이터 추출",
  });

  return metadata;
}
```

---

### 3. ⭐ Advanced Tables (테이블 자동 정렬)
**설치 우선순위: 3위**

#### 기능
- Markdown 테이블 자동 포맷팅
- 열 정렬, 계산식
- Excel 같은 UX

#### 우리 시스템 활용
```markdown
| 날짜 | 기능 | 에러 | 소요시간 | 상태 |
| ---- | ---- | ---- | -------- | ---- |
| 2025-10-19 | 관리자인증 | 403 | 2h15m | 완료 |
| 2025-10-18 | 이미지업로드 | CORS | 1h30m | 완료 |

<!-- Ctrl+Shift+D: 자동 정렬 -->
<!-- Ctrl+Shift+;: 열 추가 -->
```

---

### 4. ⭐ Calendar (타임라인 시각화)
**설치 우선순위: 4위**

#### 기능
- 캘린더 뷰에서 노트 확인
- 날짜별 작업 시각화
- 클릭으로 노트 생성

#### 우리 시스템 활용
```
2025-10
  19 ● ● (트러블슈팅 2건)
  18 ●   (기능개발 1건)
  17
  16 ● ● ● (기능개발 3건)
```

클릭하면 해당 날짜 문서 자동 생성:
- `2025-10-19-작업내용.md`
- YAML Front Matter 자동 포함

---

### 5. ⭐ Tag Wrangler (태그 관리)
**설치 우선순위: 5위**

#### 기능
- 태그 일괄 변경
- 태그 계층 구조 관리
- 태그 병합/분리

#### 우리 시스템 활용
```
# 태그 계층 구조 자동 관리
프로젝트/
  ├─ 나라똔/
  │   ├─ 정책뉴스
  │   ├─ 심사관관리
  │   └─ 사용자관리
  └─ 집첵/

기능/
  ├─ 관리자/
  │   ├─ 인증/
  │   │   ├─ JWT
  │   │   └─ OAuth
  │   └─ 권한
  └─ 정책뉴스/

작업유형/
  ├─ 트러블슈팅/
  │   ├─ 버그픽스
  │   └─ 성능개선
  └─ 신규기능
```

**태그 리네임 (일괄 변경):**
- 우클릭 → "Rename tag" → 모든 문서 자동 업데이트

---

### 6. ⭐ Obsidian Git (버전 관리)
**설치 우선순위: 6위**

#### 기능
- Obsidian 볼트를 Git 저장소로 관리
- 자동 커밋/푸시
- 변경 이력 추적

#### 우리 시스템 활용
```
Settings → Obsidian Git
✅ Vault backup interval (minutes): 30
✅ Auto pull interval (minutes): 10
✅ Commit message: "vault backup: {{date}}"
✅ Auto backup after file change
```

**이점:**
- 모든 문서 변경 이력 보존
- 여러 기기 동기화
- Claude가 생성한 문서도 자동 백업

---

### 7. 🌟 Dataview + JS (고급 쿼리)
**설치 우선순위: 7위**

#### 기능
- JavaScript로 복잡한 쿼리 작성
- 커스텀 집계/계산

#### 우리 시스템 활용
```js
// 월별 트러블슈팅 통계
```dataviewjs
const pages = dv.pages('"Projects/나라똔/05-트러블슈팅"')
  .where(p => p.해결여부 === "해결완료");

const stats = pages.groupBy(p => p.날짜.toString().slice(0, 7));

dv.table(
  ["월", "건수", "평균 소요시간", "심각도 High"],
  stats.map(g => [
    g.key,
    g.rows.length,
    calculateAverage(g.rows.소요시간),
    g.rows.filter(r => r.심각도 === "High").length,
  ])
);
\`\`\`

**결과:**
| 월 | 건수 | 평균 소요시간 | 심각도 High |
|----|------|--------------|-------------|
| 2025-10 | 8 | 2h30m | 3 |
| 2025-09 | 12 | 3h15m | 5 |
```

---

### 8. 🌟 Local REST API (Claude 연동)
**설치 우선순위: 8위**

#### 기능
- HTTP API로 Obsidian 제어
- 노트 생성/수정/삭제
- 메타데이터 조회

#### 우리 시스템 활용
```javascript
// .claude/obsidian-config.json에서 사용 중
{
  "api": {
    "host": "http://127.0.0.1:27123",
    "token": "your-token-here"
  }
}

// Claude가 API 호출로 문서 자동 생성
await fetch('http://127.0.0.1:27123/vault/Projects/나라똔/05-트러블슈팅/new-doc.md', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: '# 트러블슈팅 문서\n\n...',
  }),
});
```

---

### 9. 🌟 Tasks (작업 관리)
**설치 우선순위: 9위**

#### 기능
- 체크리스트 자동 집계
- 기한, 우선순위 관리
- 작업 쿼리

#### 우리 시스템 활용
```markdown
# 문서 내 작업
- [ ] E2E 테스트 추가 📅 2025-10-20 ⏫
- [ ] 주석 보완 📅 2025-10-21
- [x] Obsidian 문서 생성 ✅ 2025-10-19

# Tasks 쿼리로 모든 작업 집계
\`\`\`tasks
not done
path includes Projects/나라똔
sort by priority
\`\`\`

**결과:**
- [ ] E2E 테스트 추가 (관리자인증-403에러.md) ⏫ 📅 2025-10-20
- [ ] 이미지 리사이징 (이미지업로드-UX개선.md) 📅 2025-10-21
```

---

### 10. 🌟 Kanban (프로젝트 보드)
**설치 우선순위: 10위**

#### 기능
- 칸반 보드 뷰
- 드래그 앤 드롭
- 상태 관리

#### 우리 시스템 활용
```markdown
# 나라똔 프로젝트 보드

## 🔴 진행중
- [[JWT인증-개선]]
- [[이미지업로드-최적화]]

## 🟡 대기중
- [[관리자세션-캐싱]]
- [[OAuth테스트-자동화]]

## 🟢 완료
- [[JWT인증-403에러]]
- [[심사관이미지-UX개선]]
```

---

## 📊 플러그인 설치 우선순위

### 필수 (지금 당장 설치)
1. **Dataview** - 메타데이터 쿼리 핵심
2. **Templater** - 자동 문서 생성
3. **Local REST API** - Claude 연동

### 강력 권장 (1주일 내)
4. **Advanced Tables** - 테이블 편집
5. **Calendar** - 타임라인 시각화
6. **Tag Wrangler** - 태그 관리
7. **Obsidian Git** - 버전 관리

### 옵션 (필요시)
8. **Tasks** - 작업 관리
9. **Kanban** - 프로젝트 보드
10. **Excalidraw** - 다이어그램 (아키텍처 설계)

---

## 🚀 설치 후 설정 체크리스트

### 1단계: Dataview 설정
- [ ] Enable JavaScript Queries ✅
- [ ] Enable Inline Queries ✅
- [ ] `.obsidian/plugins/dataview` 폴더 확인

### 2단계: Templater 설정
- [ ] Template folder: `.claude/templates`
- [ ] Trigger on new file creation ✅
- [ ] Enable System Commands ✅

### 3단계: Local REST API 설정
- [ ] Enable HTTPS: ❌ (로컬 사용)
- [ ] API Key 생성
- [ ] `.claude/obsidian-config.json`에 토큰 저장

### 4단계: Obsidian Git 설정 (선택)
- [ ] Git 저장소 초기화
- [ ] Auto backup: 30분 간격
- [ ] `.gitignore` 설정:
  ```
  .obsidian/workspace.json
  .obsidian/cache
  .trash/
  ```

### 5단계: Tag Wrangler 설정
- [ ] Show tag counts ✅
- [ ] Show nested tags ✅
- [ ] Tag hierarchy: `/` (슬래시)

---

## 💡 플러그인 조합 시너지

### 조합 1: Dataview + Templater
```markdown
<!-- 템플릿에서 Dataview 쿼리 자동 삽입 -->
## 🔗 관련 문서

\`\`\`dataview
LIST
FROM [[<% tp.file.title %>]].bases
SORT file.mtime DESC
LIMIT 5
\`\`\`
```

### 조합 2: Calendar + Templater
```markdown
<!-- 날짜 클릭 시 자동으로 Daily Note 생성 -->
---
날짜: <% tp.date.now("YYYY-MM-DD") %>
요일: <% tp.date.now("dddd") %>
---

# <% tp.date.now("YYYY년 MM월 DD일") %> 작업 일지

## 완료한 작업
\`\`\`dataview
LIST
FROM "Projects/나라똔"
WHERE 날짜 = date(<% tp.date.now("YYYY-MM-DD") %>)
\`\`\`
```

### 조합 3: Tasks + Dataview
```markdown
<!-- 모든 프로젝트의 미완료 작업 자동 집계 -->
\`\`\`dataviewjs
const tasks = dv.pages()
  .file.tasks
  .where(t => !t.completed && t.tags.includes("#나라똔"));

dv.taskList(tasks, false);
\`\`\`
```

---

## 🔧 트러블슈팅

### Q1: Dataview 쿼리가 작동하지 않아요
```markdown
❌ FROM Projects/나라똔  (잘못됨)
✅ FROM "Projects/나라똔" (따옴표 필수)

❌ WHERE 상태 = 완료    (잘못됨)
✅ WHERE 상태 = "완료"  (문자열은 따옴표)
```

### Q2: Local REST API가 연결되지 않아요
```bash
# 1. 포트 확인
netstat -ano | findstr :27123

# 2. Obsidian 재시작
# 3. 플러그인 비활성화 → 활성화

# 4. 토큰 재생성
Settings → Local REST API → Generate new API key
```

### Q3: Templater 템플릿이 적용되지 않아요
```
Settings → Templater
✅ Template folder location: .claude/templates
✅ Trigger Templater on new file creation
✅ Enable Folder Templates (폴더별 템플릿 자동 적용)

폴더 템플릿 설정:
Projects/나라똔/05-트러블슈팅/ → troubleshooting-template.md
Projects/나라똔/03-기능개발/ → feature-template.md
```

---

## 📚 학습 리소스

### Dataview
- 공식 문서: https://blacksmithgu.github.io/obsidian-dataview/
- 쿼리 예시: https://github.com/s-blu/obsidian_dataview_example_vault

### Templater
- 공식 문서: https://silentvoid13.github.io/Templater/
- 템플릿 예시: https://github.com/SilentVoid13/Templater/discussions

### Local REST API
- GitHub: https://github.com/coddingtonbear/obsidian-local-rest-api
- API 문서: http://127.0.0.1:27123/

---

## ✅ 설치 완료 확인

모든 플러그인 설치 후 이 쿼리가 작동하면 성공:

\`\`\`dataview
TABLE
  file.folder as "폴더",
  length(file.outlinks) as "링크 수",
  length(file.tags) as "태그 수"
FROM "Projects/나라똔"
LIMIT 5
\`\`\`

**결과 예시:**
| File | 폴더 | 링크 수 | 태그 수 |
|------|------|---------|---------|
| JWT인증-403에러 | 05-트러블슈팅 | 6 | 13 |
| 이미지업로드-UX개선 | 03-기능개발 | 3 | 8 |

---

**이 플러그인들로 Obsidian이 Claude의 완벽한 슈퍼메모리가 됩니다!**
**설치 순서대로 하나씩 적용하면서 익숙해지세요.**
