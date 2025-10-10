import { Metadata } from 'next';

/**
 * 정책분석 섹션 메타데이터
 *
 * @purpose 정책분석 페이지 SEO 최적화
 * @context 기업심사관의 전문적인 정책 분석 및 인사이트 제공
 */
export const metadata: Metadata = {
  title: '정책분석 | 나라똔 - 기업심사관의 전문 정책 분석',
  description:
    '인증받은 기업심사관이 직접 작성한 정책자금 분석 리포트. R&D, 수출바우처, 중소기업 지원금 등 정부 지원사업의 핵심 포인트와 신청 전략을 제공합니다.',
  keywords:
    '정책분석, 기업심사관, 정책자금분석, R&D분석, 중소기업컨설팅, 지원사업전략, 정부지원금가이드, 전문가분석',
  openGraph: {
    title: '정책분석 | 나라똔',
    description: '기업심사관의 전문적인 정책자금 분석과 신청 전략',
    url: 'https://naraddon.com/policy-analysis',
    siteName: '나라똔',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-policy-analysis.jpg',
        width: 1200,
        height: 630,
        alt: '나라똔 정책분석',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '정책분석 | 나라똔',
    description: '기업심사관의 전문적인 정책자금 분석과 신청 전략',
  },
  alternates: {
    canonical: 'https://naraddon.com/policy-analysis',
  },
};

export default function PolicyAnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
