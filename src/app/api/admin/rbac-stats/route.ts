import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth/guards';
import { getRBACStats, resetMetrics } from '@/lib/rbac/monitoring';

/**
 * RBAC 통계 조회 API
 *
 * @purpose Admin이 RBAC 시스템 성능 모니터링
 * @route GET /api/admin/rbac-stats
 * @access Admin only
 */
export async function GET() {
  try {
    // 관리자 권한 확인
    await requireAdmin();

    // 통계 수집
    const stats = getRBACStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;

    console.error('[rbac-stats] Error:', error);
    return NextResponse.json(
      { success: false, message: '통계 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * RBAC 메트릭 초기화 API
 *
 * @purpose Admin이 메트릭 리셋
 * @route POST /api/admin/rbac-stats/reset
 * @access Admin only
 */
export async function POST(request: Request) {
  try {
    // 관리자 권한 확인
    await requireAdmin();

    // 메트릭 초기화
    resetMetrics();

    return NextResponse.json({
      success: true,
      message: 'RBAC 메트릭이 초기화되었습니다.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;

    console.error('[rbac-stats] Reset error:', error);
    return NextResponse.json(
      { success: false, message: '메트릭 초기화 실패' },
      { status: 500 }
    );
  }
}
