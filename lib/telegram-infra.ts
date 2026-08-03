/**
 * 인프라봇 에러 보고 유틸리티
 *
 * @purpose 사이트 API 에러 / 헬스 이상 / 서버(500) 오류를 인프라봇 텔레그램 채널로 실시간 보고
 * @context security.md 규칙 — catch 블록 알림: `[프로젝트/라우트]` + IP + error.message.slice(0,200), 500만 관리자 알림
 * @decision
 *   - 전용 인프라봇 채널 사용 (기존 lead/consultation/expert 봇과 분리)
 *   - 시크릿 하드코딩 금지 — TELEGRAM_INFRA_BOT_TOKEN / TELEGRAM_INFRA_CHAT_ID 환경변수로만 참조
 *   - 환경변수 미설정 시 no-op (운영 중단 방지)
 *   - parse_mode=HTML + escapeHtml (기존 Markdown 알림에서 발생하던 "can't parse entities" 오류 회피)
 *   - 동일 (라우트+요약) 5분 쿨다운으로 스팸 방지 (warm instance 한정 best-effort)
 * @note 호출부는 await 하지 않아도 됨 (fire-and-forget). 절대 throw 하지 않음 — 보고 실패가 본 응답을 막지 않도록.
 */

const PROJECT = 'naraddon';
const COOLDOWN_MS = 5 * 60 * 1000; // 동일 에러 5분 쿨다운
const lastSent = new Map<string, number>();

/** 텔레그램 HTML 출력용 5종 이스케이프 (security.md / form-security.md 규칙) */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface InfraErrorReport {
  /** 라우트 식별자 — `[naraddon/<route>]` 네임태그로 사용 (예: 'examiner/upload-info-image') */
  route: string;
  /** 에러 객체 또는 메시지 */
  error: unknown;
  /** 요청 IP (있으면) */
  ip?: string;
  /** HTTP 상태 코드 — 500 미만이면 보고 스킵 (400대 노이즈 방지) */
  status?: number;
  /** 추가 컨텍스트 (key: value 로 표기) */
  context?: Record<string, string | number | null | undefined>;
}

/**
 * 인프라봇으로 서버 오류 보고
 *
 * @returns 전송 성공 여부 (실패해도 throw 하지 않음)
 */
export async function reportInfraError(report: InfraErrorReport): Promise<boolean> {
  try {
    const { route, error, ip, status, context } = report;

    // 400대(클라이언트 오류)는 스킵 — 500(또는 상태 미지정)만 보고
    if (typeof status === 'number' && status < 500) return false;

    const botToken = process.env.TELEGRAM_INFRA_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_INFRA_CHAT_ID;
    if (!botToken || !chatId) {
      console.warn('[InfraBot] TELEGRAM_INFRA_BOT_TOKEN/CHAT_ID 미설정 — 보고 스킵');
      return false;
    }

    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();
    const summary = (rawMessage || 'Unknown error').slice(0, 200);

    // 스팸 방지: 동일 (라우트 + 요약) 5분 쿨다운
    const fingerprint = `${route}::${summary}`;
    const now = Date.now();
    const prev = lastSent.get(fingerprint);
    if (prev && now - prev < COOLDOWN_MS) return false;
    lastSent.set(fingerprint, now);

    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const contextLines = context
      ? Object.entries(context)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `• ${escapeHtml(k)}: ${escapeHtml(String(v))}`)
      : [];

    const text = [
      `🚨 <b>[${PROJECT}/${escapeHtml(route)}]</b> 서버 오류`,
      typeof status === 'number' ? `📡 status: ${status}` : null,
      ip ? `🌐 IP: ${escapeHtml(ip)}` : null,
      `❗ ${escapeHtml(summary)}`,
      ...contextLines,
      `⏰ ${timestamp}`,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[InfraBot] 전송 실패:', res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    // 보고 자체 실패는 절대 본 흐름을 막지 않음
    console.error('[InfraBot] 전송 예외:', e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * 인프라봇으로 임의 메시지 전송 (쿨다운·상태코드 필터 없음)
 *
 * @purpose 500 에러가 아닌 운영 보고(파이프라인 결과, 봇 차단 로그 등)를 인프라봇 채널로 보냄
 * @context 기존 상담접수 디버그 알림이 문의접수 채널(-1003280236380)로 가던 것을 인프라봇으로 분리
 * @note reportInfraError와 달리 중복 억제를 하지 않음 — 접수 건마다 1건씩 보고돼야 하므로
 */
export async function sendInfraMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_INFRA_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_INFRA_CHAT_ID;
  if (!botToken || !chatId) {
    console.warn('[InfraBot] TELEGRAM_INFRA_BOT_TOKEN/CHAT_ID 미설정 — 전송 스킵');
    return { ok: false, error: '인프라봇 환경변수 미설정' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[InfraBot] 전송 실패:', res.status, body.slice(0, 200));
      return { ok: false, error: `${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[InfraBot] 전송 예외:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * 요청에서 클라이언트 IP 추출 (Vercel 헤더 우선)
 */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}
