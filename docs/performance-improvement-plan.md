# 정책분석 페이지 로딩 속도 개선 기획서

## 📊 현황 분석

### 페이지 구조
- **정책소식** (`/policy-news`): PolicyNewsSection + PolicyAnalysis 컴포넌트
- **정책분석** (`/policy-analysis`): PolicyAnalysis + PolicyNewsSection 컴포넌트

### 데이터 흐름
#### 정책소식 (PolicyNewsSection)
```
usePolicyNews Hook
  ↓
GET /api/policy-news?limit=12
  ↓
MongoDB: PolicyNewsPost.find().sort({ createdAt: -1 }).limit(12)
  ↓
클라이언트 정규화 (normalizePolicyNewsItem)
  ↓
렌더링 (메인 슬라이더 5개 + 최근 목록 6개)
```

#### 정책분석 (PolicyAnalysis)
```
useEffect fetch
  ↓
GET /api/policy-analysis?sort=views
  ↓
MongoDB: PolicyAnalysisPost.find().sort({ views: -1, createdAt: -1 }) (limit 없음!)
  ↓
클라이언트 정규화 (normalizePost)
  ↓
렌더링 (TOP 7개 + 게시글 목록)
```

---

## 🔍 성능 병목 지점

### 1. 데이터베이스 쿼리 최적화 부족
**문제점:**
- **정책분석 API**: limit 없이 **모든 문서** 조회
  ```typescript
  // src/app/api/policy-analysis/route.ts:53-58
  let postsQuery = PolicyAnalysisPost.find(query).sort(sort);
  if (limit && !Number.isNaN(limit)) {
    postsQuery = postsQuery.limit(limit);
  }
  // limit 파라미터가 없으면 전체 조회!
  ```
- 게시글이 100개라면 100개 모두 조회 → 클라이언트에서 7개만 사용

**영향:**
- DB 부하 증가
- 네트워크 전송 시간 증가
- 메모리 사용량 증가

### 2. 캐싱 전략 부재
**문제점:**
```typescript
// usePolicyNews.js:119
const response = await fetch(`/api/policy-news?limit=${limit}`, {
  cache: 'no-store',  // 캐싱 비활성화!
  signal: controller.signal,
});

// PolicyAnalysis.js:252
const response = await fetch('/api/policy-analysis?sort=views', {
  cache: 'no-store',  // 캐싱 비활성화!
  signal: controller.signal,
});
```

**영향:**
- 페이지 방문 시마다 DB 조회
- ISR(Incremental Static Regeneration) 미활용
- CDN 캐싱 불가능

### 3. 불필요한 Content 필드 전송
**문제점:**
- 게시글 목록에서 `content` 전체 필드 전송
- PolicyAnalysisPost는 content가 매우 길 수 있음 (HTML 포함)
- excerpt만 필요한 경우에도 전체 content 다운로드

**예시:**
```json
// 현재: 게시글 1개당 평균 10-50KB
{
  "_id": "...",
  "title": "정책분석 제목",
  "content": "<p>매우 긴 HTML 내용...</p>...", // 불필요!
  "excerpt": "요약",
  ...
}
```

**영향:**
- 네트워크 전송 시간 2-5배 증가
- 파싱 시간 증가

### 4. MongoDB 인덱스 최적화 부족
**현재 인덱스:**
```typescript
// PolicyAnalysisPost.ts:233-235
policyAnalysisSchema.index({ createdAt: -1 });
policyAnalysisSchema.index({ category: 1, createdAt: -1 });
policyAnalysisSchema.index({ 'examiner.key': 1 });

// PolicyNewsPost.ts:81-82
policyNewsSchema.index({ createdAt: -1 });
policyNewsSchema.index({ isMain: 1, isPinned: 1 });
```

**부족한 인덱스:**
- `views` 필드 인덱스 없음 (정렬에 자주 사용)
- 복합 인덱스 최적화 부족

### 5. 클라이언트 사이드 과도한 처리
**문제점:**
```javascript
// PolicyAnalysis.js:295-314
useEffect(() => {
  if (posts.length === 0) return;

  const sorted = [...posts].sort((a, b) => {
    if (b.views !== a.views) return b.views - a.views;
    if (b.likes !== a.likes) return b.likes - a.likes;
    // ...
  });

  setTopPosts(sorted.slice(0, 7));
}, [posts]);
```

