# Claude 슈퍼메모리 + 옵시디언 통합 기획

**카테고리**: Development - Documentation
**목적**: Claude의 모든 대화와 작업 내역을 옵시디언에 자동 저장하여 영구 기억 구현

## 🧠 핵심 개념

### 문제점
```markdown
# 현재 Claude의 한계
1. **세션 종료 시 기억 소멸**
   - 어제 고친 버그를 오늘 다시 물어봄
   - 이전에 결정한 아키텍처를 기억 못함
   - 트러블슈팅 해결 방법 재학습 필요

2. **컨텍스트 윈도우 제한**
   - 긴 대화 시 초반 내용 잊어버림
   - 프로젝트 전체 맥락 파악 어려움

3. **지식 누적 불가**
   - 매번 프로젝트 설명부터 시작
   - 팀 컨벤션, 결정 사항 반복 설명
```

### 해결책: 슈퍼메모리 + 옵시디언
```markdown
# 옵시디언 = Claude의 영구 메모리

┌─────────────────────────────────────┐
│   Claude (단기 기억)                │
│   - 현재 대화만 기억                │
└──────────────┬──────────────────────┘
               │ 자동 저장
               ↓
┌─────────────────────────────────────┐
│   Obsidian (장기 기억)              │
│   - 모든 대화 영구 저장             │
│   - 과거 결정사항 검색 가능         │
│   - 프로젝트 히스토리 완벽 추적     │
└─────────────────────────────────────┘
               ↑ 필요 시 읽기
┌─────────────────────────────────────┐
│   Claude (컨텍스트 로드)            │
│   "지난주에 RBAC 아키텍처 선택한    │
│    이유가 뭐였지?"                  │
│   → 옵시디언에서 검색하여 답변      │
└─────────────────────────────────────┘
```

## 📋 기능 설계

### 1. 자동 대화 저장

#### 대화 중 실시간 저장
```markdown
# 저장 시점
- 기능 구현 완료 시
- 트러블슈팅 해결 시
- 중요한 결정 사항 발생 시
- 세션 종료 시

# 저장 형식
Projects/나라똔/99-대화기록/2025-10-19-관리자Role-403오류-해결과정.md
```

#### 대화 문서 구조
```markdown
---
title: 관리자Role 403 오류 해결 대화
날짜: 2025-10-19
프로젝트: 나라똔
태그:
  - 나라똔
  - 대화기록
  - 인증
  - 트러블슈팅
  - 403에러
대화유형: 트러블슈팅
참여자: [사용자, Claude]
해결완료: true
---

# 대화 요약
사용자가 관리자 페이지에서 403 에러 발생. JWT 콜백에서 role을 조회하지 않는 것이 원인. DB에서 직접 role 조회하도록 수정하여 해결.

## 🔍 문제 발견
**사용자**: "관리자 페이지에서 403 Forbidden 에러가 나요"

**Claude**: 세션을 확인해보니 role이 undefined네요. lib/auth/authOptions.ts의 JWT 콜백을 확인해볼게요.

## 💡 원인 분석
**Claude**: JWT 콜백에서 user.role을 그대로 사용하고 있는데, Google OAuth 로그인 시 role 정보가 없습니다. DB에서 직접 조회가 필요합니다.

## 🛠️ 해결 과정
1. connectMongoDB() 추가
2. User.findOne()으로 role 조회
3. JWT 토큰에 role 포함

**변경 파일**: lib/auth/authOptions.ts:45-67

## ✅ 결과
403 에러 해결. 관리자 페이지 정상 접근 가능.

## 🔗 관련 문서
- [[2025-10-22-관리자Role-403오류-JWT콜백미조회]] (트러블슈팅 문서)
- [[2025-09-10-RBAC아키텍처]] (아키텍처 배경)
```

### 2. 컨텍스트 자동 로드

#### 세션 시작 시 자동 로드
```javascript
/**
 * Claude 시작 시 프로젝트 컨텍스트 자동 로드
 */
async function loadProjectContext(projectName) {
  const obsidian = new ObsidianDocManager();

  // 1. 프로젝트 기본 정보
  const overview = await obsidian.api.getFile(`Projects/${projectName}/README.md`);

  // 2. 최근 대화 기록 (최근 7일)
  const recentConversations = await obsidian.findRelatedDocs({
    project: projectName,
    category: '대화기록',
    since: '7d'
  });

  // 3. 미해결 트러블슈팅
  const openIssues = await obsidian.findRelatedDocs({
    project: projectName,
    tags: ['트러블슈팅', '진행중']
  });

  // 4. 최근 결정 사항
  const recentDecisions = await obsidian.findRelatedDocs({
    project: projectName,
    tags: ['결정사항'],
    since: '30d'
  });

  return {
    overview,
    recentConversations,
    openIssues,
    recentDecisions
  };
}
```

