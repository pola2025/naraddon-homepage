# 트러블슈팅: 브랜드 페이지 헤더 아래 흰색 배경 문제

## 📅 타임라인
- **발생일**: 2025-10-27
- **해결일**: 2025-10-27
- **소요시간**: 약 2시간

## 🔍 문제 상황

### 증상
브랜드 페이지(`/certified-examiners/[id]`)에서 헤더 아래에 흰색 배경이 나타남
- 헤더 직후 흰색 영역 표시
- 브레드크럼 영역이 어두운 색상
- 그 아래 Hero 섹션이 또 다른 어두운 색상
- 총 3가지 배경색이 나타나는 문제

### 발생 환경
- 페이지: `/certified-examiners/[id]`
- 브라우저: 크롬, 모든 브라우저
- 디바이스: 데스크탑, 모바일 모두

### HTML 구조
```html
<body>
  <div class="App">
    <header>헤더</header>
    <main>
      <!-- 여기가 흰색! -->
      <div class="brandPageWrapper">
        <div class="breadcrumbContainer">
          <nav class="breadcrumb">브레드크럼</nav>
        </div>
        <section class="hero">Hero Section</section>
      </div>
    </main>
  </div>
</body>
```

## 💡 원인 분석

### 근본 원인
1. **globals.css의 기본 배경색**: `--background: #f8fdf9` (연한 녹색)
2. **Root layout의 main 요소**: 기본 배경색 상속
3. **브랜드 페이지 layout**: children만 렌더링하여 main 요소를 제어하지 못함

### 시도한 방법들

#### ❌ 시도 1: CSS로 배경색 설정
```css
.brandPageWrapper {
  background: #1a1a1a;
}
```
**실패 이유**: main 요소의 배경색을 덮지 못함

#### ❌ 시도 2: breadcrumbContainer 배경색 추가
```css
.breadcrumbContainer {
  background: #1a1a1a;
}
```
**실패 이유**: main 요소가 여전히 흰색

#### ❌ 시도 3: CSS !important 사용
```css
.brandPageWrapper {
  background: #1a1a1a !important;
}
```
**실패 이유**: main 요소의 배경색은 여전히 적용됨

#### ❌ 시도 4: Layout wrapper div 추가
```tsx
<div style={{ background: '#1a1a1a', minHeight: '100vh' }}>
  {children}
</div>
```
**실패 이유**: main 요소가 wrapper 밖에 있음

## 🛠️ 최종 해결 방법

### JavaScript로 main 요소 직접 제어

**파일**: `app/certified-examiners/[id]/layout.tsx`

```tsx
export default function ExaminerBrandLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script
        id="dark-bg-flash-fix"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            document.documentElement.style.background = '#1a1a1a';
            document.body.style.background = '#1a1a1a';
            document.body.style.margin = '0';
            document.body.style.padding = '0';

            // main 요소 찾아서 배경색 설정
            setTimeout(() => {
              const main = document.querySelector('main');
              if (main) {
                main.style.background = '#1a1a1a';
                main.style.margin = '0';
                main.style.padding = '0';
              }
            }, 0);
          `
        }}
      />
      <div style={{
        background: '#1a1a1a',
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: 0,
        position: 'relative'
      }}>
        {children}
      </div>
    </>
  );
}
```

### 핵심 포인트

1. **beforeInteractive Script 사용**
   - 페이지 로드 전에 실행되어 깜빡임 방지

2. **setTimeout 사용**
   - DOM이 완전히 로드된 후 main 요소 찾기
   - `setTimeout(..., 0)`으로 다음 이벤트 루프에서 실행

3. **다층 방어**
   - documentElement 배경색 설정
   - body 배경색 설정
   - main 배경색 설정
   - wrapper div 배경색 설정

## 🚀 예방 조치

### 재발 방지 대책
1. **전용 Layout 사용**: 다크 테마가 필요한 페이지는 전용 layout 생성
2. **CSS 변수 활용**: 페이지별 배경색을 CSS 변수로 관리
3. **beforeInteractive Script**: 깜빡임 방지를 위해 조기 실행

### 모니터링 방안
- 브랜드 페이지 접속 시 배경색 확인
- 다양한 브라우저에서 테스트
- 모바일/데스크탑 모두 확인

## 📚 참고 자료

### 관련 파일
- `app/certified-examiners/[id]/layout.tsx` - 최종 해결 코드
- `app/globals.css` - 기본 배경색 정의
- `src/components/examiner-brand/ExaminerBrandPage.module.css` - 컴포넌트 스타일

### 관련 커밋
- `831444b` - fix: main 요소 배경색을 다크로 강제 설정
- `d52c44d` - fix: layout에 다크 배경 wrapper 추가로 흰색 배경 완전 제거
- `8a30ea6` - fix: 전체 배경색을 단일 다크 색상으로 강제 통일

### 학습 내용
1. **Next.js Layout 구조 이해**
   - Root layout의 영향력
   - 중첩 layout의 제한사항

2. **CSS 우선순위**
   - !important도 DOM 구조를 이길 수 없음
   - JavaScript 스타일이 최우선

3. **Script 컴포넌트 활용**
   - beforeInteractive 전략의 중요성
   - DOM 조작 타이밍

---
*작성일: 2025-10-27*
*작성자: Claude Code*
