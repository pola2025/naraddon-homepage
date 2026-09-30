import { SkeletonHero } from '@/components/loading';
import Skeleton, { SkeletonCardGrid, SkeletonSection } from '@/components/loading/Skeleton';

/**
 * 메인 페이지(/home) 로딩 — 히어로 + 신뢰 카드 + 콘텐츠 블록 구조 반영
 * 2026-09-30 사이트 첫 화면이 인덱스로 바뀌면서 app/loading.tsx 에서 옮겼다.
 * 루트에 두면 자체 로딩 화면이 없는 모든 페이지(무료 심사 신청 등)로 이동할 때 메인 모양 회색 틀이 떠서 깨진 화면처럼 보인다.
 */
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <SkeletonHero />

      {/* 신뢰 섹션 스켈레톤 */}
      <section className="py-10 px-6 bg-gray-50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-8 space-y-3">
            <Skeleton className="h-4 w-20 mx-auto" />
            <Skeleton className="h-7 w-64 mx-auto" />
          </div>
          <SkeletonCardGrid cols={4} count={4} />
        </div>
      </section>

      {/* 정책소식 스켈레톤 */}
      <SkeletonSection height="300px" />

      {/* 나라똔 인터뷰 스켈레톤 */}
      <section className="py-10 px-6 bg-gray-50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-8 space-y-3">
            <Skeleton className="h-7 w-48 mx-auto" />
            <Skeleton className="h-4 w-72 mx-auto" />
          </div>
          <SkeletonCardGrid cols={3} count={3} />
        </div>
      </section>
    </div>
  );
}
