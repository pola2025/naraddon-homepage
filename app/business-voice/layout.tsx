import { Metadata } from 'next';

/**
 * 기업의 소리 섹션 메타데이터
 *
 * @purpose 기업의 소리 페이지 SEO 최적화
 * @context 똔톡(기업 리뷰), 묻고답하기 등 기업 커뮤니티 공간
 */
export const metadata: Metadata = {
  title: '기업의 소리 | 나라똔 - 정책자금 경험 공유 커뮤니티',
  description:
    '정책자금을 경험한 기업들의 생생한 후기와 질문답변. 똔톡(기업 리뷰), 묻고답하기를 통해 실제 사례와 노하우를 공유하세요.',
  keywords:
    '기업후기, 정책자금후기, 똔톡, 기업리뷰, 정책자금QnA, 중소기업커뮤니티, 지원금경험담, 정책자금사례',
  openGraph: {
    title: '기업의 소리 | 나라똔',
    description: '정책자금 경험 기업들의 생생한 후기와 커뮤니티',
    url: 'https://naraddon.com/business-voice',
    siteName: '나라똔',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-business-voice.jpg',
        width: 1200,
        height: 630,
        alt: '나라똔 기업의 소리',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '기업의 소리 | 나라똔',
    description: '정책자금 경험 기업들의 생생한 후기와 커뮤니티',
  },
  alternates: {
    canonical: 'https://naraddon.com/business-voice',
  },
};

export default function BusinessVoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
