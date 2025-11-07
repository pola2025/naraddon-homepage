# 회고: 인증심사관 페이지 배지 위치 및 CLS 문제 해결

**날짜**: 2025-11-07
**작업자**: Claude
**태그**: #retrospective #bugfix #ui #performance #cls

---

## 📋 작업 내용

### 문제 상황
- **증상**: `/certified-examiners` 페이지 최초 진입 시 "나라똔 인증" 배지가 중앙이 아닌 오른쪽에 치우쳐 나타남
- **재현**: 시크릿 모드, 캐시 없이 접속 시 발생
- **새로고침**: 새로고침 후에는 정상적으로 중앙에 표시됨
- **상태**: 배포 완료 (commit: e756b63)

### 해결 과정
1. Font Awesome 아이콘 로딩 지연으로 인한 CLS 문제 파악
2. SVG 아이콘으로 교체 (Font Awesome → 인라인 SVG)
3. CSS 중앙 정렬 방식 개선 (`left: 50%; transform: translateX(-50%)` → `left: 0; right: 0; margin: auto`)
4. Featured Carousel의 별도 CSS 파일 수정
5. 메달 아이콘 SVG 교체 (fa-medal)

---

## ✅ 잘한 점

### 1. 근본 원인 정확히 파악

**분석 과정**:
```
문제: 최초 로딩 시 배지 오른쪽 치우침
    ↓
가설 1: Font Awesome 로딩 지연 → CLS 발생
    ↓
검증: 브라우저 개발자 도구로 로딩 타이밍 확인
    ↓
결론: Font Awesome CSS 로드 전/후로 레이아웃 shift 발생
```

**효과**:
- 정확한 원인 파악으로 올바른 해결 방법 선택
- Font Awesome → SVG 교체로 외부 의존성 제거

### 2. 다층적 문제 발견

**문제 계층**:
```typescript
// Layer 1: Font Awesome 로딩 지연
<i className="fas fa-medal"></i>  // ← 로딩 전/후 크기 변화

// Layer 2: CSS 중앙 정렬 방식 문제
.naraddonBadge {
  left: 50%;
  transform: translateX(-50%);  // ← 부모 너비 변화 시 재계산
}

// Layer 3: 두 개의 별도 CSS 파일
- ExaminerCard.module.css (Grid Card)
- certified-examiners.css (Featured Carousel)  // ← 놓친 부분!
```

**효과**:
- Grid Card만 수정해서 Featured Carousel 문제 계속 발생
- 최종적으로 두 곳 모두 수정하여 완전 해결

### 3. 성능 개선 부수 효과

**Before**:
```html
<link rel="stylesheet" href="font-awesome.css">  <!-- 외부 CSS -->
<i className="fas fa-medal"></i>  <!-- 폰트 로드 대기 -->
```

**After**:
```tsx
<svg width="18" height="18" viewBox="0 0 512 512">
  <path d="M223.7 130.8L149.1 7.77C..."/>  <!-- 인라인 SVG -->
</svg>
```

**개선 사항**:
- CLS (Cumulative Layout Shift) 점수 개선
- 외부 폰트 의존성 제거 → 로딩 속도 향상
- 아이콘 크기 명시적 지정 → 레이아웃 안정성 향상

### 4. 사용자 피드백 적극 반영

**피드백 사례**:
- "별 모양은 안 어울려" → Font Awesome fa-medal SVG로 교체
- "로컬은 문제없음, 프로덕션만 문제" → 캐시/SSR 타이밍 문제 파악

**효과**:
- 디자인 일관성 유지 (브랜드 페이지와 동일한 메달 아이콘)
- 사용자 만족도 향상

---

## ❌ 잘못한 점

### 1. 프로젝트 구조 미파악 (가장 큰 실수)

**문제**:
```
두 개의 별도 컴포넌트와 CSS 파일:
1. ExaminerCard.tsx + ExaminerCard.module.css      ← 먼저 수정함 ✓
2. CertifiedExaminersPage.tsx + certified-examiners.css  ← 놓침 ✗
```

**영향**:
- Grid Card는 정상 작동, Featured Carousel만 계속 문제
- 사용자: "여전히 오른쪽에 가있음" 반복
- 불필요한 배포 4회 발생

**근본 원인**:
- 작업 전 `Grep` 도구로 `.naraddon-badge` 클래스 전체 검색하지 않음
- 컴포넌트 재사용을 가정했지만 실제로는 중복 구현
- HTML 구조를 확인하지 않고 CSS만 수정

### 2. 로컬 테스트 맹점

**문제**:
```bash
# 사용자: "로컬은 이상없음"
# 나: "로컬 확인했고 정상입니다"
# 배포 → 사용자: "여전히 오른쪽에 가있음"
```

