import { SkeletonHero } from '@/components/loading';
import Skeleton, { SkeletonCardGrid, SkeletonSection } from '@/components/loading/Skeleton';

/** 메인 페이지 로딩 — 히어로 + 신뢰 카드 + 콘텐츠 블록 구조 반영 */
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
