import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

/**
 * 정밀 상태 확인 API (GET /api/health/deep)
 *
 * @purpose 맥미니 점검 도구(InfraControl)가 5분마다 "서버 함수가 실제로 실행되고 MongoDB에 연결되는지"를 확인한다
 * @context 기존 /api/health 는 동적 요소가 없어 빌드 때 정적 응답으로 고정된다(2026-10-16 빌드 값이 그대로 나감).
 *          그래서 서버나 DB가 멈춰도 계속 200 healthy 를 돌려줘 장애를 잡지 못했다(2026-11-13 확인).
 *          기존 /api/health 와 다른 페이지·API는 건드리지 않고 이 주소만 새로 둔다.
 * @decision
 *  - 매 요청 서버에서 실행한다(force-dynamic + no-store). 캐시된 응답은 상태 확인이 아니다.
 *  - Bearer 토큰(HEALTH_CHECK_TOKEN)이 맞을 때만 DB에 ping 한 번을 보낸다. 토큰이 없거나 틀리면
 *    DB에 가지 않고 401로 끝낸다. 공개 주소라서 봇이 두드려도 DB 부하가 생기지 않게 하기 위해서다.
 *  - 토큰이 설정되지 않았으면 500으로 실패한다(조건부 인증 금지, 설정 누락도 점검 실패로 드러나게).
 *  - ping 은 컬렉션을 읽지 않는 연결 확인 명령이라 부하가 거의 없다. 3초 안에 답이 없으면 실패로 본다.
 *  - 응답은 상태 두 칸만 담는다. 오류 문구·접속 주소·런타임 정보는 담지 않는다(정찰 정보 노출 방지).
 * @note 미들웨어 EXCLUDED_PATHS 의 '/api/health' 접두사에 포함되어 해외 차단·IP 미식별 차단을 거치지 않는다
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PING_TIMEOUT_MS = 3_000;
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

const json = (body: Record<string, string>, status: number) =>
  NextResponse.json(body, { status, headers: NO_STORE });

// 길이가 달라도 비교 시간이 같도록 해시끼리 비교한다
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

async function pingDatabase(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('db_ping_timeout')), PING_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      (async () => {
        const conn = await connectDB();
        const db = conn.connection.db;
        if (!db) throw new Error('db_not_ready');
        await db.command({ ping: 1 });
      })(),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (!expected) {
    console.error('[naraddon/health-deep] HEALTH_CHECK_TOKEN 미설정');
    return json({ status: 'error' }, 500);
  }

  const header = request.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!provided || !tokenMatches(provided, expected)) {
    return json({ status: 'unauthorized' }, 401);
  }

  try {
    await pingDatabase();
    return json({ status: 'ok', db: 'ok' }, 200);
  } catch (error) {
    // 원인 문구는 서버 로그에만 남긴다(응답에는 담지 않음)
    const reason = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    console.error('[naraddon/health-deep] DB 확인 실패:', reason);
    return json({ status: 'error', db: 'error' }, 503);
  }
}
