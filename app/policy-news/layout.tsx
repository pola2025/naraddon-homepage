import { Metadata } from 'next';

/**
 * 정책소식 섹션 메타데이터
 *
 * @purpose 정책소식 페이지 SEO 최적화
 * @context 최신 정부 정책 및 지원사업 소식 제공
 */
export const metadata: Metadata = {
  title: '정책소식 | 나라똔 - 최신 정부지원정책 소식',
  description:
    '대한민국 최신 정부지원정책, R&D 지원사업, 중소기업 지원금 소식을 실시간으로 확인하세요. 나라똔이 엄선한 정책 정보를 제공합니다.',
  keywords:
    '정책소식, 정부지원정책, 중소기업지원금, R&D지원사업, 창업지원금, 수출바우처, 정책자금뉴스, 지원사업공고',
  openGraph: {
    title: '정책소식 | 나라똔',
    description: '최신 정부지원정책과 중소기업 지원사업 소식',
    url: 'https://naraddon.com/policy-news',
    siteName: '나라똔',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-policy-news.jpg',
        width: 1200,
        height: 630,
        alt: '나라똔 정책소식',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '정책소식 | 나라똔',
    description: '최신 정부지원정책과 중소기업 지원사업 소식',
  },
  alternates: {
    canonical: 'https://naraddon.com/policy-news',
  },
};

export default function PolicyNewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
