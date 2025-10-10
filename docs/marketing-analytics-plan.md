# 종합 마케팅 통계 시스템 기획서

## 📊 시스템 검증 결과

### 사용 라이브러리 (검증 완료)

#### 1. Recharts (현재 사용 중) ✅
- **GitHub Stars**: 26,000+
- **Contributors**: 328명
- **Weekly Downloads**: 1M+
- **사용 저장소**: 788,000+
- **최신 버전**: v3.2.1 (2025년 9월)
- **유지보수 상태**: 활발 (473 open issues, 지속적 업데이트)
- **라이선스**: MIT
- **장점**:
  - React 네이티브 지원
  - 선언적 컴포넌트
  - SVG 기반 렌더링
  - 방대한 커뮤니티
  - Next.js 14 완벽 호환

#### 2. Tremor (추천 추가) ✅
- **GitHub Stars**: 3,000+
- **Contributors**: 6명
- **주요 이벤트**: 2025년 1월 22일 Vercel 인수 → 완전 오픈소스화
- **기반 기술**: Recharts + Radix UI + Tailwind CSS
- **컴포넌트 수**: 35+개
- **라이선스**: Apache 2.0
- **장점**:
  - Vercel 공식 지원 (Next.js 최적화)
  - Recharts 기반 (기존 코드와 호환)
  - 대시보드 전용 디자인
  - Tailwind CSS 통합
  - 프로덕션 레디

#### 3. 결론: 현재 Recharts 유지 + Tremor 추가 설치
```bash
npm install @tremor/react
```

---

## 🎯 마케팅 통계 확장 기획

### Phase 1: 현재 구현 상태 (✅ 완료)

#### 기본 지표
- ✅ 총 세션 수
- ✅ 평균 페이지뷰
- ✅ 평균 체류시간
- ✅ 이탈률 (Bounce Rate)
- ✅ 유입 타입 (직접/검색/SNS/기타)
- ✅ 디바이스 타입
- ✅ 상위 유입 경로
- ✅ 인기 페이지

---

### Phase 2: 고급 분석 기능 (추가 구현 필요)

#### 1. 전환 퍼널 분석 (Conversion Funnel)
**목적**: 사용자가 목표 전환까지의 경로 추적

**추적 단계**:
```
홈페이지 → 정책분석 → 상담신청 페이지 → 상담신청 완료
          ↓
     나라돈 튜브 → 영상 시청 → 회원가입
```

**측정 지표**:
- 각 단계별 전환율
- 평균 전환 소요 시간
- 단계별 이탈률
- 병목 지점 식별

**시각화**:
- Funnel Chart (깔때기형)
- Sankey Diagram (흐름도)

---

#### 2. 코호트 분석 (Cohort Analysis)
**목적**: 시간별 사용자 그룹의 행동 패턴 분석

**코호트 유형**:
- **가입일 기준**: 2025-01-01 가입 사용자의 재방문율
- **첫 유입 경로 기준**: 네이버 검색으로 유입된 사용자의 전환율
- **캠페인 기준**: UTM 캠페인별 사용자 생애가치

**측정 지표**:
- Day 1, 7, 30 재방문율
- 코호트별 평균 체류시간
- 코호트별 전환율
- 코호트별 LTV (생애가치)

**시각화**:
- Heatmap (히트맵) - 재방문율
- Line Chart - 코호트별 트렌드 비교

---

#### 3. 유지율 분석 (Retention Rate)
**목적**: 사용자가 얼마나 자주 재방문하는지 측정

**측정 방법**:
```javascript
// D1 Retention: 가입 다음 날 재방문
// D7 Retention: 가입 7일 후 재방문
// D30 Retention: 가입 30일 후 재방문
```

**세분화**:
- 첫 유입 경로별 유지율
- 디바이스별 유지율
- 초기 행동별 유지율 (첫 방문 시 3페이지 이상 본 사용자)

**시각화**:
- Retention Curve (유지율 곡선)
- Cohort Retention Matrix

---

#### 4. 시간대별 트래픽 분석
**목적**: 최적 콘텐츠 발행 시간 및 마케팅 캠페인 시간 결정

**측정 항목**:
- 시간대별 방문자 수 (0-23시)
- 요일별 방문자 수 (월-일)
- 시간대별 평균 체류시간
- 시간대별 전환율

**시각화**:
- Heatmap - 요일 × 시간대 매트릭스
- Line Chart - 시간대별 트렌드
- Bar Chart - 요일별 비교

---

#### 5. 랜딩 페이지 성능 분석
**목적**: 어떤 랜딩 페이지가 전환에 효과적인지 측정

