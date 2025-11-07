# 나라똔 SEO 최적화 가이드

**최종 업데이트**: 2025-11-07
**작성자**: Claude
**목적**: 나라똔 홈페이지의 검색 엔진 최적화 완벽 가이드

---

## 📊 현재 SEO 상태 (2025-11-07)

### ✅ 완료된 SEO 설정

#### 1. 메타 태그 (`app/layout.tsx`)
```typescript
- title: "나라똔(NARADDON) - 정부정책자금 전문 컨설팅"
- description: 450자 상세 설명
- keywords: 정책자금, 정부지원금, 중소기업지원 등
- Open Graph (Facebook/카카오톡 공유)
- Twitter Card
- robots: index=true, follow=true
```

#### 2. Sitemap (`app/sitemap.ts`)
**동적 생성**: 빌드 시 자동으로 모든 페이지 포함

포함된 페이지 (총 600+ 페이지):
- 정적 페이지: 홈, 상담신청, 인증심사관 등
- 정책 뉴스: 500개
- 정책 분석: 500개
- 인증심사관 상세: 50+ 페이지
- 똔톡/묻고답하기: 500개

**URL**: `https://naraddon.com/sitemap.xml`

#### 3. robots.txt (`public/robots.txt`)
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# 한국 검색엔진
User-agent: Yeti (Naver)
User-agent: NaverBot
User-agent: Daumoa
```

#### 4. 구조화된 데이터 (JSON-LD)
```json
- Organization Schema: 회사 정보
- Person Schema: 인증심사관 프로필 (추가 가능)
- Article Schema: 정책 뉴스/분석 (추가 가능)
- Service Schema: 제공 서비스 (추가 가능)
```

---

## 🚀 Search Console 등록 가이드

### 1. Google Search Console

#### 1단계: 사이트 등록
1. https://search.google.com/search-console 접속
2. "속성 추가" → "URL 접두어" 선택
3. `https://naraddon.com` 입력

#### 2단계: 소유권 확인
**방법 1: HTML 태그 (권장)**
```html
<!-- app/layout.tsx의 <head>에 추가 -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
```

**방법 2: HTML 파일**
```bash
# Google이 제공한 파일을 public/ 폴더에 저장
# 예: google1234567890abcdef.html
```

#### 3단계: Sitemap 제출
1. Search Console → "Sitemaps" 메뉴
2. `https://naraddon.com/sitemap.xml` 입력
3. "제출" 클릭

**예상 결과**:
- 24시간 내: Sitemap 처리 시작
- 1주일 내: 주요 페이지 색인
- 2주일 내: 모든 페이지 색인

---

### 2. Naver Search Advisor

#### 1단계: 사이트 등록
1. https://searchadvisor.naver.com 접속
2. "웹마스터 도구" → "사이트 등록"
3. `https://naraddon.com` 입력

#### 2단계: 소유권 확인
**방법 1: HTML 태그**
```html
<!-- app/layout.tsx의 <head>에 추가 -->
<meta name="naver-site-verification" content="YOUR_VERIFICATION_CODE" />
```

**방법 2: HTML 파일**
```bash
# Naver가 제공한 파일을 public/ 폴더에 저장
# 예: naver1234567890abcdef.html
```

#### 3단계: Sitemap 제출
1. Search Advisor → "요청" → "사이트맵 제출"
2. `https://naraddon.com/sitemap.xml` 입력
3. "확인" 클릭

**예상 결과**:
- 24시간 내: Sitemap 처리 시작
- 3일 내: 주요 페이지 색인
- 1주일 내: 모든 페이지 색인

---

## 📈 SEO 개선 체크리스트

### 즉시 실행 (필수)
- [x] Sitemap에 인증심사관 페이지 추가
- [x] JSON-LD 유틸리티 함수 생성
- [x] 정부정책자금 관련 키워드 확장 (40+ 키워드)
- [ ] Google Search Console 등록
- [ ] Naver Search Advisor 등록
- [ ] 인증 코드를 `app/layout.tsx`에 추가

### 단기 (이번 주)
- [ ] 각 페이지 메타 태그 최적화
  - [ ] `/certified-examiners` - "인증 기업심사관" 키워드
  - [ ] `/policy-analysis` - "정책 분석" 키워드
  - [ ] `/business-voice` - "기업의 소리" 키워드
- [ ] Open Graph 이미지 생성 (1200x630px)
- [ ] Twitter Card 이미지 생성 (1200x675px)

### 중기 (이번 달)
- [ ] 인증심사관 상세 페이지에 Person Schema 추가
- [ ] 정책 분석 페이지에 Article Schema 추가
- [ ] FAQ 페이지 생성 + FAQ Schema 추가
- [ ] Canonical URL 설정 (중복 콘텐츠 방지)

### 장기 (분기)
- [ ] Core Web Vitals 개선 (LCP, FID, CLS)
- [ ] 모바일 최적화 점검
- [ ] 페이지 속도 개선
- [ ] 구조화된 데이터 확장 (BreadcrumbList 등)

---

## 🔍 주요 키워드 전략