#### Claude에게 전달하는 컨텍스트
```markdown
# 프로젝트: 나라똔

## 📋 프로젝트 개요
- Next.js 14 기반 공공기관 정책 분석 플랫폼
- MongoDB Atlas + Cloudflare R2
- RBAC 권한 체계

## 💬 최근 대화 (7일 이내)
1. **2025-10-19**: 관리자 Role 403 에러 해결
   - JWT 콜백에서 DB role 조회 추가
   - [[2025-10-19-관리자Role-403오류-해결과정]]

2. **2025-10-18**: 심사관 이미지 업로드 UX 개선
   - 미리보기 기능 추가
   - [[2025-10-18-심사관이미지업로드-UX개선-대화]]

## 🐛 미해결 문제
- 없음 (모든 이슈 해결 완료)

## 📌 최근 결정 사항 (30일 이내)
1. **아키텍처**: RBAC 권한 체계 채택 (2025-09-10)
   - 이유: 세밀한 권한 제어 필요
   - [[2025-09-10-RBAC아키텍처]]

2. **보안**: 환경변수로 모든 Secret 관리 (2025-10-25)
   - .env.local 사용 강제
   - [[2025-10-25-환경변수보안정책]]
```

### 3. 지식 검색 & 재사용

#### 사용자 질문 시 자동 검색
```markdown
사용자: "JWT 인증 어떻게 구현했었지?"

Claude:
1️⃣ 옵시디언에서 검색 중...
   검색어: #나라똔 #인증 #JWT

2️⃣ 관련 문서 발견:
   - [[2025-09-15-JWT인증구현]]
   - [[2025-10-19-관리자Role-403오류-해결과정]]

3️⃣ 답변 생성:
   지난 9월 15일에 NextAuth + JWT로 구현했습니다.

   **주요 구현 사항**:
   - lib/auth/authOptions.ts에서 JWT 콜백 정의
   - callbacks.jwt에서 user.role 포함
   - MongoDB에서 role 직접 조회 (10월 19일 개선)

   상세 내용: [[2025-09-15-JWT인증구현]]
```

### 4. 결정 사항 추적

#### 중요 결정 자동 기록
```markdown
# 결정 사항 감지 패턴
- "~로 결정", "~를 선택", "~로 진행"
- "~하지 않기로 함", "~는 보류"
- "앞으로 ~로 통일"

# 자동 저장 예시
사용자: "카카오 로그인은 나중에 추가하고, 일단 네이버만 구현하자"

→ 옵시디언 자동 저장:
Projects/나라똔/98-결정사항/2025-10-19-소셜로그인-네이버우선구현.md

---
title: 소셜 로그인 - 네이버 우선 구현
날짜: 2025-10-19
프로젝트: 나라똔
태그:
  - 나라똔
  - 결정사항
  - 인증
  - 소셜로그인
결정자: 사용자
---

# 결정 내용
소셜 로그인은 네이버만 우선 구현. 카카오는 추후 추가.

## 배경
초기 출시 일정 준수를 위해 우선순위 조정

## 영향
- OAuth 프로바이더: 네이버만 활성화
- 카카오 로그인 버튼: "준비중" 모달 표시

## 관련 문서
- [[2025-09-15-소셜로그인구현]]
```

## 📊 옵시디언 폴더 구조

```
F:\obsidian\Projects\
└── 나라똔/
    ├── README.md                    # 프로젝트 개요
    ├── 00-기획/
    ├── 01-아키텍처/
    ├── 02-스키마/
    ├── 03-기능개발/
    ├── 04-보안/
    ├── 05-트러블슈팅/
    ├── 98-결정사항/                 # ✨ 새로 추가
    │   ├── 2025-09-10-RBAC채택.md
    │   └── 2025-10-19-소셜로그인-네이버우선.md
    ├── 99-대화기록/                 # ✨ 새로 추가
    │   ├── 2025-10-19-관리자Role-403오류-해결과정.md
    │   └── 2025-10-18-심사관이미지업로드-UX개선-대화.md
    └── MOC-나라똔.md                # ✨ Map of Content (전체 인덱스)
```

