import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';

/**
 * 사용자 전화번호 업데이트 API
 *
 * @purpose 로그인한 사용자의 전화번호를 수동으로 입력받아 저장
 * @context PhoneNumberModal에서 호출
 * @security 본인의 전화번호만 수정 가능 (세션 체크)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Update Phone] API called');

    // 1. 세션 확인
    const session = await getServerSession(authOptions);
    console.log('[Update Phone] Session:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || 'none'
    });

    if (!session?.user?.email) {
      console.error('[Update Phone] ❌ No session or email');
      return NextResponse.json(
        {
          success: false,
          message: '로그인이 필요합니다. 다시 로그인해주세요.'
        },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const body = await request.json();
    const { mobile } = body;
    console.log('[Update Phone] Request data:', { mobile });

    // 3. 전화번호 형식 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!mobile || !phoneRegex.test(mobile)) {
      console.error('[Update Phone] ❌ Invalid phone format:', mobile);
      return NextResponse.json(
        {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)'
        },
        { status: 400 }
      );
    }

    // 4. MongoDB 연결
    console.log('[Update Phone] Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    // 5. 사용자 확인
    console.log('[Update Phone] Finding user:', session.user.email);
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      console.error('[Update Phone] ❌ User not found:', session.user.email);
      return NextResponse.json(
        {
          success: false,
          message: '사용자를 찾을 수 없습니다'
        },
        { status: 404 }
      );
    }

    console.log('[Update Phone] User found:', user._id);

    // 6. 전화번호 업데이트
    console.log('[Update Phone] Updating mobile...');
    const updateResult = await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          mobile: mobile,
          updatedAt: new Date(),
        },
      }
    );

    console.log('[Update Phone] ✅ Update result:', {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      email: session.user.email,
      mobile: mobile
    });

    return NextResponse.json({
      success: true,
      message: '전화번호가 저장되었습니다',
      data: { mobile }
    });
  } catch (error: any) {
    console.error('[Update Phone] ❌ Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return NextResponse.json(
      {
        success: false,
        message: `전화번호 저장 중 오류가 발생했습니다: ${error.message}`
      },
      { status: 500 }
    );
  }
}
