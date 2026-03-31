import { cookies } from 'next/headers';
import crypto from 'crypto';
import clientPromise from '@/lib/mongodb-client';

/**
 * 관리자 인증 모듈
 *
 * @purpose 관리자 비밀번호 검증 + 세션 관리
 * @context 2026-03-31 in-memory Map → MongoDB로 이전 (serverless 호환)
 * @note auth-options.ts(NextAuth/네이버 로그인)와 완전 분리된 별도 시스템
 */

// 세션 만료 시간 (24시간)
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const SESSION_COLLECTION = 'admin-sessions';

// 인덱스 생성 여부 캐시
let sessionIndexCreated = false;

/** MongoDB admin-sessions 컬렉션 접근 */
async function getSessionCollection() {
  const client = await clientPromise;
  const db = client.db('naraddon');
  const col = db.collection(SESSION_COLLECTION);
  // TTL 인덱스 (프로세스당 최초 1회만)
  if (!sessionIndexCreated) {
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    sessionIndexCreated = true;
  }
  return col;
}

// 관리자 비밀번호 검증 (타이밍 안전 비교)
export const verifyAdminPassword = (password: string): boolean => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[나라똔:관리자로그인] ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.');
    return false;
  }
  // 길이가 달라도 일정한 시간 소요되도록 패딩 후 비교
  const a = Buffer.from(password.padEnd(64, '\0'));
  const b = Buffer.from(adminPassword.padEnd(64, '\0'));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// 세션 생성 (MongoDB 저장)
export const createAdminSession = async (): Promise<string> => {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION);

  // MongoDB에 세션 저장
  try {
    const col = await getSessionCollection();
    await col.insertOne({
      token: sessionToken,
      createdAt: now,
      expiresAt,
    });
  } catch (error) {
    console.error('[나라똔:관리자세션] MongoDB 세션 저장 실패:', error);
    // 저장 실패해도 쿠키는 설정 (다음 검증에서 실패할 뿐)
  }

  // 쿠키 설정
  const cookieStore = cookies();
  cookieStore.set('admin-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  return sessionToken;
};

// 세션 검증 (MongoDB 조회)
export const validateAdminSession = async (): Promise<boolean> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;

  if (!sessionToken) {
    return false;
  }

  try {
    const col = await getSessionCollection();
    const session = await col.findOne({
      token: sessionToken,
      expiresAt: { $gt: new Date() },
    });

    return !!session;
  } catch (error) {
    console.error('[나라똔:관리자세션] MongoDB 세션 검증 실패:', error);
    return false;
  }
};

// 세션 삭제 (로그아웃)
export const deleteAdminSession = async (): Promise<void> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;

  if (sessionToken) {
    try {
      const col = await getSessionCollection();
      await col.deleteOne({ token: sessionToken });
    } catch (error) {
      console.error('[나라똔:관리자세션] MongoDB 세션 삭제 실패:', error);
    }
  }

  // 쿠키 삭제
  cookieStore.set('admin-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
};

// 세션 연장 (활동 시)
export const extendAdminSession = async (): Promise<void> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;

  if (!sessionToken) {
    return;
  }

  try {
    const col = await getSessionCollection();
    const newExpiry = new Date(Date.now() + SESSION_DURATION);
    await col.updateOne({ token: sessionToken }, { $set: { expiresAt: newExpiry } });
  } catch (error) {
    console.error('[나라똔:관리자세션] MongoDB 세션 연장 실패:', error);
  }
};