### 1차 키워드 (매우 중요) - 정부정책자금 관련
```
- 정부정책자금
- 정부지원자금
- 정부지원금
- 정부보조금
- 정책자금
- 정책지원금
```

### 2차 키워드 (중요) - 중소기업 및 전문 분야
```
- 중소기업정책자금
- 중소기업지원자금
- 중소기업지원금
- 중소기업보조금
- 중소벤처기업부지원금
- R&D지원금
- R&D정책자금
- 기술개발지원금
- 연구개발지원금
- 수출지원금
- 수출바우처
- 무역지원금
- 창업지원금
- 창업자금
- 청년창업지원금
```

### 3차 키워드 (브랜드 및 서비스)
```
- 나라똔
- NARADDON
- 기업심사관
- 인증기업심사관
- 정책자금컨설팅
- 정책자금신청
- 사업자대출
- 기업운영자금
- 시설투자자금
```

### 롱테일 키워드 (상세 페이지용)
```
- "정책자금 신청 방법"
- "중소기업 R&D 지원금 받는 법"
- "수출 바우처 사용 가이드"
- "인증 기업심사관 추천"
```

---

## 📊 검색 순위 모니터링

### 주간 점검 사항
1. **Google Search Console**
   - 클릭 수
   - 노출 수
   - 평균 CTR
   - 평균 순위

2. **Naver Search Advisor**
   - 유입 키워드
   - 검색 노출
   - 사이트 오류

3. **핵심 지표**
   - "나라똔" 검색 시 순위
   - "정책자금 컨설팅" 검색 시 순위
   - 인증심사관 페이지 색인 여부

---

## 🎯 SEO 성공 지표

### 단기 목표 (1개월)
- [ ] Google 색인: 500+ 페이지
- [ ] Naver 색인: 500+ 페이지
- [ ] "나라똔" 검색 1위
- [ ] 월간 자연 유입: 1,000+ 방문

### 중기 목표 (3개월)
- [ ] "정책자금 컨설팅" 검색 1페이지
- [ ] 월간 자연 유입: 5,000+ 방문
- [ ] 주요 키워드 10개 1페이지 진입

### 장기 목표 (6개월)
- [ ] 월간 자연 유입: 10,000+ 방문
- [ ] Core Web Vitals 점수: 90+ 점
- [ ] 주요 키워드 50개 1페이지 진입

---

## 🛠️ SEO 관련 파일 위치

### 주요 파일
```
app/
├── layout.tsx              # 메타 태그, JSON-LD
├── sitemap.ts              # 동적 sitemap 생성
└── robots.txt              # robots.txt 설정 (자동)

public/
├── robots.txt              # robots.txt 파일
└── sitemap.xml             # sitemap (빌드 시 자동 생성)

src/lib/
└── json-ld.ts              # JSON-LD 유틸리티
```

### 환경 변수
```bash
# .env.local (Search Console 인증 코드)
NEXT_PUBLIC_GOOGLE_VERIFICATION=your_code
NEXT_PUBLIC_NAVER_VERIFICATION=your_code
```

---

## 📚 참고 자료

### 공식 문서
- [Google Search Central](https://developers.google.com/search)
- [Naver Search Advisor 가이드](https://searchadvisor.naver.com/guide)
- [Schema.org 한국어](https://schema.org/docs/gs.html)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

### SEO 도구
- [Google Search Console](https://search.google.com/search-console)
- [Naver Search Advisor](https://searchadvisor.naver.com)
- [Lighthouse](https://pagespeed.web.dev/)
- [Schema Markup Validator](https://validator.schema.org/)

---

## 🚨 주의사항

### 하지 말아야 할 것
- ❌ 키워드 반복 (Keyword Stuffing)
- ❌ 숨겨진 텍스트 (Hidden Text)
- ❌ 중복 콘텐츠 (Duplicate Content)
- ❌ 링크 매매 (Link Buying)
- ❌ 클로킹 (Cloaking)

### 해야 할 것
- ✅ 자연스러운 키워드 사용
- ✅ 고품질 콘텐츠 생성
- ✅ 모바일 최적화
- ✅ 페이지 속도 개선
- ✅ 사용자 경험 개선

---

## 🔄 업데이트 히스토리

### 2025-11-07
- ✅ Sitemap에 인증심사관 페이지 추가 (600+ 페이지)
- ✅ JSON-LD 유틸리티 함수 생성
- ✅ SEO 가이드 문서 작성
- ✅ 정부정책자금 관련 키워드 40+ 개 확장 적용
  - 정부정책자금, 정부지원자금, 정부지원금, 정부보조금
  - 중소기업정책자금, 중소기업지원자금, 중소벤처기업부지원금
  - R&D지원금, 기술개발지원금, 연구개발지원금
  - 수출지원금, 무역지원금, 해외진출지원금
  - 창업지원금, 청년창업지원금
  - 인증기업심사관, 정책자금컨설팅

### TODO
- [ ] Google/Naver Search Console 인증
- [ ] 각 페이지 메타 태그 최적화
- [ ] Open Graph 이미지 생성

---

**문서 끝**
