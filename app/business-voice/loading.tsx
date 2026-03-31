import { SkeletonPageHeader } from '@/components/loading';
import Skeleton, { SkeletonCardGrid } from '@/components/loading/Skeleton';

/** 경영의 소리 로딩 — 헤더 + 카드 그리드 */
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <SkeletonPageHeader />
      <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-3">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>
        <SkeletonCardGrid cols={3} count={6} />
      </div>
    </div>
  );
}
