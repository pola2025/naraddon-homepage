# 심사관 브랜드 페이지 기능 가이드

## 개요

심사관 브랜드 페이지는 전문가 심사관들이 자신의 전문성과 회사 정보를 홍보할 수 있는 개인 랜딩 페이지입니다.

## 주요 기능

### 1. 브랜드 페이지 구성

- **히어로 섹션**: 심사관 프로필 이미지, 이름, 회사명, 전문 분야
- **회사소개 탭**: 회사 로고, 소개글, 연락처 정보
- **경력 탭**: 경력 사항 타임라인
- **성공 케이스 탭**: 프로젝트 성공 사례
- **정책분석 탭**: 작성한 정책분석 글 목록 (자동 활성화/비활성화)

### 2. 심사관 카드 "자세히보기" 버튼

#### 환경변수 설정

`.env.local` 파일에 다음 환경변수를 추가하세요:

```bash
# Feature Flags
# 심사관 브랜드 페이지 "자세히보기" 버튼 활성화
NEXT_PUBLIC_ENABLE_BRAND_PAGE=true
```

#### 환경별 설정 가이드

**개발 환경 (로컬 테스트)**
```bash
# .env.local
NEXT_PUBLIC_ENABLE_BRAND_PAGE=true
```

**프로덕션 환경 (Vercel 배포)**
- Vercel Dashboard → Settings → Environment Variables
- `NEXT_PUBLIC_ENABLE_BRAND_PAGE` = `true` 설정
- Production, Preview, Development 환경 선택
- 배포 후 자동 반영

#### 동작 방식

- `NEXT_PUBLIC_ENABLE_BRAND_PAGE=true`: "자세히보기" 버튼 표시
- `NEXT_PUBLIC_ENABLE_BRAND_PAGE=false` 또는 미설정: 버튼 숨김

### 3. 심사관 대시보드

심사관이 로그인하면 다음 기능을 사용할 수 있습니다:

- **브랜드 페이지 보기**: 자신의 공개 브랜드 페이지로 이동
- **상담 관리**: 접수된 상담 신청 확인

### 4. 관리자 기능

관리자는 다음 작업을 수행할 수 있습니다:

- **심사관 목록 조회**: 전체 심사관 목록 및 상태 확인
- **브랜드 페이지 완성도 체크**: 녹색 체크 아이콘으로 내용 작성 여부 표시
- **브랜드 페이지 미리보기**: 각 심사관의 브랜드 페이지 바로가기

#### 브랜드 페이지 완성도 기준

다음 항목 중 하나라도 작성되면 "완성" 표시:
- 회사 로고
- 회사 소개글 (기본 템플릿 제외)
- 경력 사항 (1개 이상)
- 성공 케이스 (1개 이상)
- 웹사이트 URL
- 상담 가능 시간
- 주소

## 디자인 특징

### 다크 골드 테마

- **배경**: 다크 그레이 (#1a1a1a)
- **강조 색상**: 골드 (#D4AF37)
- **텍스트**: 크림 화이트 (#e8e0d5)

### 애니메이션 효과

- **마우스 트래킹 스포트라이트**: 카드에 마우스를 올리면 골드 하이라이트
- **글로우 효과**: 호버 시 골드 빛 확산
- **부드러운 전환**: cubic-bezier를 활용한 자연스러운 애니메이션

### 반응형 디자인

- **데스크톱**: 풀 애니메이션 효과
- **모바일**: 성능 최적화를 위해 일부 효과 비활성화

## API 엔드포인트

### 브랜드 페이지 조회
```
GET /api/certified-examiners/[id]
```

**응답 예시:**
```json
{
  "_id": "68cdedb5b68fa1c109f89315",
  "name": "백경우",
  "companyName": "주식회사 나라똔",
  "position": "대표",
  "category": "funding",
  "specialties": ["정책자금", "기업인증"],
  "imageUrl": "https://pub-xxx.r2.dev/examiners/baek-kyung-woo.png",
  "brandPage": {
    "companyLogo": "...",
    "companyIntro": "...",
    "careers": [...],
    "successCases": [...],
    "contactInfo": {...}
  },
  "policyAnalysisCount": 5
}
```

### 심사관 목록 조회 (관리자)
```
GET /api/admin/examiners
```

**응답 필드:**
- `hasBrandPageContent`: 브랜드 페이지 내용 작성 여부 (boolean)
- `email`: 심사관 이메일 (users 컬렉션 조인)

## 상담 신청 기능

### 상담 신청 폼

위치: `/consultation-request`

**필수 입력 항목:**
- 이름/회사명
- 휴대전화
- 지역
- 상담 희망 시간
- 상담 유형
- 연 매출 규모
- 직원 수
- 희망 상담 시기
- 개인정보 수집 동의

**선택 입력 항목:**
- 이메일
- 사업자등록번호
- 상담 요청 내용
- 마케팅 수신 동의

### API 엔드포인트

```
POST /api/consultations
```

**요청 바디:**
```json
{
  "userName": "홍길동",
  "userPhone": "010-1234-5678",
  "userEmail": "user@example.com",
  "companyName": "나라똔",
  "businessNumber": "123-45-67890",
  "consultationType": "policy-fund",
  "message": "정책자금 상담 요청합니다.",
  "preferredTime": "within-week",
  "annualRevenue": "1-3billion",
  "employeeCount": "10-30",
  "desiredTime": "평일 오후 2시 이후",
  "region": "서울 강남구",
  "privacyConsent": true,
  "marketingConsent": false,
  "isAuditorConsultation": true
}
```

**응답:**
- 성공: 200 OK
- 실패: 400/500 에러

### 상담 신청 흐름

1. 사용자가 폼 작성
2. 클라이언트 측 유효성 검사
3. `/api/consultations` POST 요청
4. MongoDB `consultations` 컬렉션에 저장
5. 웰컴 이메일 발송 (Google Apps Script Webhook)
6. 관리자 알림 발송
7. 성공 메시지 표시

## 문제 해결

### "자세히보기" 버튼이 보이지 않아요

1. `.env.local` 파일 확인:
   ```bash
   NEXT_PUBLIC_ENABLE_BRAND_PAGE=true
   ```

2. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

3. 환경변수가 브라우저에 노출되는지 확인:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_ENABLE_BRAND_PAGE)
   ```

### 브랜드 페이지가 404 에러

1. 심사관 `_id`가 올바른지 확인
2. MongoDB에서 해당 심사관 데이터 존재 확인
3. `isPublished: true` 상태 확인

### 정책분석 탭이 보이지 않아요

정책분석 탭은 해당 심사관이 작성한 정책분석 글이 있을 때만 활성화됩니다.

1. `PolicyAnalysisPost` 컬렉션에 해당 심사관의 글 존재 여부 확인
2. `examiner.legacyKey` 필드가 정확한지 확인
3. `policyAnalysisCount > 0` 확인

## 추가 참고 자료

- [Next.js 환경변수 문서](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel 환경변수 설정](https://vercel.com/docs/concepts/projects/environment-variables)
- [MongoDB 쿼리 최적화](https://www.mongodb.com/docs/manual/core/query-optimization/)

---

**최종 업데이트**: 2025-10-23
**작성자**: Claude (AI Assistant)