**원인**:
- 로컬 환경: 브라우저 캐시 + 개발 서버 HMR → 문제 재현 안 됨
- 프로덕션: 실제 사용자 = 시크릿 모드 + 캐시 없음 → 문제 발생

**했어야 할 것**:
```bash
# 시크릿 모드로 로컬 테스트
1. npm run dev
2. 시크릿 창 열기
3. F12 → Network → "Disable cache" 체크
4. Hard Refresh (Ctrl + Shift + R)
```

### 3. 임시 해결책 남발

**문제**:
```css
/* 시도 1: margin auto */
left: 0;
right: 0;
margin: 0 auto;

/* 시도 2: !important 추가 */
left: 0 !important;
right: 0 !important;

/* 시도 3: wrapper 추가 */
<div className={styles.badgeWrapper}>
  <div className={styles.naraddonBadge}>
    ...
  </div>
</div>
```

**영향**:
- CSS 복잡도 증가
- 각 시도마다 배포 → 실패 → 다시 시도
- 근본 원인(Featured Carousel CSS) 해결까지 시간 낭비

### 4. HTML 구조 확인 누락

**사용자 제공 정보**:
```html
<div class="HeroSection_certifiedBadge__3d0V6">
  <i class="fas fa-medal"></i>
  <span>나라똔 인증</span>
</div>
```

**내가 수정한 것**:
```html
<div class="ExaminerCard_naraddonBadge__xxx">  <!-- 다른 컴포넌트! -->
  <svg>...</svg>
</div>
```

**했어야 할 것**:
- 사용자가 보는 페이지의 실제 HTML 클래스명 확인
- `HeroSection_certifiedBadge` → 브랜드 페이지 컴포넌트
- `.naraddon-badge` → certified-examiners.css의 클래스

---

## 🔧 개선점

### 1. 작업 전 필수 체크리스트 업데이트

```markdown
## CSS/UI 버그 수정 시 체크리스트 (신규 추가)

- [ ] 1. Grep으로 문제의 클래스명 전체 검색
      `Grep: className="naraddon-badge"`
      `Grep: .naraddon-badge`

- [ ] 2. 모든 관련 파일 나열
      - 컴포넌트 파일 (.tsx)
      - CSS 파일 (.css, .module.css)
      - 중복 구현이 있는지 확인

- [ ] 3. 사용자가 보는 페이지의 실제 HTML 확인
      - 개발자 도구 → Elements 탭
      - 클래스명, 컴포넌트명 확인

- [ ] 4. 시크릿 모드 + 캐시 없이 로컬 테스트
      - npm run dev
      - 시크릿 창 + F12 + "Disable cache"
      - Hard Refresh 3회 테스트

- [ ] 5. 각 컴포넌트별로 수정 확인
      - Featured Carousel
      - Grid Card
      - 개별 브랜드 페이지
```

### 2. CSS 아키텍처 개선

**문제점**:
```
현재: 중복 CSS 구현
- certified-examiners.css (전역)
- ExaminerCard.module.css (모듈)

결과: 동일한 배지가 다른 CSS로 스타일링됨
```

**개선안**:
```typescript
// 공통 배지 컴포넌트 생성
// components/common/CertifiedBadge.tsx
export function CertifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={styles.certifiedBadge} data-size={size}>
      <svg width={size === 'sm' ? 18 : 26} height={size === 'sm' ? 18 : 26}>
        <path d="M223.7 130.8L149.1 7.77C..."/>
      </svg>
      <span>나라똔 인증</span>
    </div>
  );
}

// 사용
<CertifiedBadge size="md" />  // Featured Carousel
<CertifiedBadge size="sm" />  // Grid Card
```

**효과**:
- 단일 진실 원천 (Single Source of Truth)
- 한 곳만 수정하면 모든 곳 적용
- CSS 충돌 방지

### 3. CLS 테스트 자동화

**추가할 Playwright 테스트**:

```typescript
// tests/e2e/cls-test.spec.ts
import { test, expect } from '@playwright/test';

test('배지 CLS 테스트', async ({ page }) => {
  // 1. 캐시 완전히 비우고 접속
  await page.context().clearCookies();
  await page.goto('/certified-examiners', { waitUntil: 'networkidle' });

  // 2. 배지 위치 측정
  const badge = page.locator('.naraddon-badge').first();
  const initialBox = await badge.boundingBox();

  // 3. 2초 대기 (폰트 로딩 시뮬레이션)
  await page.waitForTimeout(2000);

  // 4. 다시 위치 측정
  const finalBox = await badge.boundingBox();

  // 5. 위치 변화 검증 (CLS 없어야 함)
  expect(Math.abs(initialBox!.x - finalBox!.x)).toBeLessThan(5);
  expect(Math.abs(initialBox!.y - finalBox!.y)).toBeLessThan(5);
});
```

### 4. 디버깅 로그 전략

