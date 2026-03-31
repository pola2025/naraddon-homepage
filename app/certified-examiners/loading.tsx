import { SkeletonPageHeader } from '@/components/loading';
import { SkeletonCardGrid } from '@/components/loading/Skeleton';

/** 인증심사관 로딩 — 헤더 + 2열 카드 그리드 */
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <SkeletonPageHeader />
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <SkeletonCardGrid cols={2} count={6} />
      </div>
    </div>
  );
}