## 🤖 자동화 워크플로우

### Claude 세션 시작 시
```javascript
// 1. 프로젝트 감지
const project = detectCurrentProject(); // "나라똔"

// 2. 컨텍스트 로드
const context = await loadProjectContext(project);

// 3. Claude에게 주입
sendToClaudeContext(`
  현재 프로젝트: ${project}

  ## 최근 작업
  ${context.recentConversations}

  ## 미해결 문제
  ${context.openIssues}

  ## 기억해야 할 결정사항
  ${context.recentDecisions}
`);
```

### 대화 중 자동 저장
```javascript
// 중요 이벤트 감지 시 자동 저장
on('feature-implemented', async (data) => {
  await saveConversation({
    type: '기능개발',
    title: data.featureName,
    conversation: getCurrentConversation(),
    relatedFiles: data.files,
  });
});

on('bug-resolved', async (data) => {
  await saveConversation({
    type: '트러블슈팅',
    title: `${data.function}-${data.errorType}-${data.cause}`,
    conversation: getCurrentConversation(),
    resolved: true,
  });
});

on('decision-made', async (data) => {
  await saveDecision({
    title: data.title,
    content: data.content,
    reason: data.reason,
  });
});
```

### 세션 종료 시
```javascript
on('session-end', async () => {
  // 현재 대화 요약
  const summary = await summarizeConversation(getCurrentConversation());

  // 옵시디언에 저장
  await saveConversation({
    type: '일반대화',
    title: summary.title,
    summary: summary.content,
    tags: summary.tags,
  });

  console.log('✅ 대화 내용이 옵시디언에 저장되었습니다.');
  console.log('📂 다음 세션에서 자동으로 로드됩니다.');
});
```

## 🔍 검색 & 조회 시나리오

### 시나리오 1: "이전에 어떻게 했었지?"
```markdown
사용자: "지난번에 MongoDB 인덱스 어떻게 최적화했었어?"

Claude:
1. 옵시디언 검색: #나라똔 #데이터베이스 #인덱스
2. 관련 문서 발견: [[2025-10-15-MongoDB인덱스최적화]]
3. 답변:
   "10월 15일에 작업했습니다.
   - users 컬렉션: email 필드에 unique 인덱스
   - policy-news 컬렉션: createdAt 필드에 내림차순 인덱스

   성능 개선 결과:
   - 사용자 조회: 200ms → 5ms
   - 정책뉴스 목록: 500ms → 50ms

   상세: [[2025-10-15-MongoDB인덱스최적화]]"
```

### 시나리오 2: "왜 이렇게 했었지?"
```markdown
사용자: "RBAC를 왜 선택했었지?"

Claude:
1. 검색: #나라똔 #결정사항 #RBAC
2. 발견: [[2025-09-10-RBAC채택]]
3. 답변:
   "9월 10일 결정사항입니다.

   **선택 이유**:
   1. 관리자 권한이 다층적 (super, manager, viewer)
   2. 기능별 세밀한 권한 제어 필요
   3. 향후 확장성 (심사관, 정책 담당자 등)

   **대안 검토**:
   - 단순 role 기반: 확장성 부족으로 기각
   - ACL: 복잡도 높아 기각

   상세: [[2025-09-10-RBAC채택]]"
```

### 시나리오 3: "진행 상황 정리"
```markdown
사용자: "이번 주에 뭐 했었지?"

Claude:
1. 검색: #나라똔 날짜:2025-10-14~2025-10-19
2. 타임라인 생성:

**2025-10-14 (월)**
- [[2025-10-14-정책뉴스업로드API구현]]

**2025-10-16 (수)**
- [[2025-10-16-Cloudflare-R2연동]]

**2025-10-18 (금)**
- [[2025-10-18-심사관이미지업로드-UX개선]]

**2025-10-19 (토)**
- [[2025-10-19-관리자Role-403오류-해결]]

**완료된 기능**: 4개
**해결한 버그**: 1개
**추가된 테스트**: 8개
```

## 🎯 실전 예시: 풀 워크플로우

