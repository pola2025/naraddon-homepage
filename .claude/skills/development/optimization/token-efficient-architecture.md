# 토큰 효율적 아키텍처 설계

**카테고리**: Development - Optimization
**목적**: 옵시디언 통합 시 토큰 소모 최소화 전략

## ⚠️ 문제점 분석

### 비효율적인 방식 (토큰 낭비)
```markdown
❌ 나쁜 예: 세션 시작 시 모든 문서 로드

Claude 시작 →토큰

 전체 프로젝트 문서 로드 (500개 문서)
→ 각 문서 평균 1000 토큰
→ **총 500,000 토큰 소모** (즉시 한계 초과!)

❌ 나쁜 예: 매번 전체 검색
사용자: "JWT 어떻게 구현했었지?"
→ 모든 문서 읽기 → 100,000 토큰
→ 관련 문서 찾기 → 50,000 토큰
→ 답변 생성 → 5,000 토큰
**총 155,000 토큰** (답변 하나에!)
```

### 효율적인 방식 (토큰 절약)
```markdown
✅ 좋은 예: 메타데이터 기반 색인

Claude 시작 →
→ 메타데이터 인덱스만 로드 (500 토큰)
→ 필요한 문서만 선택적 로드 (2,000 토큰)
**총 2,500 토큰** (200배 절약!)

✅ 좋은 예: 2단계 검색
사용자: "JWT 어떻게 구현했었지?"
→ 메타데이터 검색 (100 토큰)
→ 관련 문서 1개만 로드 (1,500 토큰)
→ 요약 생성 (500 토큰)
**총 2,100 토큰** (74배 절약!)
```

## 🏗️ 토큰 효율적 아키텍처

### Layer 1: 경량 인덱스 (Lightweight Index)

#### 인덱스 파일 (.claude/obsidian-index.json)
```json
{
  "lastUpdate": "2025-10-19T16:45:00Z",
  "projects": {
    "나라똔": {
      "totalDocs": 87,
      "categories": {
        "트러블슈팅": {
          "total": 15,
          "unresolved": 0,
          "recent": [
            {
              "file": "05-트러블슈팅/2025-10-19-관리자Role-403에러-JWT콜백미조회.md",
              "title": "관리자인증 - 403에러 - JWT콜백미조회",
              "date": "2025-10-19",
              "tags": ["인증", "관리자", "JWT", "403에러"],
              "resolved": true,
              "severity": "High",
              "summary": "JWT 콜백에서 role 미조회. DB 직접 조회로 해결."
            }
          ]
        },
        "기능개발": {
          "total": 32,
          "recent": [...]
        }
      },
      "keywords": {
        "JWT": ["05-트러블슈팅/2025-10-19-...", "03-기능개발/2025-09-15-..."],
        "인증": ["05-트러블슈팅/2025-10-19-...", "01-아키텍처/2025-09-10-..."],
        "MongoDB": [...]
      }
    }
  }
}
```

**토큰 사용량**: ~500 토큰 (전체 인덱스)

#### 인덱스 자동 생성 스크립트
```javascript
/**
 * 문서 저장 시 인덱스 자동 업데이트
 * 전체 문서 내용은 로드하지 않음 (메타데이터만)
 */
async function updateIndex(newDocument) {
  const index = loadIndex(); // 기존 인덱스 로드 (500 토큰)

  // 메타데이터만 추출 (문서 본문 제외)
  const metadata = {
    file: newDocument.path,
    title: newDocument.frontMatter.title,
    date: newDocument.frontMatter.date,
    tags: newDocument.frontMatter.tags,
    summary: newDocument.frontMatter.summary || generateSummary(newDocument, 50), // 50단어 요약
    // 본문은 인덱스에 포함하지 않음!
  };

  // 인덱스에 추가
  index.projects[newDocument.project].categories[newDocument.category].recent.unshift(metadata);

  // 키워드 인덱싱
  newDocument.frontMatter.tags.forEach(tag => {
    if (!index.projects[newDocument.project].keywords[tag]) {
      index.projects[newDocument.project].keywords[tag] = [];
    }
    index.projects[newDocument.project].keywords[tag].push(newDocument.path);
  });

  saveIndex(index); // 인덱스만 저장 (전체 문서 저장 안 함!)
}
```

