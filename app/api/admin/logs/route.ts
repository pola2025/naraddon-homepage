import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';
import { AdminAccessLog, AdminActionType, AdminLogSeverity } from '@/types/admin-log.types';

// GET /api/admin/logs - 관리자 활동 로그 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // super_admin만 로그 조회 가능 (일반 승격 admin은 불가)
    if (userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Only super admin can view logs' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const action = searchParams.get('action');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 필터 조건 생성
    const filter: any = {};

    if (adminId) filter.adminId = adminId;
    if (action) filter.action = action;
    if (severity) filter.severity = severity;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // super_admin만 접근하므로 이 부분은 실행되지 않음
    // 하지만 안전을 위해 유지

    const logs = await db.collection('adminLogs')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .toArray();

    const total = await db.collection('adminLogs').countDocuments(filter);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Failed to fetch admin logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin logs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/logs - 관리자 활동 로그 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // 관리자만 로그 생성 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // IP 주소 가져오기
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] :
               request.headers.get('x-real-ip') ||
               'unknown';

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 이전 로그에서 마지막 IP 조회
    const lastLog = await db.collection('adminLogs')
      .findOne(
        { adminEmail: session.user?.email },
        { sort: { timestamp: -1 } }
      );

    const previousIp = lastLog?.ipAddress;
    const isNewIp = previousIp && previousIp !== ip;

    // 로그 생성
    const log: AdminAccessLog = {
      adminId: (session.user as any)?.id || session.user?.email || '',
      adminEmail: session.user?.email || '',
      adminName: session.user?.name || '',
      adminRole: userRole,
      provider: (session.user as any)?.provider || 'unknown',

      action: data.action || AdminActionType.VIEW_PAGE,
      description: data.description || '',
      details: data.details,
      targetResource: data.targetResource,
      targetId: data.targetId,

      ipAddress: ip,
      previousIpAddress: isNewIp ? previousIp : undefined,
      userAgent: request.headers.get('user-agent') || undefined,

      severity: data.severity || AdminLogSeverity.INFO,
      isNewIp,
      sessionId: data.sessionId,

      timestamp: new Date()
    };

    // 로그 저장
    const result = await db.collection('adminLogs').insertOne(log);

    // IP 변경 시 알림 (중요 보안 이벤트)
    if (isNewIp) {
      await db.collection('securityAlerts').insertOne({
        type: 'IP_CHANGE',
        adminEmail: session.user?.email,
        oldIp: previousIp,
        newIp: ip,
        timestamp: new Date(),
        severity: AdminLogSeverity.WARNING
      });
    }

    return NextResponse.json({
      success: true,
      logId: result.insertedId,
      isNewIp
    });
  } catch (error) {
    console.error('Failed to create admin log:', error);
    return NextResponse.json(
      { error: 'Failed to create admin log' },
      { status: 500 }
    );
  }
}