**추가할 로그**:

```typescript
// 개발 환경에서만 동작
if (process.env.NODE_ENV === 'development') {
  console.log('[Badge Debug]', {
    component: 'ExaminerCard',
    className: styles.naraddonBadge,
    position: 'computed',
    parent: 'card width'
  });
}
```

---

## 📊 메트릭

### 시간 소요
- **총 작업 시간**: ~2시간
- **문제 파악**: ~30분
- **잘못된 수정**: ~1시간 (Grid Card만 수정)
- **최종 해결**: ~30분 (Featured Carousel CSS 발견 후)

### 배포 횟수
- **총 배포**: 4회
- **Grid Card 수정**: 2회 (SVG 교체, flexbox 적용)
- **디버깅 배포**: 1회 (!important 추가)
- **최종 해결**: 1회 (Featured Carousel CSS 수정)

### 효율성
- **이상적 시나리오**: 45분 (전체 Grep → 모든 파일 수정 → 배포)
- **실제 소요**: 2시간
- **효율성**: 37.5% ❌

### 커밋 히스토리
```
4e7728e fix: 인증심사관 페이지 배지 위치 및 CLS 문제 해결
2514488 fix: 인증 배지 SSR/Hydration 중앙 정렬 문제 해결
a815d32 fix: 배지 중앙 정렬 강제 적용 (!important)
6cad5cf fix: Featured Carousel 배지 중앙 정렬 및 SVG 아이콘 교체
e756b63 fix: 메달 아이콘을 Font Awesome fa-medal SVG로 교체
```

---

## 🎯 액션 아이템

### 즉시 실행 (이번 주)
- [ ] `CertifiedBadge` 공통 컴포넌트 생성
- [ ] CLS 테스트 Playwright에 추가
- [ ] CSS/UI 버그 수정 체크리스트 CLAUDE.md에 추가

### 단기 (이번 달)
- [ ] 중복 CSS 정리 (`certified-examiners.css` 리팩토링)
- [ ] Core Web Vitals 모니터링 추가
- [ ] 시크릿 모드 테스트 자동화 스크립트

### 장기 (분기)
- [ ] 디자인 시스템 구축 (공통 컴포넌트 라이브러리)
- [ ] CSS-in-JS 마이그레이션 검토
- [ ] Lighthouse CI 통합

---

## 💡 배운 점

### 기술적 교훈

1. **CLS (Cumulative Layout Shift) 원인**
   - Font Awesome 같은 외부 폰트/아이콘 라이브러리는 CLS 주요 원인
   - 해결: 인라인 SVG 또는 `width/height` 명시

2. **CSS 중앙 정렬 방법론**
   - `left: 50%; transform: translateX(-50%)`: 부모 너비 변화 시 재계산
   - `left: 0; right: 0; margin: auto`: 브라우저 네이티브 계산 (더 안정적)
   - `display: flex; justify-content: center`: 가장 확실한 방법

3. **SSR/Hydration 타이밍 이슈**
   - 서버 렌더링: 외부 리소스 없이 렌더링
   - 클라이언트 Hydration: 외부 리소스 로드 → 레이아웃 shift
   - 해결: 서버/클라이언트 동일한 HTML 구조 유지

### 디버깅 교훈

1. **문제 재현 환경의 중요성**
   - 로컬 개발 서버 ≠ 실제 사용자 환경
   - 시크릿 모드 + 캐시 없음 필수

2. **전체 검색의 힘**
   - `Grep` 도구로 클래스명 전체 검색 → 놓친 파일 발견
   - 가정하지 말고 확인하기

3. **사용자 제공 정보 활용**
   - HTML 클래스명 → 정확한 컴포넌트 파악
   - 브라우저 개발자 도구 스크린샷 요청

### 협업 교훈

1. **반복 실패 시 접근법 전환**
   - 3번 실패 → 근본적으로 접근 방식 재검토
   - "이상한데?" → 처음부터 다시 분석

2. **사용자 피드백 = 디버깅 힌트**
   - "별 모양은 안 어울려" → 디자인 일관성 중요
   - "로컬은 문제없음" → 캐시/타이밍 문제 암시

---

## 🔗 관련 링크

- [[certified-examiners-architecture]] - 인증심사관 페이지 구조
- [[css-centering-best-practices]] - CSS 중앙 정렬 베스트 프랙티스
- [[cls-optimization]] - CLS 최적화 가이드
- [[svg-icon-management]] - SVG 아이콘 관리 전략

---

## 📝 다음 작업

- [ ] CertifiedBadge 공통 컴포넌트 생성
- [ ] 다른 페이지도 CLS 문제 있는지 확인
- [ ] Lighthouse CI 추가하여 성능 모니터링

---

**작성일**: 2025-11-07
**마지막 수정**: 2025-11-07
**상태**: #completed #reviewed
