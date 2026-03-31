import { SkeletonPageHeader, SkeletonList } from '@/components/loading';
import Skeleton from '@/components/loading/Skeleton';

/** 정책소식 로딩 — 헤더 + 뉴스 리스트 */
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <SkeletonPageHeader />
      <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-6">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
        <SkeletonList count={6} />
      </div>
    </div>
  );
}
