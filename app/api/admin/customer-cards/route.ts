import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import {
  CustomerCard,
  DirectCustomerCardRequest,
  ConsultationStatus,
  ConsultationSource,
  CustomerType,
  ConsultationPhase,
  StaffRole
} from '@/types/consultation.types';

// GET /api/admin/customer-cards - 고객카드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // 관리자 또는 기업심사관만 접근 가능
    if (userRole !== 'admin' && userRole !== 'auditor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 필터 조건 생성
    const filter: any = {};

    if (userRole === 'auditor') {
      // 기업심사관은 자신에게 배정된 카드만 조회
      filter.assignedStaffId = session.user?.email;
    } else if (staffId) {
      // 관리자는 특정 담당자 필터링 가능
      filter.assignedStaffId = staffId;
    }

    if (status) filter.status = status;

    const customerCards = await db.collection('customerCards')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(customerCards);
  } catch (error) {
    console.error('Failed to fetch customer cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer cards' },
      { status: 500 }
    );
  }
}

// POST /api/admin/customer-cards - 관리자가 직접 고객카드 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // 관리자만 고객카드 생성 가능
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: DirectCustomerCardRequest = await request.json();

    // 필수 필드 검증
    if (!data.customerName || !data.phoneNumber || !data.email || !data.assignToStaffId) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 배정할 담당자 정보 조회
    const assignedStaff = await db.collection('users').findOne({
      email: data.assignToStaffId
    });

    if (!assignedStaff) {
      return NextResponse.json(
        { error: '담당자를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 고객카드 생성
    const customerCard: Partial<CustomerCard> = {
      customerType: CustomerType.NON_MEMBER,
      source: ConsultationSource.ADMIN_DIRECT,

      // 고객 정보
      customerName: data.customerName,
      companyName: data.companyName,
      businessNumber: data.businessNumber,
      phoneNumber: data.phoneNumber,
      email: data.email,
      address: data.address,
      businessType: data.businessType,
      employeeCount: data.employeeCount,
      annualRevenue: data.annualRevenue,

      // 담당자 정보
      assignedStaffId: data.assignToStaffId,
      assignedStaffName: assignedStaff.name || assignedStaff.email,
      assignedBy: session.user?.email || '',
      assignedByName: session.user?.name || session.user?.email || '',
      assignedAt: new Date(),

      // 상담 상태
      currentPhase: ConsultationPhase.PHONE,
      status: ConsultationStatus.ASSIGNED,

      // 계약 정보
      hasContract: false,
      memos: [],

      // 일정
      nextScheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,

      // 관리자 메모
      adminInitialNote: data.adminNote,

      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 고객카드 저장
    const result = await db.collection('customerCards').insertOne(customerCard);

    // 담당자에게 알림 발송
    // TODO: 이메일/SMS 알림 구현

    return NextResponse.json({
      success: true,
      customerCardId: result.insertedId,
      message: `고객카드가 생성되어 ${assignedStaff.name || assignedStaff.email}님에게 배정되었습니다.`
    });
  } catch (error) {
    console.error('Failed to create customer card:', error);
    return NextResponse.json(
      { error: '고객카드 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}