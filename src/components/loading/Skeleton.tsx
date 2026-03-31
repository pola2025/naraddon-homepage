/**
 * Shimmer 스켈레톤 컴포넌트 (KPEC 스타일)
 *
 * @purpose 콘텐츠 로딩 중 페이지 구조를 미리 보여주는 플레이스홀더
 * @context animate-shimmer Tailwind 커스텀 애니메이션 사용
 */

interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

export default function Skeleton({ className = '', rounded = false }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${
        rounded ? 'rounded-full' : 'rounded-lg'
      } ${className}`}
    />
  );
}

/** 히어로 섹션 스켈레톤 — 메인 페이지 비디오 히어로 영역 */
export function SkeletonHero() {
  return (
    <div className="relative w-full h-[480px] md:h-[560px] bg-gray-200 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-[600px] px-6">
          <Skeleton className="h-8 w-1/3 mx-auto" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
          <div className="flex gap-3 justify-center pt-4">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 페이지 헤더 스켈레톤 — 서브페이지 상단 배너 영역 */
export function SkeletonPageHeader() {
  return (
    <div className="relative w-full h-[200px] md:h-[240px] bg-gray-200 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

/** 카드 그리드 스켈레톤 — 서비스 카드, 전문가 카드 등 */
export function SkeletonCardGrid({ cols = 3, count = 3 }: { cols?: number; count?: number }) {
  const gridClass =
    cols === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : cols === 4
        ? 'grid-cols-2 md:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Skeleton className="h-[160px] w-full rounded-none" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 섹션 스켈레톤 — 제목 + 콘텐츠 블록 */
export function SkeletonSection({
  height = '200px',
  showTitle = true,
}: {
  height?: string;
  showTitle?: boolean;
}) {
  return (
    <section className="py-10 px-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {showTitle && (
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-20 mx-auto" />
            <Skeleton className="h-7 w-56 mx-auto" />
          </div>
        )}
        <Skeleton className={`w-full`} style={{ height }} />
      </div>
    </section>
  );
}

/** 리스트 스켈레톤 — 뉴스, 게시판 등 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 items-start p-4 bg-white rounded-lg border border-gray-100"
        >
          <Skeleton className="w-20 h-20 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
