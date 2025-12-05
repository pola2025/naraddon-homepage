import { headers } from 'next/headers';
import crypto from 'crypto';

// 토큰 탈취 방지를 위한 보안 검증
export class TokenSecurityValidator {
  // IP 주소 기반 검증
  static async validateTokenOrigin(token: any, request: Request): Promise<boolean> {
    try {
      const headersList = headers();
      const clientIp = headersList.get('x-forwarded-for') ||
                      headersList.get('x-real-ip') ||
                      'unknown';

      // 토큰에 IP 정보가 있으면 검증
      if (token.clientIp && token.clientIp !== clientIp) {
        console.error(`Token IP mismatch: expected ${token.clientIp}, got ${clientIp}`);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // User-Agent 기반 검증
  static validateUserAgent(token: any, userAgent: string | null): boolean {
    if (!userAgent) return false;

    // 토큰에 User-Agent 해시가 있으면 검증
    if (token.uaHash) {
      const currentUaHash = crypto
        .createHash('sha256')
        .update(userAgent)
        .digest('hex');

      if (token.uaHash !== currentUaHash) {
        console.error('User-Agent mismatch detected');
        return false;
      }
    }

    return true;
  }

  // 토큰 사용 빈도 제한 (Rate Limiting)
  private static tokenUsageMap = new Map<string, { count: number; resetAt: number }>();

  static checkRateLimit(tokenId: string): boolean {
    const now = Date.now();
    const limit = this.tokenUsageMap.get(tokenId);

    if (!limit || limit.resetAt < now) {
      // 새로운 윈도우 시작 (1분)
      this.tokenUsageMap.set(tokenId, {
        count: 1,
        resetAt: now + 60000 // 1분
      });
      return true;
    }

    // 1분에 최대 30회 요청 허용
    if (limit.count >= 30) {
      console.error(`Rate limit exceeded for token: ${tokenId}`);
      return false;
    }

    limit.count++;
    return true;
  }

  // CSRF 토큰 검증
  static validateCSRFToken(sessionToken: string, csrfToken: string | null): boolean {
    if (!csrfToken) return false;

    // CSRF 토큰이 세션 토큰과 매칭되는지 확인
    const expectedCsrf = crypto
      .createHash('sha256')
      .update(`${sessionToken}-${process.env.NEXTAUTH_SECRET}`)
      .digest('hex')
      .substring(0, 32);

    return csrfToken === expectedCsrf;
  }

  // 토큰 지문 생성 (Browser Fingerprinting)
  static generateTokenFingerprint(request: Request): string {
    const headersList = headers();

    const fingerprint = {
      ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip'),
      ua: headersList.get('user-agent'),
      lang: headersList.get('accept-language'),
      encoding: headersList.get('accept-encoding'),
      dnt: headersList.get('dnt'),
      // 추가 브라우저 특성
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
  }

  // 비정상 패턴 감지
  static detectAnomalousActivity(token: any): boolean {
    // 짧은 시간 내 여러 IP에서 접근
    if (token.recentIps && token.recentIps.length > 3) {
      console.error('Multiple IPs detected in short time');
      return true;
    }

    // 토큰 생성 후 너무 빠른 사용
    if (token.iat && Date.now() - token.iat * 1000 < 100) {
      console.error('Token used too quickly after generation');
      return true;
    }

    return false;
  }

  // 종합 보안 검증
  static async performSecurityCheck(
    token: any,
    request: Request,
    csrfToken?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. IP 검증
    if (!await this.validateTokenOrigin(token, request)) {
      return { valid: false, reason: 'IP mismatch' };
    }

    // 2. User-Agent 검증
    const headersList = headers();
    const userAgent = headersList.get('user-agent');
    if (!this.validateUserAgent(token, userAgent)) {
      return { valid: false, reason: 'User-Agent mismatch' };
    }

    // 3. Rate Limiting
    if (token.sessionId && !this.checkRateLimit(token.sessionId)) {
      return { valid: false, reason: 'Rate limit exceeded' };
    }

    // 4. 비정상 활동 감지
    if (this.detectAnomalousActivity(token)) {
      return { valid: false, reason: 'Anomalous activity detected' };
    }

    // 5. CSRF 보호 (POST 요청의 경우)
    if (request.method === 'POST' && csrfToken) {
      if (!this.validateCSRFToken(token.sessionId || token.email, csrfToken)) {
        return { valid: false, reason: 'CSRF validation failed' };
      }
    }

    return { valid: true };
  }
}