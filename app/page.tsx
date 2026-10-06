import IndexLanding, { type IndexNewsItem } from '@/components/index-landing/IndexLanding';

export const revalidate = 60;

async function getLatestPolicyNews(): Promise<IndexNewsItem[]> {
  try {
    const response = await fetch('https://naraddon.com/api/policy-news?limit=3', {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    if (!Array.isArray(payload.posts)) return [];
    return payload.posts
      .slice(0, 3)
      .flatMap((post) =>
        post &&
        /^[a-f0-9]{24}$/i.test(post._id) &&
        typeof post.title === 'string' &&
        post.title.trim()
          ? [{ id: post._id, title: post.title.trim().slice(0, 300) }]
          : []
      );
  } catch {
    return [];
  }
}

/**
 * 사이트 첫 화면(/) - 나라똔 인덱스
 *
 * @purpose 로고 + 검색창 + 카드 4개(나라똔 바로가기 / 무료 심사 신청 / 인증심사관 확인 / 사업자금 뉴스)로 진입점을 제공한다
 * @context 2026-09-30 확정한 11차 시안 기준. 기존 메인은 /home 으로 옮겼고 인트로(로딩영상)는 제거했다
 * @note 사이트 헤더·푸터는 이 경로에서 숨기고, 인덱스 전용 푸터를 쓴다
 * @note 13차: 기존 공개 정책소식 API의 최신 3개 글만 받아 60초마다 갱신한다
 */
export default async function IndexPage() {
  const latestNews = await getLatestPolicyNews();
  return <IndexLanding latestNews={latestNews} />;
}
