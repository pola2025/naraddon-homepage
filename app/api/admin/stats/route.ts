import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

// GET /api/admin/stats - 관리자 대시보드 통계
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    console.log('[Admin Stats API] Session:', session ? { email: session.user?.email } : 'NO SESSION');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    console.log('[Admin Stats API] User role:', userRole);
    console.log('[Admin Stats API] Full session.user:', session.user);

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required',
        debug: {
          userEmail: session.user?.email,
          userRole: userRole,
          requiredRoles: ['admin', 'super_admin']
        }
      }, { status: 403 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 병렬로 통계 데이터 수집
    const [
      totalUsers,
      totalConsultations,
      pendingConsultations,
      totalExaminers,
      totalPolicyNews,
      totalTubeVideos,
      recentUsers,
      recentConsultations
    ] = await Promise.all([
      // 전체 사용자 수
      db.collection('users').countDocuments(),

      // 전체 상담 수
      db.collection('consultations').countDocuments(),

      // 대기 중인 상담 수
      db.collection('consultations').countDocuments({ status: 'pending' }),

      // 인증 심사관 수
      db.collection('certified-examiners').countDocuments({ status: 'active' }),

      // 정책 소식 수
      db.collection('policy-news').countDocuments(),

      // 나라돈 튜브 영상 수 (전체 entries의 videos 배열 합산)
      db.collection('naraddon-tube').aggregate([
        { $unwind: '$videos' },
        { $count: 'total' }
      ]).toArray(),

      // 최근 가입 사용자 (5명)
      db.collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ email: 1, name: 1, createdAt: 1 })
        .toArray(),

      // 최근 상담 신청 (5건)
      db.collection('consultations')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ userEmail: 1, consultationType: 1, status: 1, createdAt: 1 })
        .toArray()
    ]);

    // 최근 활동 통합 및 정렬
    const recentActivities = [
      ...recentUsers.map(user => ({
        id: user._id.toString(),
        type: 'user',
        description: '새로운 사용자 가입',
        timestamp: new Date(user.createdAt).toLocaleString('ko-KR'),
        user: user.email || user.name || '알 수 없음'
      })),
      ...recentConsultations.map(consultation => ({
        id: consultation._id.toString(),
        type: 'consultation',
        description: `새로운 ${consultation.consultationType || '일반'} 상담 신청`,
        timestamp: new Date(consultation.createdAt).toLocaleString('ko-KR'),
        user: consultation.userEmail || '알 수 없음'
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // 최근 10개만

    const videoCount = totalTubeVideos.length > 0 ? totalTubeVideos[0].total : 0;

    return NextResponse.json({
      totalUsers,
      totalConsultations,
      pendingConsultations,
      totalExaminers,
      totalPolicyNews,
      totalTubeVideos: videoCount,
      recentActivities
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
