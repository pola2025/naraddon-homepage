import Skeleton from '@/components/loading/Skeleton';

/** 관리자 페이지 로딩 — 사이드바 + 대시보드 구조 */
export default function Loading() {
  return (
    <div className="animate-fade-in flex min-h-screen">
      {/* 사이드바 스켈레톤 */}
      <div className="w-60 bg-gray-50 border-r border-gray-200 p-4 space-y-3 hidden md:block">
        <Skeleton className="h-8 w-32 mb-6" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      {/* 메인 콘텐츠 스켈레톤 */}
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
