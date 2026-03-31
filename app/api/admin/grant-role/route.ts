import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import { verifyAdminPassword } from '@/lib/auth/admin-auth';
import clientPromise from '@/lib/mongodb-client';
import { checkRateLimit, recordRateLimitHit } from '@/lib/rate-limit-middleware';
import { getClientIP } from '@/lib/security';

/**
 * 관리자 권한 부여 API
 *
 * @security rate limiting (5회/15분/IP), 타이밍 안전 비밀번호 비교, 네이버 로그인 필수
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Rate limiting (admin login과 동일: 5회/15분)
  const rlKey = `grant-role:${ip}`;
  const rl = await checkRateLimit({ key: rlKey, maxRequests: 5, windowSeconds: 900 });
  if (!rl.allowed) {
    console.warn(`[나라똔:권한부여] rate limit 초과 IP=${ip}`);
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 900) } }
    );
  }

  try {
    // 세션 확인 (네이버 로그인 필수)
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    // JSON 파싱
    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // 시도 기록
    await recordRateLimitHit(rlKey);

    // 타이밍 안전 비밀번호 검증 (admin-auth.ts의 timingSafeEqual 사용)
    if (!verifyAdminPassword(password)) {
      console.warn(`[나라똔:권한부여] 비밀번호 불일치 IP=${ip} email=${session.user.email}`);
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // MongoDB 연결 - 사용자 role을 admin으로 변경
    const client = await clientPromise;
    const db = client.db('naraddon');

    const result = await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          role: 'admin',
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      await db.collection('users').insertOne({
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: 'admin',
        provider: (session.user as any)?.provider || 'naver',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      });
    }

    console.log(`[나라똔:권한부여] 관리자 권한 부여 완료 email=${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: '관리자 권한이 부여되었습니다. 페이지를 새로고침하세요.',
      role: 'admin',
    });
  } catch (error) {
    console.error('[나라똔:권한부여] 오류:', error);
    return NextResponse.json({ error: '권한 부여 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