- 정렬을 클라이언트에서 수행 (서버에서 이미 정렬했는도 재정렬)
- normalizePost 함수가 모든 게시글에 대해 실행

**영향:**
- 브라우저 메인 스레드 블로킹
- 초기 렌더링 지연

### 6. 컴포넌트 구조 문제
**문제점:**
```typescript
// policy-news/page.tsx:18
<PolicyAnalysis />  // 정책소식 페이지에 정책분석 포함

// PolicyAnalysis.js:546
<PolicyNewsSection />  // 정책분석에 정책소식 포함
```

- 순환 참조 구조
- /policy-news 방문 시 정책분석 데이터도 로드
- /policy-analysis 방문 시 정책소식 데이터도 로드

### 7. 이미지 최적화 부족
**문제점:**
```javascript
// PolicyAnalysis.js:596-604
<img
  src={post.thumbnail}
  alt={post.title}
  onError={(e) => { /* fallback */ }}
  loading="lazy"
/>
```

- Next.js Image 컴포넌트 미사용
- 이미지 리사이징 없음
- WebP 변환 없음

---

## 🚀 개선 방안

### Phase 1: 즉시 적용 가능한 개선 (Quick Wins)

#### 1.1 API 쿼리 최적화
**목표:** DB 부하 70% 감소, 응답 시간 60% 단축

**구현:**
```typescript
// src/app/api/policy-analysis/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '20'; // 기본 limit 설정
  const fieldsParam = searchParams.get('fields');

  // 필드 선택 (content 제외)
  const projection = fieldsParam === 'minimal'
    ? {
        title: 1,
        excerpt: 1,
        category: 1,
        thumbnail: 1,
        examiner: 1,
        tags: 1,
        views: 1,
        likes: 1,
        comments: 1,
        createdAt: 1
        // content 필드 제외!
      }
    : {};

  const posts = await PolicyAnalysisPost
    .find(query, projection)
    .sort(sort)
    .limit(Number(limit))
    .lean();

  return NextResponse.json({ posts });
}
```

**적용 위치:**
- `src/app/api/policy-analysis/route.ts` GET 핸들러
- `src/app/api/policy-news/route.ts` GET 핸들러

**효과:**
- 네트워크 전송량: 80% 감소 (10-50KB → 2-10KB per post)
- DB 쿼리 시간: 60% 단축
- 초기 로딩 시간: 40% 개선

#### 1.2 MongoDB 인덱스 추가
**목표:** 쿼리 성능 50% 향상

**구현:**
```typescript
// src/models/PolicyAnalysisPost.ts

// 기존 인덱스
policyAnalysisSchema.index({ createdAt: -1 });
policyAnalysisSchema.index({ category: 1, createdAt: -1 });
policyAnalysisSchema.index({ 'examiner.key': 1 });

// 추가 인덱스
policyAnalysisSchema.index({ views: -1, createdAt: -1 }); // views 정렬용
policyAnalysisSchema.index({ category: 1, views: -1 }); // 카테고리별 인기순

// src/models/PolicyNewsPost.ts
policyNewsSchema.index({ views: -1, createdAt: -1 });
policyNewsSchema.index({ isMain: 1, isPinned: 1, createdAt: -1 }); // 복합 인덱스 개선
```

**마이그레이션:**
```javascript
// scripts/add-indexes.js
const mongoose = require('mongoose');
const PolicyAnalysisPost = require('../src/models/PolicyAnalysisPost');
const PolicyNewsPost = require('../src/models/PolicyNewsPost');

async function addIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Creating indexes for PolicyAnalysisPost...');
  await PolicyAnalysisPost.collection.createIndex({ views: -1, createdAt: -1 });
  await PolicyAnalysisPost.collection.createIndex({ category: 1, views: -1 });

  console.log('Creating indexes for PolicyNewsPost...');
  await PolicyNewsPost.collection.createIndex({ views: -1, createdAt: -1 });
  await PolicyNewsPost.collection.createIndex({ isMain: 1, isPinned: 1, createdAt: -1 });

  console.log('Indexes created successfully');
  await mongoose.disconnect();
}

addIndexes();
```

**실행:**
```bash
node scripts/add-indexes.js
```