**측정 지표**:
- 랜딩 페이지별 이탈률
- 랜딩 페이지별 평균 세션 시간
- 랜딩 페이지별 전환율
- 랜딩 페이지별 다음 페이지 이동 경로

**시각화**:
- Table - 랜딩 페이지 성과 순위
- Bar Chart - 이탈률 비교
- Sankey Diagram - 페이지 이동 경로

---

#### 6. 이탈 페이지 분석
**목적**: 사용자가 어디서 이탈하는지 파악하여 개선

**측정 지표**:
- 이탈률이 높은 페이지 Top 10
- 페이지별 평균 체류시간 (이탈 직전)
- 이탈 페이지 이전 경로

**개선 액션**:
- 이탈률 30% 이상 페이지 우선 개선
- UX 문제점 식별

**시각화**:
- Bar Chart - 이탈률 순위
- Table - 이탈 페이지 상세 정보

---

#### 7. 사용자 여정 분석 (User Journey)
**목적**: 전환한 사용자와 이탈한 사용자의 경로 비교

**측정 항목**:
- 전환 성공 사용자의 평균 페이지 경로
- 이탈 사용자의 공통 경로
- 경로별 평균 전환 시간

**시각화**:
- Sankey Diagram - 페이지 흐름
- Path Analysis Visualization

---

#### 8. UTM 캠페인 성과 분석
**목적**: 마케팅 캠페인 ROI 측정

**현재 수집 중인 데이터**:
- utm_source (출처: naver, google, facebook 등)
- utm_medium (매체: cpc, social, email 등)
- utm_campaign (캠페인명)

**측정 지표**:
- 캠페인별 세션 수
- 캠페인별 전환율
- 캠페인별 평균 체류시간
- 캠페인별 ROI

**시각화**:
- Table - 캠페인 성과 비교
- Pie Chart - 캠페인별 트래픽 점유율
- Bar Chart - 캠페인별 전환율

---

#### 9. 실시간 대시보드
**목적**: 현재 진행 중인 트래픽 및 사용자 행동 실시간 모니터링

**실시간 지표**:
- 현재 접속자 수
- 최근 10분간 페이지뷰
- 실시간 유입 경로
- 실시간 전환 이벤트

**시각화**:
- Live Counter - 현재 접속자
- Real-time Chart - 최근 활동
- Live Feed - 최근 이벤트 목록

---

#### 10. A/B 테스트 결과 대시보드
**목적**: 실험 결과를 데이터 기반으로 비교

**측정 지표**:
- 실험군 vs 대조군 전환율
- 통계적 유의성 (p-value)
- 실험군/대조군 평균 체류시간

---

### Phase 3: 데이터베이스 스키마 확장

#### 추가 필요 컬렉션

```typescript
// 1. conversions (전환 이벤트)
{
  sessionId: string;
  userId?: string;
  conversionType: 'consultation' | 'signup' | 'video_watch' | 'policy_view';
  timestamp: Date;
  value?: number; // 전환 가치
  funnelSteps: string[]; // 거쳐온 경로
}

// 2. user-sessions (사용자 세션 상세)
{
  sessionId: string;
  userId?: string;
  firstVisit: Date;
  lastVisit: Date;
  totalPageViews: number;
  totalTimeSpent: number;
  isConverted: boolean;
  conversionEvents: ObjectId[];
  cohortDate: Date; // 코호트 분석용
}

// 3. campaign-performance (캠페인 성과)
{
  campaignId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  totalSessions: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  date: Date;
}
```

---

## 🎨 시각화 컴포넌트 설계

### Tremor 컴포넌트 활용

#### 1. 대시보드 레이아웃
```tsx
import { Card, Grid, Title, Text } from '@tremor/react';

// 4열 그리드 레이아웃
<Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
  <Card>
    {/* 세션 수 */}
  </Card>
  <Card>
    {/* 전환율 */}
  </Card>
  <Card>
    {/* 유지율 */}
  </Card>
  <Card>
    {/* 평균 체류시간 */}
  </Card>
</Grid>
```

#### 2. 전환 퍼널
```tsx
import { BarList } from '@tremor/react';

const funnelData = [
  { name: '홈페이지 방문', value: 1000 },
  { name: '정책분석 조회', value: 650 },
  { name: '상담신청 페이지', value: 320 },
  { name: '상담신청 완료', value: 85 },
];

<BarList data={funnelData} />
```

#### 3. 코호트 히트맵
```tsx
// Recharts의 Scatter + Tremor Card 조합
import { Card, Title } from '@tremor/react';
import { ScatterChart, Scatter, XAxis, YAxis } from 'recharts';

<Card>
  <Title>코호트 재방문율 히트맵</Title>
  <ScatterChart>
    {/* 코호트 데이터 */}
  </ScatterChart>
</Card>
```

