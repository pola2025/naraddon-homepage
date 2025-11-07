# 📊 Analytics 확장 기획서

**작성일**: 2025-11-07
**작성자**: Claude
**목적**: 관리자 대시보드 통계 시스템 개선 및 확장

---

## 🎯 현재 문제점

### 1. 대시보드 혼잡
```
❌ 문제:
- 너무 많은 통계가 한 화면에 표시됨
- 중요한 지표와 상세 분석이 섞여 있음
- 스크롤이 너무 길어짐
```

### 2. 기준 기간 불명확
```
❌ 문제:
- "최근 7일", "최근 28일" 등 기준 기간이 표시되지 않음
- 사용자가 언제 기준 데이터인지 알 수 없음
```

### 3. 차트 중복 문제
```
❌ 문제:
- 유입 타입 파이 차트에서 값이 겹치면 글자가 안 보임
- 색상 구분이 어려움
```

---

## 🔄 개선 방안

### 1. 대시보드 분리

#### `/admin/dashboard` (메인 대시보드)
**목적**: 한눈에 핵심 지표 파악

**표시 항목**:
```markdown
✅ 오늘 방문
✅ 어제 방문
✅ 이번 달 방문
✅ 전체 방문

✅ 마케팅 통계
   - 총 세션
   - 평균 페이지뷰
   - 평균 체류시간
   - 이탈률

✅ 나라똔튜브 관리 (현재 그대로)
✅ 빠른 메뉴 (현재 그대로)
✅ 최근 활동 (현재 그대로)
```

#### `/admin/analytics` (상세 통계)
**목적**: 심층 분석 및 인사이트

**표시 항목**:
```markdown
✅ 디바이스 타입 분석
   - 모바일/데스크톱/태블릿 비율
   - 기간별 추이

✅ 유입 타입 분석
   - 직접/검색/SNS/기타
   - 상세 유입 도메인 Top 10

✅ 인기 페이지 Top 10
   - 페이지뷰 순위
   - 평균 체류시간
   - 이탈률

✅ Google 검색 성능
   - 총 클릭/노출/CTR/평균 순위
   - 상위 검색어 Top 10

✅ 시간대별 트래픽
   - 시간대별 방문자 분포
   - 요일별 패턴

✅ 사용자 흐름
   - 첫 방문 → 이동 경로 → 이탈
```

---

## 📈 추가 가능한 통계 데이터

### A. 실시간 데이터

#### 1. 실시간 접속자 (Live Users)
```javascript
{
  currentVisitors: 12,
  currentPages: [
    { path: '/policy-news', users: 5 },
    { path: '/expert-services', users: 3 },
    { path: '/', users: 4 }
  ],
  lastUpdated: '2025-11-07T12:34:56'
}
```

**활용**:
- 현재 몇 명이 어떤 페이지를 보고 있는지
- 마케팅 캠페인 즉시 효과 확인

#### 2. 실시간 이벤트 스트림
```javascript
{
  events: [
    { time: '12:34:56', event: 'page_view', page: '/policy-news' },
    { time: '12:34:45', event: 'button_click', button: '상담신청' },
    { time: '12:34:32', event: 'form_submit', form: '전문가서비스' }
  ]
}
```

**활용**:
- 사용자 행동 실시간 모니터링
- 버그 즉시 감지

---

### B. 사용자 행동 분석

#### 3. 전환 퍼널 (Conversion Funnel)
```javascript
{
  funnel: [
    { step: '홈페이지 방문', users: 1000, rate: 100% },
    { step: '정책소식 조회', users: 450, rate: 45% },
    { step: '상담신청 클릭', users: 120, rate: 26.7% },
    { step: '상담신청 완료', users: 85, rate: 70.8% }
  ]
}
```

**활용**:
- 어디서 사용자가 이탈하는지 파악
- 전환율 개선 포인트 발견

#### 4. 사용자 여정 맵 (User Journey)
```javascript
{
  commonPaths: [
    {
      path: '/ → /policy-news → /expert-services → /consultation',
      users: 234,
      conversionRate: 34%
    },
    {
      path: '/ → /naraddon-tube → /policy-news',
      users: 156,
      conversionRate: 12%
    }
  ]
}
```

**활용**:
- 성공적인 사용자 경로 파악
- 콘텐츠 배치 최적화

