/**
 * API 보안 래퍼 및 유틸리티
 *
 * @purpose JSON 파싱 안전화, NoSQL 새니타이즈, 네임태그 로깅
 * @context 2026-03-31 보안 강화 — 기존 죽은 코드 전체 교체
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeMongoInput, detectNoSQLInjection } from './nosql-sanitize';

/** 안전한 JSON 파싱 — 실패 시 400 반환 */
export async function safeParseJson(
  request: NextRequest
): Promise<{ data: Record<string, unknown> | null; error?: NextResponse }> {
  try {
    const raw = await request.json();
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        data: null,
        error: NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 }),
      };
    }
    return { data: raw as Record<string, unknown> };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 }),
    };
  }
}

type RouteHandler = (request: NextRequest, body: Record<string, unknown>) => Promise<NextResponse>;

interface WithSecurityOptions {
  /** 로그 네임태그 (예: '전문가관리') */
  tag: string;
  /** NoSQL 인젝션 감지 시 차단 (기본: true) */
  blockInjection?: boolean;
}

/**
 * API 라우트 보안 래퍼
 *
 * 1. JSON 파싱 에러 → 400
 * 2. NoSQL injection 감지 → 차단
 * 3. body 새니타이즈
 * 4. 에러 로깅에 네임태그 포함
 */
export function withSecurity(handler: RouteHandler, options: WithSecurityOptions) {
  const { tag, blockInjection = true } = options;
  const prefix = `[나라똔:${tag}]`;

  return async (request: NextRequest): Promise<NextResponse> => {
    // 1. 안전한 JSON 파싱
    const { data, error } = await safeParseJson(request);
    if (error || !data) {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      console.error(`${prefix} 잘못된 JSON IP=${ip}`);
      return error ?? NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    // 2. NoSQL injection 감지
    if (blockInjection && detectNoSQLInjection(data)) {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      console.warn(`${prefix} NoSQL injection 시도 차단 IP=${ip}`);
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // 3. body 새니타이즈
    const sanitizedBody = sanitizeMongoInput(data) as Record<string, unknown>;

    // 4. 핸들러 실행
    try {
      return await handler(request, sanitizedBody);
    } catch (err) {
      console.error(`${prefix} 처리 중 오류:`, err);
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
  };
}

/** IP 추출 헬퍼 */
export function getClientIP(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** regex 이스케이프 — ReDoS 방지 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
