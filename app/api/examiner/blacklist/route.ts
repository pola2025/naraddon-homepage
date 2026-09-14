/**
 * 기업심사관 블랙리스트 API
 *
 * POST /api/examiner/blacklist - 블랙리스트 등록
 * GET /api/examiner/blacklist - 블랙리스트 목록 조회
 *
 * @access 기업심사관만 접근 가능
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireExaminer, handleAuthError } from '@/lib/auth/guards';
import connectDB from '@/lib/mongodb';
import ExaminerBlacklist from '@/models/ExaminerBlacklist';
import {
  buildDescendingDateCursorFilter,
  parseListRequest,
  takePage,
} from '@/lib/bounded-read';

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
    /**
     * 블랙리스트 등록 권한 검증
     *
     * @purpose admin, super_admin, examiner, isAdmin:true 모두 등록 가능
     * @context guards.ts의 requireExaminer 사용 (통합된 권한 체계)
     */
    const user = await requireExaminer();

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
      registeredBy: user.id,
      registeredByName: user.name || '알 수 없음',
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

    // 인증/권한 에러 처리
    const authError = handleAuthError(error);
    if (authError) return authError;

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
    /**
     * 블랙리스트 조회 권한 검증
     *
     * @purpose admin, super_admin, examiner, isAdmin:true 모두 조회 가능
     * @context guards.ts의 requireExaminer 사용 (통합된 권한 체계)
     */
    await requireExaminer();

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 20, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    if (search.length > 80) {
      return NextResponse.json({ error: 'search must be 80 characters or fewer' }, { status: 400 });
    }

    // 3. DB 연결
    await connectDB();

    // 4. 검색 쿼리 생성
    let query: any = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = {
        $or: [
          { customerName: { $regex: escapedSearch, $options: 'i' } },
          { phoneNumber: { $regex: escapedSearch, $options: 'i' } },
          { companyName: { $regex: escapedSearch, $options: 'i' } },
          { businessNumber: { $regex: escapedSearch, $options: 'i' } },
        ],
      };
    }

    let queryFilter = query;
    if (cursor) {
      const cursorFilterResult = buildDescendingDateCursorFilter(cursor, 'registeredAt');
      if (cursorFilterResult.kind === 'invalid') {
        return NextResponse.json({ error: 'cursor is invalid' }, { status: 400 });
      }
      queryFilter = { $and: [query, cursorFilterResult.filter] };
    }

    // 5. 데이터 조회 (등록일 기준 내림차순)
    const entries = await ExaminerBlacklist.find(queryFilter)
      .sort({ registeredAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const page = takePage(entries, limit, (entry) => ({
      sortValue: new Date(entry.registeredAt).toISOString(),
      id: entry._id.toString(),
    }));

    return NextResponse.json(
      {
        success: true,
        entries: page.items,
        pagination: {
          limit,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[Blacklist GET Error]', error);

    // 인증/권한 에러 처리
    const authError = handleAuthError(error);
    if (authError) return authError;

    return NextResponse.json(
      { error: '블랙리스트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
