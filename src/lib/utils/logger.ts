/**
 * 안전한 로깅 유틸리티
 *
 * @purpose 프로덕션 로그에서 PII(개인식별정보) 노출 방지
 * @security GDPR, CCPA, 개인정보보호법 준수
 * @context 이메일, userId, IP 등 민감 정보를 마스킹하여 로그 수집 시스템에서 노출 방지
 */

/**
 * 이메일 마스킹
 *
 * @purpose 이메일 주소의 로컬 파트를 마스킹하여 식별 불가능하게 처리
 * @example maskEmail('user@example.com') => 'u***@example.com'
 * @security 로그 수집 시스템(Vercel, Datadog 등)에서 이메일 원본 노출 방지
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') {
    return '[MASKED]';
  }

  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '[INVALID_EMAIL]';
  }

  // 로컬 파트의 첫 글자만 보여주고 나머지는 ***
  const maskedLocal = local.length > 0 ? `${local[0]}***` : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * UserId 마스킹
 *
 * @purpose MongoDB ObjectId를 마스킹하여 추적 불가능하게 처리
 * @example maskUserId('507f1f77bcf86cd799439011') => '507f1f77...'
 * @security 로그에서 userId 원본 노출 방지 (8자리만 표시)
 */
export function maskUserId(userId: string | undefined | null): string {
  if (!userId || typeof userId !== 'string') {
    return '[MASKED]';
  }

  // ObjectId는 24자리 hex 문자열
  if (userId.length >= 8) {
    return `${userId.substring(0, 8)}...`;
  }

  return '[INVALID_ID]';
}

/**
 * IP 주소 마스킹
 *
 * @purpose IPv4 마지막 옥텟 마스킹
 * @example maskIpAddress('192.168.1.100') => '192.168.1.***'
 * @security 사용자 위치 추적 방지
 */
export function maskIpAddress(ip: string | undefined | null): string {
  if (!ip || typeof ip !== 'string') {
    return '[MASKED]';
  }

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:***`;
    }
  }

  return '[INVALID_IP]';
}

/**
 * 전화번호 마스킹
 *
 * @purpose 전화번호 중간 부분 마스킹
 * @example maskPhoneNumber('010-1234-5678') => '010-****-5678'
 * @security 개인 연락처 노출 방지
 */
export function maskPhoneNumber(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') {
    return '[MASKED]';
  }

  // 한국 전화번호 형식 (010-1234-5678 또는 01012345678)
  const cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.length === 11) {
    // 010-****-5678
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // 010-***-5678
    return `${cleaned.substring(0, 3)}-***-${cleaned.substring(6)}`;
  }

  return '[INVALID_PHONE]';
}

/**
 * 안전한 로그 객체 생성
 *
 * @purpose PII가 포함된 객체를 안전하게 로그할 수 있도록 자동 마스킹
 * @example
 * safeLog({
 *   userId: '507f1f77bcf86cd799439011',
 *   email: 'user@example.com',
 *   action: 'login'
 * })
 * => {
 *   userId: '507f1f77...',
 *   email: 'u***@example.com',
 *   action: 'login'
 * }
 */
export function safeLog(obj: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // 이메일 필드
    if (lowerKey.includes('email')) {
      safe[key] = maskEmail(value);
    }
    // userId 필드
    else if (lowerKey.includes('userid') || lowerKey === 'id' || lowerKey === '_id') {
      safe[key] = maskUserId(value);
    }
    // IP 주소 필드
    else if (lowerKey.includes('ip') || lowerKey.includes('ipaddress')) {
      safe[key] = maskIpAddress(value);
    }
    // 전화번호 필드
    else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
      safe[key] = maskPhoneNumber(value);
    }
    // 비밀번호 필드 (절대 로그하지 않음)
    else if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token')
    ) {
      safe[key] = '[REDACTED]';
    }
    // 중첩된 객체 재귀 처리
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      safe[key] = safeLog(value);
    }
    // 배열 처리
    else if (Array.isArray(value)) {
      safe[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? safeLog(item) : item
      );
    }
    // 일반 값
    else {
      safe[key] = value;
    }
  }

  return safe;
}

/**
 * 안전한 콘솔 로그
 *
 * @purpose console.log 대신 사용하여 자동으로 PII 마스킹
 * @example
 * logSafe('User login', { userId: '123', email: 'user@example.com' })
 * => [RBAC] User login { userId: '123...', email: 'u***@example.com' }
 */
export function logSafe(message: string, data?: Record<string, any>): void {
  if (data) {
    console.log(`[RBAC] ${message}`, safeLog(data));
  } else {
    console.log(`[RBAC] ${message}`);
  }
}

/**
 * 안전한 에러 로그
 *
 * @purpose console.error 대신 사용하여 자동으로 PII 마스킹
 */
export function logError(message: string, error: any, data?: Record<string, any>): void {
  const safeData = data ? safeLog(data) : {};
  console.error(`[RBAC Error] ${message}`, {
    error: error?.message || String(error),
    stack: error?.stack,
    ...safeData,
  });
}

/**
 * 프로덕션 환경 여부 확인
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * 개발 환경 전용 로그 (프로덕션에서는 출력 안 함)
 *
 * @purpose 개발 중에만 상세 로그 출력
 */
export function logDev(message: string, data?: Record<string, any>): void {
  if (!isProduction) {
    logSafe(message, data);
  }
}

/**
 * 사용 예시:
 *
 * // ❌ 절대 금지 - PII 노출
 * console.log('User:', user.email);
 *
 * // ✅ 올바른 방법 - 자동 마스킹
 * logSafe('User login', { email: user.email, userId: user.id });
 *
 * // ✅ 수동 마스킹
 * console.log('User:', maskEmail(user.email));
 */
