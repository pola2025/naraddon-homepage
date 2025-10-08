import { randomBytes, createHash } from 'crypto';

/**
 * CSRF 토큰 생성 및 검증 유틸리티
 *
 * Double Submit Cookie 패턴 사용:
 * 1. 서버에서 랜덤 토큰 생성
 * 2. 쿠키에 토큰 저장 (HttpOnly)
 * 3. 클라이언트에 토큰 반환
 * 4. 클라이언트는 요청 시 헤더에 토큰 포함
 * 5. 서버에서 쿠키 토큰과 헤더 토큰 비교
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * CSRF 토큰 생성
 * @returns 랜덤 토큰 문자열 (hex)
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * 토큰 해시 생성 (쿠키 저장용)
 * @param token 원본 토큰
 * @returns 해시된 토큰
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * CSRF 토큰 검증
 * @param cookieToken 쿠키에 저장된 토큰
 * @param headerToken 요청 헤더의 토큰
 * @returns 검증 성공 여부
 */
export function verifyCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Timing attack 방지를 위한 constant-time 비교
  try {
    const cookieHash = hashToken(cookieToken);
    const headerHash = hashToken(headerToken);

    if (cookieHash.length !== headerHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < cookieHash.length; i++) {
      result |= cookieHash.charCodeAt(i) ^ headerHash.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('[CSRF] Token verification error:', error);
    return false;
  }
}

/**
 * CSRF 쿠키 옵션
 */
export const CSRF_COOKIE_OPTIONS = {
  name: CSRF_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24시간
};

/**
 * CSRF 헤더 이름
 */
export const CSRF_HEADER = CSRF_HEADER_NAME;
