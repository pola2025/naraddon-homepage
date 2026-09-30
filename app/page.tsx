import IndexLanding from '@/components/index-landing/IndexLanding';

/**
 * 사이트 첫 화면(/) - 나라똔 인덱스
 *
 * @purpose 로고 + 검색창 + 카드 4개(나라똔 바로가기 / 무료 심사 신청 / 인증심사관 확인 / 사업자금 뉴스)로 진입점을 제공한다
 * @context 2026-09-30 확정한 11차 시안 기준. 기존 메인은 /home 으로 옮겼고 인트로(로딩영상)는 제거했다
 * @note 사이트 헤더·푸터는 이 경로에서 숨기고, 인덱스 전용 푸터를 쓴다
 */
export default function IndexPage() {
  return <IndexLanding />;
}
