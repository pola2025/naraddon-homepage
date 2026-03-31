/**
 * NoSQL Injection 방어 유틸리티
 *
 * @purpose MongoDB 쿼리 인젝션 방어 ($ne, $gt, $regex 등)
 * @context 2026-03-31 자동화 스캐너 공격 대응
 */

/** MongoDB 연산자로 시작하는 키 또는 dot notation 키를 재귀적으로 제거 */
export function sanitizeMongoInput(input: unknown): unknown {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeMongoInput);
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // $로 시작하는 키 제거 (MongoDB 연산자 차단)
      if (key.startsWith('$')) continue;
      // dot notation 차단 (nested field injection)
      if (key.includes('.')) continue;
      sanitized[key] = sanitizeMongoInput(value);
    }
    return sanitized;
  }

  return input;
}

/** 요청에 MongoDB 인젝션 패턴이 있는지 감지 */
export function detectNoSQLInjection(input: unknown): boolean {
  if (typeof input === 'string') {
    return /\$(?:ne|gt|gte|lt|lte|in|nin|regex|where|exists|or|and|not|nor|elemMatch)/i.test(input);
  }

  if (Array.isArray(input)) {
    return input.some(detectNoSQLInjection);
  }

  if (input && typeof input === 'object') {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (key.startsWith('$')) return true;
      if (detectNoSQLInjection(value)) return true;
    }
  }

  return false;
}