#### 5. 스크롤 깊이 (Scroll Depth)
```javascript
{
  scrollDepth: {
    '25%': 890,   // 90%가 25%까지 스크롤
    '50%': 670,   // 67%가 50%까지
    '75%': 340,   // 34%가 75%까지
    '100%': 120   // 12%가 끝까지
  }
}
```

**활용**:
- 어디까지 콘텐츠를 읽는지
- CTA 버튼 최적 위치 결정

---

### C. 콘텐츠 성과

#### 6. 페이지별 상세 분석
```javascript
{
  page: '/policy-news',
  metrics: {
    views: 1234,
    uniqueVisitors: 890,
    avgTimeSpent: 125,  // 2분 5초
    bounceRate: 32%,
    exitRate: 28%,
    conversionRate: 5.6%
  },
  topEntries: ['/', '/expert-services'],  // 어디서 왔는지
  topExits: ['/consultation', '/naraddon-tube']  // 어디로 갔는지
}
```

**활용**:
- 인기 콘텐츠 파악
- 개선이 필요한 페이지 발견

#### 7. 검색어 분석 (내부 검색)
```javascript
{
  topSearches: [
    { query: '소상공인 지원금', count: 234, clickRate: 78% },
    { query: '청년 창업', count: 156, clickRate: 82% },
    { query: '세금 감면', count: 123, clickRate: 45% }  // 낮음 → 콘텐츠 부족
  ],
  noResultSearches: [
    { query: '농업 보조금', count: 45 },  // 콘텐츠 추가 필요
    { query: 'R&D 지원', count: 32 }
  ]
}
```

**활용**:
- 사용자 관심사 파악
- 신규 콘텐츠 아이디어

---

### D. 마케팅 효과

#### 8. UTM 캠페인 상세 분석
```javascript
{
  campaigns: [
    {
      source: 'naver',
      medium: 'cpc',
      campaign: '2025_winter_policy',
      clicks: 1234,
      cost: 350000,
      conversions: 67,
      revenue: 1250000,
      roi: 257%
    }
  ]
}
```

**활용**:
- 마케팅 ROI 계산
- 효과적인 채널 파악

#### 9. A/B 테스트 결과
```javascript
{
  test: 'CTA_button_color',
  variants: [
    { name: 'A (파랑)', visitors: 500, conversions: 45, rate: 9% },
    { name: 'B (빨강)', visitors: 500, conversions: 67, rate: 13.4% },
  ],
  winner: 'B',
  confidence: 95%
}
```

**활용**:
- 데이터 기반 의사결정
- 전환율 지속 개선

---

### E. 기술 성능

#### 10. 페이지 로딩 성능
```javascript
{
  performance: {
    avgLoadTime: 1.2,  // 초
    fcp: 0.8,  // First Contentful Paint
    lcp: 1.5,  // Largest Contentful Paint
    cls: 0.05,  // Cumulative Layout Shift
    fid: 12  // First Input Delay (ms)
  },
  slowestPages: [
    { path: '/policy-news/123', loadTime: 3.5 },
    { path: '/expert-services', loadTime: 2.8 }
  ]
}
```

**활용**:
- 느린 페이지 개선
- 사용자 경험 향상

#### 11. 에러 추적
```javascript
{
  errors: [
    {
      message: 'Failed to fetch',
      count: 23,
      affectedUsers: 18,
      page: '/api/policy-news'
    },
    {
      message: 'Cannot read property of undefined',
      count: 12,
      affectedUsers: 10,
      page: '/consultation'
    }
  ]
}
```

**활용**:
- 버그 조기 발견
- 사용자 영향 파악

---

### F. SEO 최적화

#### 12. 검색 엔진별 성과
```javascript
{
  searchEngines: [
    {
      engine: 'Google',
      impressions: 12340,
      clicks: 890,
      ctr: 7.2%,
      avgPosition: 5.6
    },
    {
      engine: 'Naver',
      impressions: 5670,
      clicks: 234,
      ctr: 4.1%,
      avgPosition: 8.3
    }
  ]
}
```

**활용**:
- 검색 엔진별 최적화 전략
- 키워드 순위 개선

#### 13. 백링크 분석
```javascript
{
  backlinks: [
    {
      domain: 'startup.go.kr',
      count: 45,
      quality: 'high',
      traffic: 234
    },
    {
      domain: 'blog.naver.com',
      count: 123,
      quality: 'medium',
      traffic: 89
    }
  ]
}
```

**활용**:
- SEO 권위도 향상
- 유입 확대

---

### G. 비즈니스 인사이트

