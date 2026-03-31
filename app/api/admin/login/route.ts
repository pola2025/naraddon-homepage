import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminSession } from '@/lib/auth/admin-auth';
import clientPromise from '@/lib/mongodb-client';

/**
 * 관리자 로그인 API
 *
 * @security rate limiting (5회/15분/IP), 타이밍 안전 비밀번호 비교
 */

/* ───── MongoDB 기반 Rate Limiting ───── */
async function checkLoginRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');
    const col = db.collection('login-rate-limits');

    // TTL 인덱스 보장 (최초 1회)
    await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 900 }).catch(() => {});

    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15분
    const count = await col.countDocuments({ ip, createdAt: { $gte: windowStart } });

    if (count >= 5) {
      const oldest = await col.findOne(
        { ip, createdAt: { $gte: windowStart } },
        { sort: { createdAt: 1 } }
      );
      const retryAfter = oldest
        ? Math.ceil((oldest.createdAt.getTime() + 900_000 - Date.now()) / 1000)
        : 900;
      return { allowed: false, retryAfter };
    }
    return { allowed: true };
  } catch {
    // 인증 엔드포인트는 fail-closed: DB 오류 시 차단
    console.error('[나라똔:관리자로그인] rate limit DB 오류 — fail-closed');
    return { allowed: false, retryAfter: 60 };
  }
}

async function recordLoginAttempt(ip: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');
    await db.collection('login-rate-limits').insertOne({ ip, createdAt: new Date() });
  } catch {
    // 기록 실패는 무시
  }
}

export async function POST(request: NextRequest) {
  // IP 추출
  const ip =
    request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Rate limit 체크
  const rateCheck = await checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    console.warn(`[나라똔:관리자로그인] rate limit 초과 IP=${ip}`);
    return NextResponse.json(
      { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 900) } }
    );
  }

  // JSON 파싱
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    console.error(`[나라똔:관리자로그인] 잘못된 JSON IP=${ip}`);
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { password } = body;

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
  }

  // 실패 시도 기록 (비밀번호 검증 전에 기록)
  await recordLoginAttempt(ip);

  // 비밀번호 검증
  const isValid = verifyAdminPassword(password);

  if (!isValid) {
    console.warn(`[나라똔:관리자로그인] 비밀번호 불일치 IP=${ip}`);
    return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
  }

  try {
    // 세션 생성
    const sessionToken = await createAdminSession();

    return NextResponse.json(
      { success: true, message: '로그인되었습니다.', sessionToken },
      { status: 200 }
    );
  } catch (error) {
    console.error('[나라똔:관리자로그인] 세션 생성 실패:', error);
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