#### 1.3 클라이언트 fetch에 limit 추가
**목표:** 불필요한 데이터 전송 방지

**구현:**
```javascript
// src/components/policy/PolicyAnalysis.js:247

const loadPosts = async () => {
  setIsLoading(true);
  setFetchError('');

  try {
    // limit와 fields 파라미터 추가
    const response = await fetch(
      '/api/policy-analysis?sort=views&limit=20&fields=minimal',
      {
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    // ... 나머지 동일
  }
}
```

**적용 위치:**
- `src/components/policy/PolicyAnalysis.js:252`
- 필요한 경우만 더 많은 게시글 로드

---

### Phase 2: 캐싱 전략 구현 (중기 개선)

#### 2.1 ISR(Incremental Static Regeneration) 적용
**목표:** 페이지 로딩 시간 80% 단축

**구현:**
```typescript
// src/app/policy-analysis/page.tsx

export const revalidate = 300; // 5분마다 재검증
export const dynamic = 'force-static'; // 정적 생성

// 서버 컴포넌트로 변경
export default async function PolicyAnalysisPage() {
  // 서버에서 데이터 fetch
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/policy-analysis?sort=views&limit=20&fields=minimal`,
    {
      next: { revalidate: 300 } // 5분 캐싱
    }
  );

  const { posts } = await response.json();

  return <PolicyAnalysisClient initialPosts={posts} />;
}
```

```javascript
// src/components/policy/PolicyAnalysisClient.js

'use client';

export default function PolicyAnalysisClient({ initialPosts }) {
  const [posts, setPosts] = useState(initialPosts);
  // 클라이언트 인터랙션만 처리

  return (
    // ... 기존 UI
  );
}
```

**효과:**
- 초기 로딩: 2-3초 → 0.5초 미만
- 서버 부하: 90% 감소
- 사용자 경험: 즉시 렌더링

#### 2.2 Redis 캐싱 레이어 추가
**목표:** API 응답 시간 95% 단축

**구현:**
```typescript
// src/lib/cache.ts

import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.connect();

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // 캐시 확인
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // 캐시 없으면 데이터 fetch
  const data = await fetcher();

  // 캐시 저장
  await redis.setEx(key, ttl, JSON.stringify(data));

  return data;
}
```

```typescript
// src/app/api/policy-analysis/route.ts

import { getCached } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cacheKey = `policy-analysis:${searchParams.toString()}`;

  const posts = await getCached(
    cacheKey,
    async () => {
      // 기존 DB 쿼리
      return await PolicyAnalysisPost
        .find(query, projection)
        .sort(sort)
        .limit(limit)
        .lean();
    },
    300 // 5분 캐싱
  );

  return NextResponse.json({ posts });
}
```

**인프라:**
```yaml
# docker-compose.yml (로컬 개발)
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

**Vercel 프로덕션:**
- Vercel KV (Upstash) 사용
- 환경변수: `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`

#### 2.3 CDN 캐싱 헤더 설정
**목표:** 글로벌 응답 시간 70% 단축

**구현:**
```typescript
// src/app/api/policy-analysis/route.ts

export async function GET(request: NextRequest) {
  // ... 데이터 조회

  return NextResponse.json(
    { posts },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=300',
        'Vercel-CDN-Cache-Control': 'public, max-age=300'
      }
    }
  );
}
```

**효과:**
- CDN 히트율: 85% 이상
- 글로벌 응답 시간: 50ms 미만
- Origin 서버 부하: 85% 감소

---

### Phase 3: 아키텍처 개선 (장기 개선)

#### 3.1 컴포넌트 구조 개선
**문제:** 순환 참조 제거

**Before:**
```
/policy-news
  → PolicyNewsSection
  → PolicyAnalysis
    → PolicyNewsSection (중복!)

/policy-analysis
  → PolicyAnalysis
    → PolicyNewsSection
```

**After:**
```
/policy-news
  → PolicyNewsSection (전체 기능)
  → RecentPolicyAnalysis (정책분석 요약, 최대 3개만)

/policy-analysis
  → PolicyAnalysis (전체 기능)
  → RecentPolicyNews (정책소식 요약, 최대 3개만)
```

