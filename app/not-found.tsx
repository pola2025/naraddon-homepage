import Link from 'next/link';

/**
 * 전역 404 Not Found 페이지
 *
 * @purpose 존재하지 않는 경로 접근 시, Next.js 기본 "404 this page could not be found"
 *          대신 나라똔 브랜드 톤의 안내 페이지를 노출한다.
 * @context 인증 만료 후 잘못된 리다이렉트 등으로 사용자가 막다른 404 화면을 만나 이탈하던 문제.
 *          홈 / 무료심사 / 관리자 문의 동선을 제공해 복귀를 돕는다.
 * @decision
 *   - 디자인 토큰: 배경 #f8fdf9 (따뜻한 연녹색, globals.css --background), 1차 액션 blue-600 (사이트 표준 CTA),
 *     보조 액션 green-600 (브랜드 그린)
 *   - 관리자 연락 안내 필수 (요청사항) — 고객센터 이메일 mailto 노출
 *   - 상호작용 없는 Server Component (번들 최소화)
 */
export default function NotFound() {
  // 관리자(고객센터) 문의 이메일 — Footer 노출 주소와 동일
  const ADMIN_EMAIL = 'jjk_naraddon@naver.com';

  return (
    <main
      className="min-h-[70vh] flex items-center justify-center px-4 py-16"
      style={{ background: '#f8fdf9' }}
    >
      <div className="w-full max-w-lg text-center">
        {/* 브랜드 로고 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-naraddon.png"
          alt="나라똔"
          className="mx-auto mb-10 h-12 w-auto select-none"
        />

        {/* 404 */}
        <p className="text-7xl font-extrabold tracking-tight text-green-700 sm:text-8xl">404</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
          페이지를 찾을 수 없습니다
        </h1>

        {/* 안내 메시지 + 관리자 문의 안내 */}
        <p className="mt-4 leading-relaxed text-gray-600">
          요청하신 페이지가 존재하지 않거나 주소가 변경되었습니다.
          <br />
          문제가 계속되면 아래로{' '}
          <span className="font-semibold text-gray-800">관리자에게 문의</span>해 주세요.
        </p>

        {/* 관리자 연락 카드 */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          <span aria-hidden>📩</span>
          <span>관리자 문의</span>
          <a href={`mailto:${ADMIN_EMAIL}`} className="font-semibold text-blue-700 hover:underline">
            {ADMIN_EMAIL}
          </a>
        </div>

        {/* 복귀 동선 */}
        <div className="mt-10 space-y-3">
          <Link
            href="/"
            className="block w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/consultation-request"
            className="block w-full rounded-md bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700"
          >
            무료심사 신청하기
          </Link>
        </div>
      </div>
    </main>
  );
}