### Layer 2: 2단계 검색 (Two-Phase Search)

#### Phase 1: 메타데이터 검색 (초고속)
```javascript
/**
 * 인덱스에서 관련 문서 찾기
 * 토큰 사용: ~100 토큰
 */
function searchIndex(query) {
  const index = loadIndex(); // 500 토큰
  const results = [];

  // 키워드 매칭
  const keywords = extractKeywords(query); // "JWT 인증" → ["JWT", "인증"]

  keywords.forEach(keyword => {
    const files = index.projects.나라똔.keywords[keyword] || [];
    results.push(...files);
  });

  // 중복 제거 및 relevance 정렬
  const unique = [...new Set(results)];
  const sorted = sortByRelevance(unique, query);

  // 상위 3개만 반환 (토큰 절약)
  return sorted.slice(0, 3).map(file => {
    return findInIndex(file); // 메타데이터만 반환 (본문 제외)
  });
}
```

#### Phase 2: 선택적 로드 (필요 시에만)
```javascript
/**
 * 관련 문서만 전체 로드
 * 토큰 사용: ~1,500 토큰 (문서 1개)
 */
async function loadRelevantDocs(searchResults) {
  // 가장 관련성 높은 문서 1개만 전체 로드
  const topResult = searchResults[0];
  const fullContent = await obsidianAPI.getFile(topResult.file);

  return {
    metadata: topResult,
    content: fullContent, // 필요할 때만 로드!
  };
}
```

### Layer 3: 요약 기반 컨텍스트 (Summary-Based Context)

#### 긴 문서는 요약만 제공
```javascript
/**
 * 문서 저장 시 자동 요약 생성
 */
function generateSummary(document, maxWords = 100) {
  // 1. 메타데이터 기반 요약
  const summary = {
    what: document.frontMatter.title,
    when: document.frontMatter.date,
    category: document.frontMatter.category,
  };

  // 2. 트러블슈팅은 "문제-원인-해결" 3줄 요약
  if (document.frontMatter.category === '트러블슈팅') {
    summary.problem = document.sections.문제요약; // 1줄
    summary.cause = document.sections.근본원인; // 1줄
    summary.solution = document.sections.해결방법; // 1줄
    // 총 ~50 토큰
  }

  // 3. 기능개발은 "기능-목적-구현" 3줄 요약
  if (document.frontMatter.category === '기능개발') {
    summary.feature = document.frontMatter.title;
    summary.purpose = document.sections.목적;
    summary.implementation = document.sections.핵심코드;
    // 총 ~50 토큰
  }

  return summary;
}
```

#### Claude에게 전달하는 컨텍스트
```markdown
# ✅ 효율적 (요약만)
사용자: "JWT 인증 어떻게 구현했었지?"

Claude:
📖 인덱스 검색 중... (100 토큰)
✅ 관련 문서 발견: [[2025-09-15-JWT인증구현]]

**요약**:
- 무엇: NextAuth + JWT 기반 인증
- 언제: 2025-09-15
- 목적: 관리자 권한 관리
- 핵심: lib/auth/authOptions.ts에서 JWT 콜백 정의

💬 더 자세한 내용이 필요하신가요?
[예] → 전체 문서 로드 (+1,500 토큰)
[아니오] → 토큰 절약!

**사용 토큰**: 100 (검색) + 200 (요약) = 300 토큰
```

vs

```markdown
# ❌ 비효율적 (전체 로드)
사용자: "JWT 인증 어떻게 구현했었지?"

Claude:
📖 전체 문서 로드 중...

[2,000줄 문서 전체 내용...]

**사용 토큰**: 15,000 토큰 (50배 낭비!)
```

## 🎯 토큰 최적화 전략