```markdown
### 1️⃣ 세션 시작
사용자: "claude code" 실행

Claude:
📂 프로젝트 감지: 나라똔
📖 옵시디언에서 컨텍스트 로드 중...

✅ 로드 완료:
- 최근 대화: 3건
- 미해결 문제: 0건
- 최근 결정사항: 2건

💬 무엇을 도와드릴까요?

---

### 2️⃣ 기능 구현
사용자: "정책뉴스 검색 기능 추가해줘"

Claude: [구현 진행...]

✅ 완료!
📝 옵시디언에 자동 저장 중...
   → Projects/나라똔/03-기능개발/2025-10-19-정책뉴스검색기능.md
   → Projects/나라똔/99-대화기록/2025-10-19-정책뉴스검색-구현과정.md

---

### 3️⃣ 다음 날 세션
사용자: "claude code" 실행 (다음 날)

Claude:
📂 프로젝트: 나라똔
📖 컨텍스트 로드 중...

💡 어제 작업 내역:
- 정책뉴스 검색 기능 구현 완료
- 관련 파일: app/api/policy-news/search/route.ts

💬 오늘은 무엇을 도와드릴까요?

사용자: "어제 구현한 검색 기능 테스트 코드 작성해줘"

Claude:
📖 어제 구현 내용 확인 중...
   [[2025-10-19-정책뉴스검색기능]] 문서 로드

✅ 구현 사항 파악:
- 제목/내용 전체 텍스트 검색
- 페이지네이션 지원
- 정렬 옵션

[테스트 코드 작성...]
```

## 📚 MOC (Map of Content) 구조

### MOC-나라똔.md (프로젝트 허브)
```markdown
---
title: 나라똔 프로젝트 - Map of Content
날짜: 2025-10-19
프로젝트: 나라똔
태그: [나라똔, MOC, 인덱스]
---

# 나라똔 프로젝트

## 📋 프로젝트 개요
- **설명**: 공공기관 정책 분석 플랫폼
- **기술 스택**: Next.js 14, MongoDB, Cloudflare R2
- **시작일**: 2025-09-01

## 🏗️ 핵심 아키텍처
- [[2025-09-10-시스템아키텍처]]
- [[2025-09-10-RBAC권한체계]]
- [[2025-09-05-데이터베이스설계]]

## 🔑 주요 기능
### 인증 & 권한
- [[2025-09-15-JWT인증구현]]
- [[2025-09-20-소셜로그인-네이버]]
- [[2025-10-19-관리자Role체계]]

### 관리자 기능
- [[2025-10-10-심사관관리]]
- [[2025-10-14-정책뉴스관리]]

## 🐛 주요 트러블슈팅
- [[2025-10-19-관리자Role-403오류-JWT콜백미조회]] ✅ 해결
- [[2025-10-16-이미지업로드-CORS문제]] ✅ 해결

## 📌 중요 결정사항
- [[2025-09-10-RBAC채택]]
- [[2025-10-25-환경변수보안정책]]
- [[2025-10-19-소셜로그인-네이버우선구현]]

## 💬 최근 대화
```dataview
LIST
FROM "Projects/나라똔/99-대화기록"
SORT 날짜 DESC
LIMIT 10
```

## 📊 프로젝트 통계
```dataview
TABLE 카테고리, count(rows) as "문서 수"
FROM "Projects/나라똔"
WHERE 카테고리
GROUP BY 카테고리
```
```

## 🚀 구현 로드맵

### Phase 1: 기본 자동 저장 (1주)
- [ ] 대화 자동 저장 스크립트
- [ ] 결정사항 자동 감지
- [ ] 옵시디언 폴더 구조 생성

### Phase 2: 컨텍스트 로드 (2주)
- [ ] 세션 시작 시 자동 로드
- [ ] 관련 문서 검색 엔진
- [ ] Claude 컨텍스트 주입

### Phase 3: 지능형 검색 (3주)
- [ ] 자연어 질문 → 문서 검색
- [ ] 유사 문서 추천
- [ ] 타임라인 자동 생성

### Phase 4: 고급 기능 (4주)
- [ ] 대화 요약 자동 생성
- [ ] 지식 그래프 시각화
- [ ] 중복 작업 자동 감지

---

**이 시스템으로 Claude는 영원히 기억합니다.**
**프로젝트 전체 히스토리가 한눈에 보입니다.**