#### 4. 실시간 대시보드
```tsx
import { Badge, Metric, Text } from '@tremor/react';

<Card>
  <Text>현재 접속자</Text>
  <Metric>42</Metric>
  <Badge color="green">Live</Badge>
</Card>
```

#### 5. 캠페인 성과 테이블
```tsx
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';

<Table>
  <TableHead>
    <TableRow>
      <TableHeaderCell>캠페인</TableHeaderCell>
      <TableHeaderCell>세션</TableHeaderCell>
      <TableHeaderCell>전환율</TableHeaderCell>
      <TableHeaderCell>ROI</TableHeaderCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {campaigns.map(campaign => (
      <TableRow key={campaign.id}>
        <TableCell>{campaign.name}</TableCell>
        <TableCell>{campaign.sessions}</TableCell>
        <TableCell>{campaign.conversionRate}%</TableCell>
        <TableCell>{campaign.roi}%</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 📋 구현 우선순위

### High Priority (즉시 구현)
1. ✅ 기본 마케팅 통계 (완료)
2. 🔄 전환 퍼널 분석
3. 🔄 UTM 캠페인 성과 분석
4. 🔄 시간대별 트래픽 분석

### Medium Priority (2주 내)
5. 랜딩 페이지 성능 분석
6. 이탈 페이지 분석
7. 사용자 여정 분석

### Low Priority (1개월 내)
8. 코호트 분석
9. 유지율 분석
10. 실시간 대시보드

---

## 🚀 실행 계획

### Step 1: Tremor 설치 및 설정
```bash
npm install @tremor/react
```

### Step 2: 전환 이벤트 추적 코드 추가
```typescript
// src/lib/analytics.ts
export async function trackConversion(
  conversionType: string,
  sessionId: string,
  value?: number
) {
  await fetch('/api/track-conversion', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      conversionType,
      value,
      timestamp: new Date(),
    }),
  });
}
```

### Step 3: 대시보드 페이지 생성
```
app/admin/analytics/
├── page.tsx           (메인 대시보드)
├── funnel/
│   └── page.tsx      (전환 퍼널)
├── cohorts/
│   └── page.tsx      (코호트 분석)
├── campaigns/
│   └── page.tsx      (캠페인 성과)
└── realtime/
    └── page.tsx      (실시간 대시보드)
```

### Step 4: API 엔드포인트 추가
```
app/api/analytics/
├── funnel/route.ts
├── cohorts/route.ts
├── campaigns/route.ts
├── retention/route.ts
└── realtime/route.ts
```

---

## 📊 예상 데이터 구조

### MongoDB 컬렉션 크기 예상

**현재 데이터 (1개월 기준)**:
- page-visits: ~10,000 documents
- 용량: ~5MB

**확장 후 예상**:
- page-visits: ~10,000 docs/월
- user-sessions: ~3,000 docs/월
- conversions: ~500 docs/월
- campaign-performance: ~100 docs/월
- **총 예상 용량**: ~10MB/월

**1년 데이터**: ~120MB
**Atlas Free Tier**: 512MB (충분함)

---

## 🎯 성공 지표

### 기술적 성공 지표
- [ ] Lighthouse Performance Score > 90
- [ ] 대시보드 로딩 시간 < 2초
- [ ] 차트 렌더링 시간 < 500ms
- [ ] MongoDB 쿼리 시간 < 100ms

### 비즈니스 성공 지표
- [ ] 관리자 대시보드 사용 빈도 (주 3회 이상)
- [ ] 데이터 기반 의사결정 증가
- [ ] 전환율 개선 (A/B 테스트 기반)
- [ ] 마케팅 ROI 추적 가능

---

## 🔒 보안 및 성능 고려사항

### 보안
- 관리자 권한 체크 강화
- API Rate Limiting 적용
- 개인정보 마스킹 (IP 주소 등)

### 성능
- MongoDB 인덱스 최적화
- 데이터 집계 캐싱 (Redis)
- 대시보드 컴포넌트 Code Splitting
- 차트 데이터 Pagination

---

## 📚 참고 자료

- [Recharts Documentation](https://recharts.org/)
- [Tremor Documentation](https://tremor.so/)
- [Marketing Funnel KPIs Guide](https://userpilot.com/blog/marketing-funnel-kpis/)
- [Cohort Analysis Best Practices](https://clevertap.com/blog/cohort-analysis/)

---

**작성일**: 2025-10-10
**작성자**: Claude Code
**버전**: 1.0
**상태**: 검토 대기 중