### 전략 1: 계층적 로딩 (Hierarchical Loading)

```javascript
/**
 * 3단계 계층적 로딩
 */
class HierarchicalLoader {
  // Level 1: 인덱스만 (500 토큰)
  async loadIndex() {
    return loadJSON('.claude/obsidian-index.json');
  }

  // Level 2: 메타데이터 + 요약 (100 토큰/문서)
  async loadSummaries(files) {
    return files.map(file => {
      const frontMatter = extractFrontMatter(file); // YAML만 파싱
      return {
        ...frontMatter,
        summary: frontMatter.summary, // 사전 생성된 요약
      };
    });
  }

  // Level 3: 전체 내용 (1,500 토큰/문서) - 필요 시에만!
  async loadFullContent(file) {
    return await obsidianAPI.getFile(file);
  }
}
```

**사용 예시**:
```markdown
사용자: "최근 트러블슈팅 뭐 있어?"

Claude:
→ Level 1: 인덱스 로드 (500 토큰)
→ Level 2: 트러블슈팅 요약 3개 (300 토큰)
→ 총 800 토큰 (전체 로드 시 45,000 토큰 절약!)

사용자: "첫 번째 문제 자세히 알려줘"

Claude:
→ Level 3: 해당 문서만 전체 로드 (1,500 토큰)
→ 총 2,300 토큰 (여전히 효율적!)
```

### 전략 2: 캐싱 (Caching)

```javascript
/**
 * 세션 내 캐싱으로 중복 로드 방지
 */
class DocumentCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 10; // 최대 10개 문서만 캐시
  }

  get(file) {
    return this.cache.get(file);
  }

  set(file, content) {
    // LRU (Least Recently Used) 정책
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(file, content);
  }
}

/**
 * 사용 예시
 */
사용자: "JWT 인증 관련 문제 알려줘" (첫 번째 질문)
→ 문서 로드 (1,500 토큰)
→ 캐시에 저장

사용자: "그 JWT 문서 다시 보여줘" (같은 세션)
→ 캐시에서 즉시 반환 (0 토큰!)
```

### 전략 3: 스마트 필터링 (Smart Filtering)

```javascript
/**
 * 관련도 점수 계산으로 불필요한 문서 제외
 */
function calculateRelevance(query, document) {
  let score = 0;

  // 1. 태그 매칭 (가중치: 10)
  query.keywords.forEach(keyword => {
    if (document.tags.includes(keyword)) score += 10;
  });

  // 2. 제목 매칭 (가중치: 5)
  if (document.title.includes(query.text)) score += 5;

  // 3. 최근성 (가중치: 1~5)
  const daysSince = (Date.now() - document.date) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) score += 5;
  else if (daysSince < 30) score += 3;
  else if (daysSince < 90) score += 1;

  return score;
}

/**
 * 상위 N개만 반환
 */
function filterTopResults(results, maxResults = 3) {
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults); // 상위 3개만 (나머지는 로드 안 함!)
}
```

### 전략 4: 점진적 공개 (Progressive Disclosure)

```markdown
# Claude의 답변 전략

사용자: "인증 관련 모든 문서 보여줘"

Claude:
📚 인증 관련 문서 **87개** 발견

**최근 3개** (요약만):
1. [[2025-10-19-관리자Role-403에러]]
   요약: JWT 콜백 role 미조회 → DB 직접 조회로 해결

2. [[2025-10-18-소셜로그인-네이버구현]]
   요약: NextAuth + Naver OAuth 연동 완료

3. [[2025-10-15-세션만료-자동갱신]]
   요약: JWT 만료 시간 1시간 → 자동 갱신 로직 추가

💬 선택:
[1-3 번호] → 해당 문서 전체 보기
[더보기] → 다음 3개 표시
[전체] → 전체 87개 목록 (요약만)

**사용 토큰**: 500 (인덱스) + 300 (요약 3개) = 800 토큰
vs 전체 로드 시: 130,500 토큰 (163배 절약!)
```