#### 14. 코호트 분석 (Cohort Analysis)
```javascript
{
  cohorts: [
    {
      month: '2025-09',
      users: 1000,
      retention: {
        week1: 45%,  // 1주 후 재방문
        week2: 28%,
        week3: 18%,
        week4: 12%
      }
    }
  ]
}
```

**활용**:
- 사용자 이탈 시점 파악
- 리텐션 개선 전략

#### 15. LTV (Lifetime Value) 분석
```javascript
{
  userSegments: [
    {
      segment: 'Power Users',
      count: 234,
      avgVisits: 23,
      avgTimeSpent: 450,  // 분
      conversions: 12,
      ltv: 250000  // 원
    },
    {
      segment: 'Casual Users',
      count: 1890,
      avgVisits: 3,
      ltv: 15000
    }
  ]
}
```

**활용**:
- 고가치 사용자 파악
- 타겟 마케팅

---

## 🎨 UI/UX 개선 방안

### 1. 기준 기간 표시
```typescript
<div className="text-sm text-gray-500 mb-2">
  📅 기준 기간: {startDate} ~ {endDate}
</div>
```

### 2. 차트 중복 문제 해결

#### A. 파이 차트 → 도넛 차트
```typescript
// 중앙에 총 합계 표시
<PieChart>
  <Pie
    data={data}
    innerRadius={60}  // 도넛 형태
    outerRadius={100}
  >
    <Label value={totalCount} position="center" />
  </Pie>
</PieChart>
```

#### B. 범례 외부 표시
```typescript
<PieChart>
  <Pie data={data} />
  <Legend
    layout="vertical"
    align="right"
    verticalAlign="middle"
  />
</PieChart>
```

#### C. 툴팁 강화
```typescript
<Tooltip
  content={({ active, payload }) => {
    if (active && payload?.[0]) {
      return (
        <div className="bg-white p-3 shadow-lg rounded">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">{payload[0].value}회 ({percent}%)</p>
        </div>
      );
    }
  }}
/>
```

### 3. 탭 구조
```typescript
const tabs = [
  { id: 'overview', name: '개요', icon: ChartBarIcon },
  { id: 'traffic', name: '트래픽', icon: UsersIcon },
  { id: 'content', name: '콘텐츠', icon: DocumentIcon },
  { id: 'seo', name: 'SEO', icon: MagnifyingGlassIcon },
];

<Tab.Group>
  <Tab.List>
    {tabs.map(tab => <Tab key={tab.id}>{tab.name}</Tab>)}
  </Tab.List>
  <Tab.Panels>
    {/* 각 탭 내용 */}
  </Tab.Panels>
</Tab.Group>
```

---

## 📅 구현 우선순위

### Phase 1: 긴급 (이번 주)
```markdown
1. ✅ 대시보드 분리 (기본/상세)
2. ✅ 기준 기간 표시
3. ✅ 차트 중복 문제 해결
```

### Phase 2: 단기 (1-2주)
```markdown
4. ⏳ 실시간 접속자
5. ⏳ 전환 퍼널
6. ⏳ 페이지별 상세 분석
7. ⏳ 시간대별 트래픽
```

### Phase 3: 중기 (1-2개월)
```markdown
8. ⏳ 사용자 여정 맵
9. ⏳ UTM 캠페인 상세
10. ⏳ 코호트 분석
11. ⏳ 성능 모니터링
```

### Phase 4: 장기 (3개월+)
```markdown
12. ⏳ A/B 테스트
13. ⏳ LTV 분석
14. ⏳ AI 기반 인사이트 자동 생성
15. ⏳ 예측 분석 (머신러닝)
```

---

## 🎯 기대 효과

### 사용자 (관리자) 측면
```
✅ 핵심 지표를 한눈에 파악
✅ 상세 분석이 필요할 때만 Analytics 페이지 방문
✅ 데이터 기반 의사결정 가능
```

### 개발 측면
```
✅ 코드 유지보수성 향상
✅ 새로운 통계 추가 용이
✅ 성능 최적화 (필요한 데이터만 로드)
```

### 비즈니스 측면
```
✅ 마케팅 ROI 측정
✅ 사용자 이해도 향상
✅ 성장 전략 수립
```

---

## 📚 참고 자료

- Google Analytics 4 대시보드
- Umami Analytics 문서
- Mixpanel 사용자 분석
- Hotjar 히트맵 & 세션 리플레이
