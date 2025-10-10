import { MetadataRoute } from 'next';

/**
 * 동적 Robots.txt 생성
 *
 * @purpose 검색엔진 크롤링 규칙 관리
 * @context 공개 콘텐츠는 허용, 관리자/인증 페이지는 차단
 * @note Next.js 14 App Router의 robots 기능 활용
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API 엔드포인트 차단
          '/admin/',         // 관리자 페이지 차단
          '/_next/',         // Next.js 내부 파일 차단
          '/private/',       // 비공개 영역 차단
          '/auth/verify-request', // 이메일 인증 페이지
          '/auth/error',     // 인증 에러 페이지
          '/dashboard/',     // 사용자 대시보드
          '/my-page/',       // 마이페이지
          '/*?*reset-token*', // 비밀번호 리셋 토큰
          '/*?*verify*',     // 이메일 인증 토큰
        ],
        crawlDelay: 1,
      },
      {
        // Naver 검색 봇
        userAgent: 'NaverBot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/private/'],
        crawlDelay: 1,
      },
      {
        // Naver 검색 봇 (Yeti)
        userAgent: 'Yeti',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/private/'],
        crawlDelay: 1,
      },
      {
        // Daum 검색 봇
        userAgent: 'Daumoa',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/private/'],
        crawlDelay: 1,
      },
    ],
    sitemap: 'https://naraddon.com/sitemap.xml',
  };
}