### 전략 5: 압축 요약 (Compressed Summary)

```javascript
/**
 * 초압축 요약 생성 (문서당 20 토큰 이하)
 */
function generateMicroSummary(document) {
  switch (document.category) {
    case '트러블슈팅':
      return `${document.function}-${document.errorType}: ${document.solution}`;
      // 예: "관리자인증-403: JWT DB조회 추가"

    case '기능개발':
      return `${document.feature}: ${document.purpose}`;
      // 예: "이미지업로드: Cloudflare R2 연동"

    case '아키텍처':
      return `${document.title}: ${document.pattern}`;
      // 예: "인증구조: RBAC + JWT"
  }
}

/**
 * 대량 문서 표시 시 사용
 */
const microSummaries = documents.map(generateMicroSummary);
// 100개 문서 = 2,000 토큰 (vs 전체 로드 150,000 토큰)
```

## 📊 토큰 사용량 비교

### 시나리오 1: 세션 시작

| 방식 | 토큰 | 절약률 |
|------|------|--------|
| ❌ 전체 문서 로드 | 500,000 | - |
| ✅ 인덱스만 로드 | 500 | **99.9%** |

### 시나리오 2: 문서 검색

| 방식 | 토큰 | 절약률 |
|------|------|--------|
| ❌ 전체 검색 후 로드 | 155,000 | - |
| ⚠️ 메타데이터 검색 + 전체 로드 | 2,500 | 98.4% |
| ✅ 메타데이터 검색 + 요약만 | 300 | **99.8%** |

### 시나리오 3: 대화 기록 조회

| 방식 | 토큰 | 절약률 |
|------|------|--------|
| ❌ 전체 대화 로드 (30개) | 45,000 | - |
| ✅ 요약만 표시 | 800 | **98.2%** |

### 시나리오 4: 일일 사용량 (10회 검색)

| 방식 | 토큰/일 | 비용 |
|------|---------|------|
| ❌ 비효율적 | 1,550,000 | ~$5 |
| ✅ 효율적 | 8,000 | ~$0.03 |

**절약**: **$4.97/일** (월 $149 절약!)

## 🚀 구현 우선순위

### Phase 1: 기본 최적화 (1주)
- [ ] 경량 인덱스 생성 (.claude/obsidian-index.json)
- [ ] 메타데이터 기반 검색
- [ ] 문서 요약 자동 생성

**예상 절약**: 90%

### Phase 2: 고급 최적화 (2주)
- [ ] 계층적 로딩
- [ ] 세션 캐싱
- [ ] 관련도 점수 필터링

**예상 절약**: 98%

### Phase 3: 초고급 최적화 (3주)
- [ ] 점진적 공개
- [ ] 압축 요약
- [ ] 벡터 검색 (유사도 기반)

**예상 절약**: 99.5%

## 🎯 최종 아키텍처

```
┌─────────────────────────────────────────────┐
│  사용자 질문: "JWT 인증 어떻게 했었지?"    │
└──────────────────┬──────────────────────────┘
                   │
       ┌───────────▼───────────┐
       │  경량 인덱스 검색     │  500 토큰
       │  (.claude/index.json) │
       └───────────┬───────────┘
                   │
       ┌───────────▼──────────────┐
       │  관련 문서 3개 발견      │
       │  (메타데이터 + 요약만)  │  300 토큰
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Claude 답변 생성        │  200 토큰
       │  (요약 기반)             │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  사용자: "자세히"        │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  문서 1개만 전체 로드    │  1,500 토큰
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  캐시에 저장             │  0 토큰 (재사용 시)
       └───────────┬──────────────┘
                   │
                   ▼
            **총 2,500 토큰**
      (vs 비효율적 방식 155,000 토큰)
      **62배 절약!**
```

---

**이 아키텍처로 토큰을 99% 절약하면서도 모든 지식에 접근할 수 있습니다.**
**매월 $150 이상의 API 비용을 $1-2로 줄일 수 있습니다.**
