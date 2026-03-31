import { SkeletonPageHeader } from '@/components/loading';
import Skeleton from '@/components/loading/Skeleton';

/** 정책분석 로딩 — 헤더 + 분석 콘텐츠 블록 */
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <SkeletonPageHeader />
      <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-6">
        <Skeleton className="h-8 w-72 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