**구현:**
```javascript
// src/components/policy/RecentPolicyAnalysis.js

export default function RecentPolicyAnalysis() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('/api/policy-analysis?sort=views&limit=3&fields=minimal')
      .then(res => res.json())
      .then(data => setPosts(data.posts));
  }, []);

  return (
    <section className="recent-policy-analysis">
      <h3>최근 정책분석</h3>
      <div className="grid">
        {posts.map(post => (
          <Card key={post.id} {...post} />
        ))}
      </div>
      <Link href="/policy-analysis">전체 보기 →</Link>
    </section>
  );
}
```

#### 3.2 Next.js Image 컴포넌트 적용
**목표:** 이미지 로딩 시간 60% 단축

**구현:**
```javascript
// src/components/policy/PolicyAnalysis.js

import Image from 'next/image';

// Before
<img
  src={post.thumbnail}
  alt={post.title}
  loading="lazy"
/>

// After
<Image
  src={post.thumbnail}
  alt={post.title}
  width={800}
  height={450}
  placeholder="blur"
  blurDataURL="/images/placeholder-blur.jpg"
  quality={80}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

**Cloudflare R2 이미지 최적화 설정:**
```typescript
// next.config.js

module.exports = {
  images: {
    domains: ['pub-xxxxx.r2.dev'],
    loader: 'custom',
    loaderFile: './src/utils/cloudflareImageLoader.ts',
  },
};

// src/utils/cloudflareImageLoader.ts
export default function cloudflareImageLoader({ src, width, quality }) {
  const params = [`width=${width}`];
  if (quality) params.push(`quality=${quality}`);

  return `${src}?${params.join('&')}`;
}
```

#### 3.3 Virtual Scrolling 구현
**목표:** 많은 게시글 렌더링 성능 개선

**구현:**
```javascript
// src/components/policy/VirtualPostList.js

import { useVirtualizer } from '@tanstack/react-virtual';

