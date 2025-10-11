/**
 * 기업심사관 블랙리스트 개별 항목 API
 *
 * PUT /api/examiner/blacklist/[id] - 블랙리스트 수정
 * DELETE /api/examiner/blacklist/[id] - 블랙리스트 삭제
 *
 * @access 기업심사관만 접근 가능
 * @note 삭제는 등록한 심사관만 가능
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import connectDB from '@/lib/mongodb';
import ExaminerBlacklist from '@/models/ExaminerBlacklist';

/**
 * 중복 체크 함수
 */
async function checkDuplicate(data: {
  phoneNumber: string;
  companyName?: string;
  businessNumber?: string;
  excludeId: string;
}) {
  const { phoneNumber, companyName, businessNumber, excludeId } = data;

  // 자기 자신을 제외한 블랙리스트 조회
  const blacklist = await ExaminerBlacklist.find({ _id: { $ne: excludeId } });

  for (const entry of blacklist) {
    let matchCount = 0;
    const matches: string[] = [];

    if (phoneNumber && entry.phoneNumber && phoneNumber === entry.phoneNumber) {
      matchCount++;
      matches.push('연락처');
    }

    if (companyName && entry.companyName && companyName === entry.companyName) {
      matchCount++;
      matches.push('회사명');
    }

    if (businessNumber && entry.businessNumber && businessNumber === entry.businessNumber) {
      matchCount++;
      matches.push('사업자등록번호');
    }

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
 * PUT - 블랙리스트 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'examiner') {
      return NextResponse.json(
        { error: '기업심사관만 접근 가능합니다.' },
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

    // 5. 기존 항목 조회
    const existingEntry = await ExaminerBlacklist.findById(params.id);

    if (!existingEntry) {
      return NextResponse.json(
        { error: '해당 블랙리스트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 6. 중복 체크 (자기 자신 제외)
    const duplicateCheck = await checkDuplicate({
      phoneNumber: phoneNumber.trim(),
      companyName: companyName?.trim(),
      businessNumber: businessNumber?.trim(),
      excludeId: params.id,
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

    // 7. 블랙리스트 수정
    existingEntry.customerName = customerName.trim();
    existingEntry.phoneNumber = phoneNumber.trim();
    existingEntry.companyName = companyName?.trim() || undefined;
    existingEntry.businessNumber = businessNumber?.trim() || undefined;
    existingEntry.reason = reason?.trim() || undefined;
    existingEntry.updatedAt = new Date();
    existingEntry.updatedBy = session.user.id as any;
    existingEntry.updatedByName = session.user.name || '알 수 없음';

    await existingEntry.save();

    return NextResponse.json({
      success: true,
      message: '블랙리스트가 수정되었습니다.',
      entry: existingEntry,
    });
  } catch (error) {
    console.error('[Blacklist PUT Error]', error);
    return NextResponse.json(
      { error: '블랙리스트 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 블랙리스트 삭제 (등록한 심사관만 가능)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'examiner') {
      return NextResponse.json(
        { error: '기업심사관만 접근 가능합니다.' },
        { status: 403 }
      );
    }

    // 2. DB 연결
    await connectDB();

    // 3. 기존 항목 조회
    const existingEntry = await ExaminerBlacklist.findById(params.id);

    if (!existingEntry) {
      return NextResponse.json(
        { error: '해당 블랙리스트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 4. 삭제 권한 확인 (등록한 심사관만 삭제 가능)
    if (existingEntry.registeredBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: '등록한 심사관만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 5. 블랙리스트 삭제
    await ExaminerBlacklist.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: '블랙리스트가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[Blacklist DELETE Error]', error);
    return NextResponse.json(
      { error: '블랙리스트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
