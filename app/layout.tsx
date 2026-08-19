import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import '@/App.css';
import '@/styles/components.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Providers } from '@/components/Providers';
import PageVisitTracker from '@/components/analytics/PageVisitTracker';
import { getOrganizationSchema } from '@/lib/json-ld';

export const metadata: Metadata = {
  title: "나라똔 - 사업자를 위한 '정책자금 공식 플랫폼'",
  description: '인증심사관이 함께하는 가장 믿음직한 동행, 나라똔이 보증하는 사고 책임제',
  keywords:
    '정부정책자금, 정부지원자금, 정부지원금, 정부보조금, 정책자금, 정책지원금, ' +
    '중소기업정책자금, 중소기업지원자금, 중소기업지원금, 중소기업보조금, 중소기업자금지원, 중소벤처기업부지원금, ' +
    'R&D지원금, R&D정책자금, R&D자금, 기술개발지원금, 기술혁신지원금, 연구개발지원금, ' +
    '수출지원금, 수출바우처, 수출지원자금, 무역지원금, 해외진출지원금, ' +
    '창업지원금, 창업자금, 초기창업지원금, 청년창업지원금, ' +
    '기업심사관, 인증기업심사관, 정책자금컨설팅, 정책자금신청, ' +
    '나라똔, NARADDON, 사업자대출, 기업운영자금, 시설투자자금, 중소기업지원',
  authors: [{ name: '나라똔' }],
  creator: '나라똔',
  publisher: '나라똔',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://naraddon.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "나라똔 - 사업자를 위한 '정책자금 공식 플랫폼'",
    description: '인증심사관이 함께하는 가장 믿음직한 동행, 나라똔이 보증하는 사고 책임제',
    url: 'https://naraddon.com',
    siteName: '나라똔',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '나라똔 - 정책자금 전문 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "나라똔 - 사업자를 위한 '정책자금 공식 플랫폼'",
    description: '인증심사관이 함께하는 가장 믿음직한 동행, 나라똔이 보증하는 사고 책임제',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Next.js App Router가 자동으로 icon.png와 apple-icon.png를 찾습니다
  // icons 설정을 제거하여 자동 감지 사용
  verification: {
    google: 'google-site-verification-code',
    naver: 'naver-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ backgroundColor: '#ffffff' }}>
      <head>
        {/* FOUC 방지 - body 전체 숨김 후 DOMContentLoaded에서 해제 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* FOUC 방지 - 페이지 로드 완료까지 숨김 */
              .no-fouc {
                visibility: hidden;
                opacity: 0;
              }
              /* CSS 로드 후 부드럽게 표시 */
              body:not(.no-fouc) {
                visibility: visible;
                opacity: 1;
                transition: opacity 0.2s ease-in;
              }
              html, body {
                background-color: #ffffff !important;
                color-scheme: light only !important;
              }
              /* 브라우저 강제 다크모드 / Dark Reader 대응 — 핵심 영역 흰색 강제 */
              @media (prefers-color-scheme: dark) {
                html, body, main, .home-page, .home-main-content {
                  background-color: #ffffff !important;
                  color: #171717 !important;
                }
              }
              /* 정책소식 섹션 Critical CSS - 레이아웃 깨짐 방지 */
              .policy-thumbnails-section {
                padding: 72px 0 60px;
                background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
              }
              .policy-thumbnails-section .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 24px;
              }
              .thumbnails-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 24px;
              }
              .thumbnails-title {
                font-size: 2rem;
                font-weight: 700;
                color: #0f172a;
              }
              @media (max-width: 1200px) {
                .thumbnails-grid { grid-template-columns: repeat(3, 1fr); }
              }
              @media (max-width: 768px) {
                .thumbnails-grid { display: none; }
                .thumbnails-title { font-size: 24px; }
              }
            `,
          }}
        />

        {/* 파비콘 */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* SEO 최적화 메타 태그 */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta charSet="utf-8" />

        {/* CSRF 토큰 메타 태그 (보안 강화) */}
        <meta name="csrf-token" content="" />

        {/* 추가 SEO 메타 태그 */}
        <meta name="theme-color" content="#4CAF50" />
        <meta name="msapplication-TileColor" content="#4CAF50" />
        <meta name="format-detection" content="telephone=no" />

        {/* 구조화된 데이터 (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '나라똔',
              alternateName: 'NARADDON',
              url: 'https://naraddon.com',
              logo: 'https://naraddon.com/logo.png',
              description:
                '인증심사관이 함께하는 가장 믿음직한 동행, 나라똔이 보증하는 사고 책임제',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'KR',
                addressLocality: '서울특별시',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+82-1588-0000',
                contactType: 'customer service',
                availableLanguage: ['Korean'],
              },
              sameAs: [
                'https://www.youtube.com/@naraddon',
                'https://www.instagram.com/naraddon',
                'https://blog.naver.com/naraddon',
              ],
            }),
          }}
        />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Umami Analytics */}
        <script
          defer
          src="https://naraddon-analytics.vercel.app/script.js"
          data-website-id="8d93abb4-ca26-495d-b2db-119ed1e57a80"
        />
      </head>
      <body className="no-fouc" style={{ backgroundColor: '#ffffff' }}>
        {/* FOUC 방지 - 모든 리소스 로드 완료 후 no-fouc 클래스 제거 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // window.onload: CSS, 이미지 등 모든 리소스 로드 완료 후 실행
              window.addEventListener("load", function() {
                // 렌더링 완료 후 다음 프레임에서 표시 (더 안정적)
                requestAnimationFrame(function() {
                  document.body.classList.remove("no-fouc");
                });
              });
              // 안전장치: 5초 후에도 클래스가 남아있으면 강제 제거
              setTimeout(function() {
                if (document.body.classList.contains("no-fouc")) {
                  document.body.classList.remove("no-fouc");
                }
              }, 5000);
            `,
          }}
        />
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-E6SP6XM3TP"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-E6SP6XM3TP');
          `}
        </Script>
        <Providers>
          <PageVisitTracker />
          <div className="App">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