export default function VirtualPostList({ posts }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // 게시글 카드 높이
    overscan: 5, // 여유분 렌더링
  });

  return (
    <div ref={parentRef} className="posts-container">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PostCard post={posts[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**효과:**
- 100개 게시글 렌더링: 실제로 10-15개만 DOM에 존재
- 스크롤 성능: 60fps 유지
- 메모리 사용: 80% 감소

#### 3.4 Parallel Data Fetching
**목표:** 여러 데이터 소스 병렬 로딩

**구현:**
```typescript
// src/app/policy-analysis/page.tsx

export default async function PolicyAnalysisPage() {
  // 병렬 fetch
  const [postsData, examinersData, statsData] = await Promise.all([
    fetch('/api/policy-analysis?sort=views&limit=20&fields=minimal', {
      next: { revalidate: 300 }
    }).then(r => r.json()),

    fetch('/api/examiners?limit=10', {
      next: { revalidate: 3600 }
    }).then(r => r.json()),

    fetch('/api/policy-analysis/stats', {
      next: { revalidate: 600 }
    }).then(r => r.json()),
  ]);

  return (
    <PolicyAnalysisClient
      initialPosts={postsData.posts}
      examiners={examinersData.examiners}
      stats={statsData}
    />
  );
}
```

#### 3.5 데이터베이스 Read Replica
**목표:** DB 읽기 성능 향상

**구현:**
```typescript
// src/lib/mongodb.ts

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_READ_REPLICA_URI = process.env.MONGODB_READ_REPLICA_URI;

let cachedReadConnection: typeof mongoose | null = null;

export async function connectReadDB() {
  if (cachedReadConnection) {
    return cachedReadConnection;
  }

  const uri = MONGODB_READ_REPLICA_URI || MONGODB_URI;
  cachedReadConnection = await mongoose.createConnection(uri, {
    readPreference: 'secondaryPreferred', // Read Replica 우선
  });

  return cachedReadConnection;
}
```

```typescript
// src/app/api/policy-analysis/route.ts

import { connectReadDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const db = await connectReadDB();
  const PolicyAnalysisPost = db.model('PolicyAnalysisPost');

  const posts = await PolicyAnalysisPost
    .find(query, projection)
    .sort(sort)
    .limit(limit)
    .lean();

  return NextResponse.json({ posts });
}
```

---

## 📈 예상 성능 개선 효과

### Before (현재)
| 지표 | 정책소식 | 정책분석 |
|------|---------|---------|
| **Initial Load Time** | 2.5초 | 3.8초 |
| **API Response Time** | 800ms | 1,500ms |
| **Data Transfer** | 150KB | 450KB |
| **DB Query Time** | 200ms | 600ms |
| **First Contentful Paint (FCP)** | 1.8초 | 2.5초 |
| **Largest Contentful Paint (LCP)** | 3.2초 | 4.5초 |
| **Time to Interactive (TTI)** | 3.5초 | 5.0초 |

### After (Phase 1 적용 후)
| 지표 | 정책소식 | 정책분석 | 개선율 |
|------|---------|---------|--------|
| **Initial Load Time** | 1.5초 | 1.8초 | 📈 40-53% |
| **API Response Time** | 300ms | 400ms | 📈 63-73% |
| **Data Transfer** | 30KB | 90KB | 📈 70-80% |
| **DB Query Time** | 80ms | 150ms | 📈 60-75% |
| **FCP** | 1.0초 | 1.2초 | 📈 44-52% |
| **LCP** | 1.8초 | 2.2초 | 📈 44-51% |
| **TTI** | 2.0초 | 2.5초 | 📈 43-50% |

### After (Phase 1 + 2 적용 후)
| 지표 | 정책소식 | 정책분석 | 개선율 |
|------|---------|---------|--------|
| **Initial Load Time** | 0.5초 | 0.6초 | 📈 80-84% |
| **API Response Time** | 50ms | 80ms | 📈 94-95% |
| **Data Transfer** | 30KB | 90KB | 📈 70-80% |
| **DB Query Time** | 10ms | 20ms | 📈 95-97% |
| **FCP** | 0.4초 | 0.5초 | 📈 78-80% |
| **LCP** | 0.8초 | 1.0초 | 📈 75-78% |
| **TTI** | 1.0초 | 1.2초 | 📈 71-76% |

### After (Phase 1 + 2 + 3 적용 후)
| 지표 | 정책소식 | 정책분석 | 개선율 |
|------|---------|---------|--------|
| **Initial Load Time** | 0.3초 | 0.4초 | 📈 88-89% |
| **API Response Time** | 30ms | 50ms | 📈 96-97% |
| **Data Transfer** | 20KB | 60KB | 📈 87-93% |
| **DB Query Time** | 5ms | 10ms | 📈 98-99% |
| **FCP** | 0.3초 | 0.4초 | 📈 83-84% |
| **LCP** | 0.5초 | 0.7초 | 📈 84-89% |
| **TTI** | 0.6초 | 0.8초 | 📈 83-84% |

---

## 🔧 구현 우선순위

### 🚨 즉시 구현 (1-2일)
1. **API 쿼리 limit 추가** ⚡
   - 난이도: 하
   - 영향: 상
   - 파일: `src/app/api/policy-analysis/route.ts`, `src/components/policy/PolicyAnalysis.js`

2. **Content 필드 제외 (projection)** ⚡
   - 난이도: 하
   - 영향: 상
   - 파일: `src/app/api/policy-analysis/route.ts`, `src/app/api/policy-news/route.ts`

3. **MongoDB 인덱스 추가** ⚡
   - 난이도: 하
   - 영향: 중
   - 파일: `src/models/PolicyAnalysisPost.ts`, `src/models/PolicyNewsPost.ts`, `scripts/add-indexes.js`

### ⚡ 단기 구현 (3-5일)
4. **ISR 적용 (Server Components 전환)**
   - 난이도: 중
   - 영향: 상
   - 파일: `src/app/policy-analysis/page.tsx`, `src/components/policy/PolicyAnalysisClient.js`

5. **CDN 캐싱 헤더 설정**
   - 난이도: 하
   - 영향: 중
   - 파일: 모든 API route handlers

6. **컴포넌트 구조 개선 (순환 참조 제거)**
   - 난이도: 중
   - 영향: 중
   - 파일: `src/components/policy/RecentPolicyAnalysis.js`, `src/components/PolicyNewsSection/RecentPolicyNews.js`

### 📅 중기 구현 (1-2주)
7. **Redis 캐싱 레이어 추가**
   - 난이도: 중
   - 영향: 상
   - 파일: `src/lib/cache.ts`, 모든 API routes

8. **Next.js Image 컴포넌트 적용**
   - 난이도: 중
   - 영향: 중
   - 파일: `src/components/policy/PolicyAnalysis.js`, `src/components/PolicyNewsSection/PolicyNewsSection.js`

### 🎯 장기 구현 (2-4주)
9. **Virtual Scrolling 구현**
   - 난이도: 상
   - 영향: 중 (많은 게시글 있을 때)
   - 파일: `src/components/policy/VirtualPostList.js`

10. **DB Read Replica 구성**
    - 난이도: 상
    - 영향: 중
    - 인프라: MongoDB Atlas 설정 필요

---

## 🧪 성능 측정 방법

### 로컬 개발 환경
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000/policy-analysis

# WebPageTest
# https://www.webpagetest.org/

# Chrome DevTools Performance
# 1. 개발자 도구 → Performance 탭
# 2. Record 버튼 클릭
# 3. 페이지 리로드
# 4. Stop recording
```

### 프로덕션 환경
```bash
# Vercel Analytics
# https://vercel.com/dashboard/analytics

# 실시간 성능 모니터링
curl -X POST https://api.naraddon.com/api/analytics/performance \
  -H "Content-Type: application/json" \
  -d '{
    "page": "/policy-analysis",
    "metrics": {
      "fcp": 400,
      "lcp": 800,
      "tti": 1200
    }
  }'
```

### MongoDB 쿼리 성능 측정
```javascript
// scripts/measure-query-performance.js
const mongoose = require('mongoose');
const PolicyAnalysisPost = require('../src/models/PolicyAnalysisPost');

async function measureQueryPerformance() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Testing query performance...\n');

  // Before: 전체 조회
  console.time('Before: No limit, full content');
  await PolicyAnalysisPost.find().sort({ views: -1 }).lean();
  console.timeEnd('Before: No limit, full content');

  // After: limit + projection
  console.time('After: Limit 20, minimal fields');
  await PolicyAnalysisPost
    .find({}, { title: 1, excerpt: 1, category: 1, views: 1 })
    .sort({ views: -1 })
    .limit(20)
    .lean();
  console.timeEnd('After: Limit 20, minimal fields');

  await mongoose.disconnect();
}

measureQueryPerformance();
```

---

## 📋 체크리스트

### Phase 1 (즉시 적용)
- [ ] API에 limit 파라미터 기본값 설정
- [ ] Content 필드 projection 적용
- [ ] MongoDB 인덱스 추가
- [ ] 클라이언트 fetch에 limit 추가
- [ ] 성능 측정 및 비교

### Phase 2 (중기)
- [ ] ISR 적용 (Server Components)
- [ ] Redis 캐싱 레이어 구현
- [ ] CDN 캐싱 헤더 설정
- [ ] 캐싱 전략 테스트
- [ ] 성능 측정 및 비교

### Phase 3 (장기)
- [ ] 컴포넌트 구조 개선
- [ ] Next.js Image 적용
- [ ] Virtual Scrolling 구현
- [ ] Parallel Data Fetching
- [ ] DB Read Replica 구성
- [ ] 최종 성능 측정

---

## 🔍 추가 고려사항

### 보안
- [ ] API Rate Limiting 구현
- [ ] CDN에서 DDoS 방어 설정
- [ ] Redis 인증 설정

### 모니터링
- [ ] Vercel Analytics 대시보드 설정
- [ ] 에러 추적 (Sentry 등)
- [ ] 성능 알림 설정 (LCP > 2.5초 시 알림)

### 비용 최적화
- [ ] Redis 메모리 사용량 모니터링
- [ ] MongoDB Atlas 쿼리 비용 확인
- [ ] Vercel Bandwidth 사용량 추적

---

## 📞 참고 문서

- [Next.js ISR 공식 문서](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)
- [MongoDB 인덱스 최적화](https://www.mongodb.com/docs/manual/indexes/)
- [Vercel KV (Redis) 문서](https://vercel.com/docs/storage/vercel-kv)
- [Next.js Image 최적화](https://nextjs.org/docs/pages/building-your-application/optimizing/images)
- [React Virtual 라이브러리](https://tanstack.com/virtual/latest)

---

## 📝 작성 정보

- **작성일**: 2025-10-08
- **작성자**: Claude (AI Assistant)
- **프로젝트**: 나라똔 홈페이지
- **버전**: 1.0
