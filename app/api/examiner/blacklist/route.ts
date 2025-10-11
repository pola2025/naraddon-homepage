/**
 * 기업심사관 블랙리스트 API
 *
 * POST /api/examiner/blacklist - 블랙리스트 등록
 * GET /api/examiner/blacklist - 블랙리스트 목록 조회
 *
 * @access 기업심사관만 접근 가능
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import connectDB from '@/lib/mongodb';
import ExaminerBlacklist from '@/models/ExaminerBlacklist';

/**
 * 중복 체크 함수
 * 연락처, 회사명, 사업자번호 중 2개 이상 일치하면 중복으로 판단
 */
async function checkDuplicate(data: {
  phoneNumber: string;
  companyName?: string;
  businessNumber?: string;
  excludeId?: string; // 수정 시 자기 자신은 제외
}) {
  const { phoneNumber, companyName, businessNumber, excludeId } = data;

  // 모든 블랙리스트 조회
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const blacklist = await ExaminerBlacklist.find(query);

  for (const entry of blacklist) {
    let matchCount = 0;
    const matches: string[] = [];

    // 연락처 비교
    if (phoneNumber && entry.phoneNumber && phoneNumber === entry.phoneNumber) {
      matchCount++;
      matches.push('연락처');
    }

    // 회사명 비교 (둘 다 값이 있을 때만)
    if (companyName && entry.companyName && companyName === entry.companyName) {
      matchCount++;
      matches.push('회사명');
    }

    // 사업자번호 비교 (둘 다 값이 있을 때만)
    if (businessNumber && entry.businessNumber && businessNumber === entry.businessNumber) {
      matchCount++;
      matches.push('사업자등록번호');
    }

    // 2개 이상 일치하면 중복
    if (matchCount >= 2) {
      return {
        isDuplicate: true,
        existingEntry: {
          _id: entry._id,
          customerName: entry.customerName,
          registeredByName: entry.registeredByName,
          registeredAt: entry.registeredAt,
          matches,
        },
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * POST - 블랙리스트 등록
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 세션 확인 (기업심사관 및 관리자 접근 가능)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const allowedRoles = ['examiner', 'admin', 'super_admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 2. 요청 데이터 파싱
    const body = await request.json();
    const { customerName, phoneNumber, companyName, businessNumber, reason } = body;

    // 3. 필수 항목 검증
    if (!customerName || !phoneNumber) {
      return NextResponse.json(
        { error: '이름과 연락처는 필수입니다.' },
        { status: 400 }
      );
    }

    // 4. DB 연결
    await connectDB();

    // 5. 중복 체크
    const duplicateCheck = await checkDuplicate({
      phoneNumber: phoneNumber.trim(),
      companyName: companyName?.trim(),
      businessNumber: businessNumber?.trim(),
    });

    if (duplicateCheck.isDuplicate && duplicateCheck.existingEntry) {
      return NextResponse.json(
        {
          error: '이미 등록된 고객입니다.',
          duplicate: duplicateCheck.existingEntry,
        },
        { status: 409 }
      );
    }

    // 6. 블랙리스트 등록
    const newEntry = await ExaminerBlacklist.create({
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      companyName: companyName?.trim() || undefined,
      businessNumber: businessNumber?.trim() || undefined,
      reason: reason?.trim() || undefined,
      registeredBy: session.user.id,
      registeredByName: session.user.name || '알 수 없음',
      registeredAt: new Date(),
      memos: [],
    });

    return NextResponse.json(
      {
        success: true,
        message: '블랙리스트에 등록되었습니다.',
        entry: newEntry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Blacklist POST Error]', error);
    return NextResponse.json(
      { error: '블랙리스트 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * GET - 블랙리스트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 세션 확인 (기업심사관 및 관리자 접근 가능)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const allowedRoles = ['examiner', 'admin', 'super_admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 3. DB 연결
    await connectDB();

    // 4. 검색 쿼리 생성
    let query: any = {};

    if (search) {
      query = {
        $or: [
          { customerName: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } },
          { businessNumber: { $regex: search, $options: 'i' } },
        ],
      };
    }

    // 5. 데이터 조회 (등록일 기준 내림차순)
    const total = await ExaminerBlacklist.countDocuments(query);
    const entries = await ExaminerBlacklist.find(query)
      .sort({ registeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Blacklist GET Error]', error);
    return NextResponse.json(
      { error: '블랙리스트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
