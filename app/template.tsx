/**
 * 페이지 이동 전환
 *
 * @purpose 새 페이지가 준비되면 내용을 0.4초 동안 페이드인해서 보여 준다
 * @context 2026-09-30 인덱스에서 메뉴를 누를 때 중간 로딩 화면(회색 틀)이 어색하다는 요청으로,
 *          준비될 때까지는 이전 화면을 그대로 두고 준비된 화면만 부드럽게 나타나게 했다
 * @note template 은 경로가 바뀔 때마다 새로 그려지므로 이동할 때마다 페이드인이 다시 실행된다.
 *       헤더·푸터는 레이아웃에 있어 페이드 대상이 아니다
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
