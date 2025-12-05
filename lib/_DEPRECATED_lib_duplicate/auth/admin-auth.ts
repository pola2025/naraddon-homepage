import { cookies } from 'next/headers';
import crypto from 'crypto';

// 메모리 내 세션 저장소 (프로덕션에서는 Redis 등으로 교체 권장)
const sessions = new Map<string, { createdAt: Date; expiresAt: Date }>();

// 세션 만료 시간 (24시간)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// 관리자 비밀번호 검증
export const verifyAdminPassword = (password: string): boolean => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.');
    return false;
  }
  return password === adminPassword;
};

// 세션 생성
export const createAdminSession = async (): Promise<string> => {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION);

  // 세션 저장
  sessions.set(sessionToken, {
    createdAt: now,
    expiresAt: expiresAt
  });

  // 쿠키 설정
  const cookieStore = cookies();
  cookieStore.set('admin-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // 초 단위
    path: '/'
  });

  // 만료된 세션 정리
  cleanupExpiredSessions();

  return sessionToken;
};

// 세션 검증
export const validateAdminSession = async (): Promise<boolean> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;

  if (!sessionToken) {
    return false;
  }

  const session = sessions.get(sessionToken);
  if (!session) {
    return false;
  }

  // 세션 만료 확인
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionToken);
    return false;
  }

  return true;
};

// 세션 삭제 (로그아웃)
export const deleteAdminSession = async (): Promise<void> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;

  if (sessionToken) {
    sessions.delete(sessionToken);
  }

  // 쿠키 삭제
  cookieStore.set('admin-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
};

// 만료된 세션 정리
const cleanupExpiredSessions = (): void => {
  const now = new Date();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
};

// 세션 연장 (활동 시)
export const extendAdminSession = async (): Promise<void> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;

  if (!sessionToken) {
    return;
  }

  const session = sessions.get(sessionToken);
  if (session) {
    const now = new Date();
    session.expiresAt = new Date(now.getTime() + SESSION_DURATION);
  }
};