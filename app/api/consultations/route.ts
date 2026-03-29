import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { waitUntil } from '@vercel/functions';
import clientPromise from '@/lib/mongodb-client';
import {
  ConsultationRequest,
  ConsultationStatus,
  ConsultationSource,
  CustomerType,
  ConsultationPhase,
} from '@/types/consultation.types';

// ================================================
// 환경변수
// ================================================
const RESEND_WORKER_URL = 'https://naraddon-resend-mail.mkt9834.workers.dev';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_EMAIL_FROM =
  process.env.RESEND_EMAIL_FROM || '나라똔 <noreply@mail.policy-fund.online>';

// 스태프 알림 이메일 (환경변수에서 콤마 구분)
const STAFF_NOTIFICATION_EMAILS = (
  process.env.CONSULTATION_NOTIFICATION_EMAILS_EXPERT ||
  process.env.CONSULTATION_NOTIFICATION_EMAILS ||
  ''
)
  .trim()
  .replace(/^["']|["']$/g, '');

// 관리자 직통 텔레그램
const ADMIN_TELEGRAM_BOT_TOKEN = process.env.LEAD_TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_CHAT_ID = process.env.TELEGRAM_DEBUG_CHAT_ID || '-1003280236380';

// 고객DB 텔레그램 채널
const CUSTOMER_DB_CHAT_ID = process.env.TELEGRAM_CUSTOMER_DB_CHAT_ID || '-1002948627243';

// Airtable
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || '';
const AIRTABLE_BASE_ID = 'appNSHE8lXo0RTG0b';
const AIRTABLE_TABLE_ID = 'tbl7PO9zfoxfDsDA2';

// Google Sheets (GAS 웹앱 URL)
const GOOGLE_SHEETS_URL = process.env.NARADDON_SHEETS_URL || '';

// ================================================
// 유틸리티 함수
// ================================================

function parseEmailList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendTelegram(
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!ADMIN_TELEGRAM_BOT_TOKEN) {
    console.error(`[Telegram] 봇 토큰 없음 (LEAD_TELEGRAM_BOT_TOKEN 미설정)`);
    return { ok: false, error: '봇 토큰 없음' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${ADMIN_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] chatId=${chatId} 실패: ${res.status} ${body}`);
      return { ok: false, error: `${res.status}: ${body}` };
    }
    console.log(`[Telegram] chatId=${chatId} 발송 성공`);
    return { ok: true };
  } catch (err) {
    console.error(`[Telegram] chatId=${chatId} 네트워크 오류: ${String(err)}`);
    return { ok: false, error: String(err) };
  }
}

// 한글 변환 헬퍼
function convertAnnualRevenue(value: string): string {
  const map: Record<string, string> = {
    'under-1': '1억 미만',
    '1-5': '1억-5억',
    '5-10': '5억-10억',
    '10-30': '10억-30억',
    '30-50': '30억-50억',
    '50-100': '50억-100억',
    'over-100': '100억 이상',
    'pre-startup': '예비창업',
    'under-100m': '1억 미만',
    '100m-500m': '1-5억',
    '500m-1b': '5-10억',
    '1b-5b': '10-50억',
    'over-5b': '50억 이상',
  };
  return map[value] || value;
}

function convertEmployeeCount(value: string): string {
  const map: Record<string, string> = {
    '0': '없음',
    '1-5': '1-5명',
    '6-10': '6-10명',
    '11-30': '11-30명',
    '31-100': '31-100명',
    'over-100': '100명 이상',
  };
  return map[value] || value;
}

function convertPreferredTime(value: string): string {
  const map: Record<string, string> = {
    immediate: '즉시 상담',
    today: '오늘 중',
    week: '1주 이내',
    two_weeks: '2주 이내',
    month: '1개월 이내',
    weekday: '평일',
    weekend: '주말',
    anytime: '상관없음',
  };
  return map[value] || value;
}

function convertConsultationField(value: string): string {
  const map: Record<string, string> = {
    legal: '법무·특허',
    tax: '세무·회계',
    labor: '인사·노무',
    marketing: '마케팅·브랜딩',
    tech: '기술·IT',
    strategy: '경영전략',
  };
  return map[value] || value;
}

function convertConsultationType(value: string): string {
  const map: Record<string, string> = {
    'policy-fund': '정부지원금',
    grant: '정부지원금',
    certification: '인증',
    startup: '창업',
    other: '기타',
  };
  return map[value] || value || '정부지원금';
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ================================================
// 1. 관리자 텔레그램 알림 (직접 호출)
// ================================================
async function notifyAdminTelegram(
  consultation: Partial<ConsultationRequest>,
  errors: string[]
): Promise<{ success: boolean; error?: string }> {
  const hasErrors = errors.length > 0;
  const lines = [
    hasErrors ? '🚨 <b>상담 접수 (일부 오류)</b>' : '📋 <b>새 상담 접수</b>',
    '',
    `👤 ${escapeHtml(consultation.userName || '')} | ${escapeHtml(consultation.userPhone || '')}`,
    `🏢 ${escapeHtml(consultation.companyName || '-')}`,
    `📌 ${escapeHtml(consultation.consultationType || '')}`,
    consultation.region ? `📍 ${escapeHtml(consultation.region)}` : '',
    consultation.consultationField
      ? `🔧 ${convertConsultationField(consultation.consultationField)}`
      : '',
    consultation.annualRevenue ? `💰 ${convertAnnualRevenue(consultation.annualRevenue)}` : '',
    consultation.employeeCount ? `👥 ${convertEmployeeCount(consultation.employeeCount)}` : '',
    consultation.message ? `💬 ${escapeHtml(consultation.message.slice(0, 200))}` : '',
    '',
    `⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
  ];

  if (hasErrors) {
    lines.push('', '⚠️ <b>오류 목록:</b>');
    errors.forEach((e) => lines.push(`  • ${escapeHtml(e)}`));
  }

  const text = lines.filter(Boolean).join('\n');

  // 고객DB 채널로만 발송 (디버그는 별도)
  const result = await sendTelegram(CUSTOMER_DB_CHAT_ID, text);

  return result.ok
    ? { success: true }
    : { success: false, error: result.error || '텔레그램 발송 실패' };
}

// ================================================
// 2. 스태프 이메일 알림 (Resend API 직접)
// ================================================
function buildStaffEmailHtml(consultation: Partial<ConsultationRequest>, data: any): string {
  const submittedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const alertType =
    consultation.consultationType === '기업심사관 상담' ? 'AUDITOR ALERT' : 'CONSULTATION ALERT';

  // 태그(pill) 생성 헬퍼
  const primaryTag = (value: string) =>
    `<span style="display:inline-block;background:#1B4332;color:#fff;padding:3px 10px;border-radius:3px;font-size:12px;font-weight:600;margin-right:6px;margin-bottom:4px;">${escapeHtml(value)}</span>`;
  const grayTag = (value: string) =>
    `<span style="display:inline-block;background:#f3f4f6;color:#555;padding:3px 10px;border-radius:3px;font-size:12px;margin-right:6px;margin-bottom:4px;">${escapeHtml(value)}</span>`;

  // 태그 목록 구성
  const tags: string[] = [];
  if (consultation.consultationType) tags.push(primaryTag(consultation.consultationType));
  if (consultation.annualRevenue)
    tags.push(grayTag(`연매출 ${convertAnnualRevenue(consultation.annualRevenue)}`));
  if (consultation.employeeCount)
    tags.push(grayTag(`직원 ${convertEmployeeCount(consultation.employeeCount)}`));
  if (consultation.consultationField)
    tags.push(grayTag(convertConsultationField(consultation.consultationField)));
  if (data.consultType) tags.push(grayTag(convertConsultationType(data.consultType)));
  if (consultation.region) tags.push(grayTag(consultation.region));

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Pretendard',-apple-system,sans-serif;margin:0;padding:0;background:#F9FAFB;">
  <div style="max-width:640px;margin:0 auto;background:#fff;">

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B4332;">
      <tr>
        <td style="padding:16px 24px;font-size:13px;font-weight:700;color:#74C69D;letter-spacing:3px;">나 라 똔</td>
        <td style="padding:16px 24px;font-size:11px;color:#52B788;letter-spacing:2px;text-align:right;">${alertType}</td>
      </tr>
    </table>

    <div style="background:#edf7f0;border-left:3px solid #52B788;padding:10px 24px;font-size:13px;color:#2d5a3f;">
      새로운 상담 신청이 접수되었습니다 — ${submittedAt}
    </div>

    <div style="padding:28px 24px 12px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Client</div>
      <div style="margin-bottom:4px;">
        <span style="font-size:22px;font-weight:700;color:#333;">${escapeHtml(consultation.userName || '')}</span>
        <span style="font-size:14px;color:#666;margin-left:12px;">${escapeHtml(consultation.userPhone || '')}</span>
        ${consultation.region ? `<span style="font-size:14px;color:#666;margin-left:8px;">${escapeHtml(consultation.region)}</span>` : ''}
      </div>
      ${consultation.companyName ? `<div style="font-size:14px;color:#666;margin-top:2px;">${escapeHtml(consultation.companyName)}${consultation.businessNumber ? ` · ${escapeHtml(consultation.businessNumber)}` : ''}</div>` : ''}
      ${consultation.userEmail ? `<div style="font-size:13px;color:#888;margin-top:2px;">${escapeHtml(consultation.userEmail)}</div>` : ''}
    </div>

    <div style="padding:4px 24px 20px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Consultation</div>
      <div style="line-height:1.8;">${tags.join('')}</div>
    </div>

    ${
      consultation.message
        ? `
    <div style="padding:0 24px 20px;">
      <div style="background:#F9FAFB;padding:16px;border-radius:4px;">
        <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Message</div>
        <div style="font-size:13px;color:#333;line-height:1.6;white-space:pre-wrap;">${escapeHtml(consultation.message)}</div>
      </div>
    </div>`
        : ''
    }

    <div style="padding:8px 24px 24px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:11px;color:#888;">희망시간: ${escapeHtml(data.desiredTime || convertPreferredTime(consultation.preferredTime || ''))}</td>
        <td style="padding-left:24px;">
          <a href="https://docs.google.com/spreadsheets/d/1s1F6yw3ioJv1_pzI_OKG1u_st1S2pGRc99jqsUQbnIw/edit?gid=0#gid=0"
             style="display:inline-block;background:#1B4332;color:#fff;padding:8px 20px;text-decoration:none;border-radius:4px;font-size:12px;font-weight:700;">시트 확인</a>
        </td>
      </tr></table>
    </div>

    <div style="border-top:1px solid #eee;padding:16px 24px;text-align:center;">
      <span style="font-size:12px;color:#52B788;">나라똔 자동 알림</span>
      <span style="font-size:12px;color:#ccc;"> · </span>
      <span style="font-size:12px;color:#999;">소상공인 정책자금 플랫폼</span>
    </div>

  </div>
</body>
</html>`;
}

async function sendStaffEmail(
  consultation: Partial<ConsultationRequest>,
  data: any
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY || !STAFF_NOTIFICATION_EMAILS) {
    return { success: false, error: '스태프 이메일 설정 없음' };
  }

  const toEmails = parseEmailList(STAFF_NOTIFICATION_EMAILS);
  if (toEmails.length === 0) {
    return { success: false, error: '수신자 이메일 없음' };
  }

  const html = buildStaffEmailHtml(consultation, data);
  const subject = `[나라똔] 새 상담 접수 - ${consultation.userName} (${consultation.consultationType})`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_EMAIL_FROM,
        to: toEmails,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return {
        success: false,
        error: `Resend ${res.status}: ${err.message || JSON.stringify(err)}`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ================================================
// 3. 고객 확인 이메일 (Cloudflare Worker)
// ================================================
async function sendCustomerEmail(
  consultation: Partial<ConsultationRequest>,
  data: any
): Promise<{ success: boolean; error?: string }> {
  if (!consultation.userEmail) return { success: false, error: '고객 이메일 없음' };

  try {
    const response = await fetch(RESEND_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: consultation.userEmail,
        submission: {
          name: consultation.userName,
          consultType: consultation.consultationType,
          desiredTime: data.desiredTime,
          preferredTime: consultation.preferredTime,
        },
        submittedAt: new Date().toISOString(),
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || `Worker ${response.status}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ================================================
// 4. Airtable 저장
// ================================================
async function saveToAirtable(
  consultation: Partial<ConsultationRequest>,
  data: any
): Promise<{ success: boolean; error?: string }> {
  if (!AIRTABLE_API_TOKEN) return { success: false, error: 'Airtable 토큰 없음' };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          typecast: true,
          fields: {
            이름: consultation.userName || '',
            회사명: consultation.companyName || '',
            연락처: consultation.userPhone || '',
            이메일: consultation.userEmail || '',
            사업자번호: consultation.businessNumber || '',
            상담유형: consultation.consultationType || '',
            연매출: consultation.annualRevenue || '',
            직원수: consultation.employeeCount || '',
            희망시간: data.desiredTime || consultation.preferredTime || '',
            지역: data.region || consultation.region || '',
            요청내용: consultation.message || '',
            접수일시: new Date().toISOString(),
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: `Airtable ${res.status}: ${JSON.stringify(err)}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ================================================
// 5. Google Sheets 저장 (TODO: 시트 연동 시 활성화)
// ================================================
async function saveToGoogleSheets(
  consultation: Partial<ConsultationRequest>,
  data: any
): Promise<{ success: boolean; error?: string }> {
  if (!GOOGLE_SHEETS_URL) {
    return { success: false, error: 'Google Sheets URL 미설정' };
  }

  try {
    const res = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        제출시간: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        지역: data.region || consultation.region || '',
        사업자번호: consultation.businessNumber || '',
        이름: consultation.userName || '',
        회사명: consultation.companyName || '',
        연락처: consultation.userPhone || '',
        이메일: consultation.userEmail || '',
        상담희망분야: consultation.consultationType || '',
        연매출: consultation.annualRevenue ? convertAnnualRevenue(consultation.annualRevenue) : '',
        직원수: consultation.employeeCount ? convertEmployeeCount(consultation.employeeCount) : '',
        상담희망시간: data.desiredTime || convertPreferredTime(consultation.preferredTime || ''),
        희망시기: data.consultType ? convertConsultationType(data.consultType) : '',
        문의사항: consultation.message || '',
        개인정보동의: 'Y',
      }),
    });

    const result = await res.json();
    if (!result.success) {
      return { success: false, error: result.error || `Sheets ${res.status}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ================================================
// GET /api/consultations - 상담 목록 조회
// ================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const staffId = searchParams.get('staffId');
    const userId = searchParams.get('userId');

    const client = await clientPromise;
    const db = client.db('naraddon');

    const filter: any = {};
    if (status) filter.status = status;
    if (phase) filter.currentPhase = phase;
    if (staffId) filter.assignedStaffId = staffId;
    if (userId) filter.userId = userId;

    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;

    if (userRole === 'admin' || userRole === 'super_admin') {
      // 전체 조회
    } else if (userRole === 'examiner') {
      filter.assignedStaffId = userEmail;
    } else {
      filter.userEmail = userEmail;
    }

    const consultations = await db
      .collection('consultations')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(consultations);
  } catch (error) {
    console.error('Failed to fetch consultations:', error);
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 });
  }
}

// ================================================
// 반복접수 차단 설정
// IP+전화번호 조합으로 동일인 판별 (같은 IP의 다른 고객은 허용)
// ================================================
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000; // 30분
const RATE_LIMIT_MAX_REQUESTS = 3; // 동일인 30분 내 최대 3회
const IP_ONLY_RATE_LIMIT_MAX = 10; // 같은 IP 전체 30분 내 최대 10회 (봇 방지)

// TTL 인덱스 생성 (1회만 실행, 1시간 후 자동 삭제)
let rateLimitIndexCreated = false;
async function ensureRateLimitIndex(
  db: ReturnType<Awaited<ReturnType<typeof clientPromise>>['db']>
) {
  if (rateLimitIndexCreated) return;
  try {
    await db.collection('consultation-rate-limits').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 3600 } // 1시간 후 자동 삭제
    );
    rateLimitIndexCreated = true;
  } catch {
    // 이미 존재하면 무시
    rateLimitIndexCreated = true;
  }
}

/**
 * IP 주소 추출
 *
 * @purpose 반복접수 차단을 위한 클라이언트 IP 식별
 * @note Vercel: x-forwarded-for 헤더 사용, 로컬: x-real-ip 또는 기본값
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

/**
 * URL/IP 패턴 감지 - SSRF 및 스팸 방지
 *
 * @purpose 입력값에 URL이나 IP 주소가 포함되면 차단
 */
const URL_IP_PATTERN = /https?:\/\/|www\.|ftp:\/\/|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i;

function containsUrlOrIp(value: string): boolean {
  return URL_IP_PATTERN.test(value);
}

function validateNoUrlsInFields(data: Record<string, unknown>): string | null {
  const fieldsToCheck = [
    'userName',
    'userPhone',
    'userEmail',
    'companyName',
    'message',
    'businessNumber',
    'region',
  ];
  for (const field of fieldsToCheck) {
    const val = data[field];
    if (typeof val === 'string' && field !== 'userEmail' && containsUrlOrIp(val)) {
      return `입력값에 URL이나 IP 주소를 포함할 수 없습니다. (${field})`;
    }
  }
  return null;
}

// ================================================
// POST /api/consultations - 상담 신청
// ================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const data = await request.json();
    const clientIp = getClientIp(request);

    // ========================================
    // IP 미식별 요청 차단
    // ========================================
    if (clientIp === 'unknown') {
      console.warn(`[Security] IP 미식별 접수 차단`);
      return NextResponse.json(
        { error: '요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.', code: 'BLOCKED' },
        { status: 403 }
      );
    }

    // ========================================
    // 허니팟 필드 검증 (봇 자동입력 탐지)
    // ========================================
    if (data._hp_website) {
      console.warn(`[Security] 허니팟 탐지: ${clientIp}`);
      waitUntil(
        sendTelegram(
          ADMIN_TELEGRAM_CHAT_ID,
          `🍯 <b>허니팟 봇 차단</b>\nIP: <code>${clientIp}</code>\n허니팟값: ${String(data._hp_website).slice(0, 100)}`
        )
      );
      // 봇에게는 성공처럼 보이게 응답
      return NextResponse.json({ success: true, consultationId: 'ok' });
    }

    // ========================================
    // 제출 시간 검증 (3초 미만이면 봇)
    // ========================================
    if (data._formLoadedAt) {
      const elapsed = Date.now() - Number(data._formLoadedAt);
      if (elapsed < 3000) {
        console.warn(`[Security] 제출시간 봇 탐지: ${clientIp} - ${elapsed}ms`);
        waitUntil(
          sendTelegram(
            ADMIN_TELEGRAM_CHAT_ID,
            `⏱️ <b>제출시간 봇 차단</b>\nIP: <code>${clientIp}</code>\n제출소요: ${elapsed}ms (3초 미만)`
          )
        );
        return NextResponse.json({ success: true, consultationId: 'ok' });
      }
    }

    // ========================================
    // Turnstile 토큰 검증 (설정된 경우만)
    // 인앱 브라우저(Instagram, Facebook 등)에서는 Turnstile이 작동하지 않으므로 스킵
    // 허니팟 + 제출시간 검증은 인앱 브라우저에서도 그대로 적용됨
    // ========================================
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    const userAgent = request.headers.get('user-agent') || '';
    const isInAppBrowser = /Instagram|FBAN|FBAV|KAKAOTALK|Line\/|NAVER|Daum/i.test(userAgent);

    if (isInAppBrowser) {
      // 인앱 브라우저: Turnstile 스킵 (허니팟 + 제출시간으로 봇 방지)
      console.log(
        `[Security] 인앱 브라우저 감지 - Turnstile 스킵: ${clientIp} (UA: ${userAgent.slice(0, 80)})`
      );
    } else if (turnstileSecret && data._turnstileToken) {
      const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: data._turnstileToken,
          remoteip: clientIp,
        }),
      });
      const tsData = await tsRes.json();
      if (!tsData.success) {
        console.warn(`[Security] Turnstile 실패: ${clientIp} - ${JSON.stringify(tsData)}`);
        return NextResponse.json(
          {
            error: '보안 검증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.',
            code: 'TURNSTILE_FAILED',
          },
          { status: 403 }
        );
      }
    } else if (turnstileSecret && !data._turnstileToken) {
      // Turnstile이 설정되어 있는데 토큰이 없으면 차단
      console.warn(`[Security] Turnstile 토큰 없음: ${clientIp}`);
      return NextResponse.json(
        {
          error: '보안 검증이 필요합니다. 페이지를 새로고침 후 다시 시도해주세요.',
          code: 'TURNSTILE_MISSING',
        },
        { status: 403 }
      );
    }

    // ========================================
    // 입력값 URL/IP 주소 차단 (SSRF 방지)
    // ========================================
    const urlCheckError = validateNoUrlsInFields(data);
    if (urlCheckError) {
      console.warn(`[Security] URL/IP 입력 차단: ${clientIp} - ${urlCheckError}`);
      waitUntil(
        sendTelegram(
          ADMIN_TELEGRAM_CHAT_ID,
          `🛡️ <b>URL/IP 입력 차단</b>\nIP: <code>${clientIp}</code>\n사유: ${urlCheckError}\n데이터: ${JSON.stringify(data).slice(0, 300)}`
        )
      );
      return NextResponse.json(
        { error: '입력값에 URL이나 IP 주소를 포함할 수 없습니다.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // ========================================
    // IP 블랙리스트 체크 (DB)
    // ========================================
    const client = await clientPromise;
    const db = client.db('naraddon');

    const blacklisted = await db.collection('ip-blacklist').findOne({ ip: clientIp });
    if (blacklisted) {
      console.warn(`[Blacklist] 차단된 IP 접수 시도: ${clientIp} - ${blacklisted.reason}`);
      waitUntil(
        sendTelegram(
          ADMIN_TELEGRAM_CHAT_ID,
          `🚫 <b>블랙리스트 IP 접수 시도</b>\nIP: <code>${clientIp}</code>\n사유: ${blacklisted.reason}\nUA: ${request.headers.get('user-agent') || 'unknown'}`
        )
      );
      return NextResponse.json(
        { error: '접수가 제한된 상태입니다. 고객센터에 문의해주세요.', code: 'BLOCKED' },
        { status: 403 }
      );
    }

    // ========================================
    // 반복접수 차단 (IP+전화번호 동일인 판별)
    // ========================================
    await ensureRateLimitIndex(db);
    const rateLimitCollection = db.collection('consultation-rate-limits');
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const userPhone = data.userPhone || data.contactPhone || '';

    // 1차: 동일인 체크 (IP + 전화번호 조합)
    const samePersonCount = await rateLimitCollection.countDocuments({
      ip: clientIp,
      phone: userPhone,
      createdAt: { $gte: windowStart },
    });

    if (samePersonCount >= RATE_LIMIT_MAX_REQUESTS) {
      console.warn(
        `[RateLimit] 동일인 차단: IP ${clientIp}, 전화 ${userPhone} - ${samePersonCount}회 (30분 내)`
      );
      return NextResponse.json(
        {
          error: '이미 접수가 완료되었습니다. 동일한 건으로 중복 접수는 제한됩니다.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    // 2차: 같은 IP 전체 봇 방지 (IP만, 10회 이상이면 봇 의심)
    const ipTotalCount = await rateLimitCollection.countDocuments({
      ip: clientIp,
      createdAt: { $gte: windowStart },
    });

    if (ipTotalCount >= IP_ONLY_RATE_LIMIT_MAX) {
      console.warn(`[RateLimit] IP 전체 차단: ${clientIp} - ${ipTotalCount}회 (30분 내)`);
      waitUntil(
        sendTelegram(
          ADMIN_TELEGRAM_CHAT_ID,
          `🚫 <b>IP 대량접수 차단</b>\nIP: <code>${clientIp}</code>\n30분 내 ${ipTotalCount}회 접수\nUA: ${request.headers.get('user-agent') || 'unknown'}`
        )
      );
      return NextResponse.json(
        {
          error: '짧은 시간 내 너무 많은 요청이 감지되었습니다. 잠시 후 다시 시도해주세요.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    // 참고: 접수 기록은 실제 DB 저장 성공 후에 기록 (아래 insertOne 이후)

    const consultation: Partial<ConsultationRequest> = {
      source: ConsultationSource.WEB_FORM,
      customerType: session ? CustomerType.MEMBER : CustomerType.NON_MEMBER,
      userId: session ? (session.user as any)?.id || session.user?.email : undefined,
      userName: data.userName || session?.user?.name || '',
      userEmail: data.userEmail || session?.user?.email || '',
      userPhone: data.userPhone || '',
      companyName: data.companyName || '',
      businessNumber: data.businessNumber || '',
      consultationType: data.isExaminerConsultation
        ? '기업심사관 상담'
        : data.consultationType || '전문가 상담',
      consultationField: data.consultationField,
      message: data.message || '',
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      preferredTime: data.preferredTime || data.desiredTime,
      annualRevenue: data.annualRevenue,
      employeeCount: data.employeeCount,
      region: data.region,
      desiredTime: data.desiredTime,
      consultTypeDetail: data.consultType,
      status: ConsultationStatus.PENDING,
      currentPhase: ConsultationPhase.PHONE,
      createdAt: new Date(),
      updatedAt: new Date(),
      clientIp, // 접수 IP 기록
    };

    // 필수 필드 검증
    if (!consultation.userName || !consultation.userEmail || !consultation.userPhone) {
      return NextResponse.json({ error: '필수 정보를 모두 입력해주세요.' }, { status: 400 });
    }

    // ========================================
    // STEP 1: MongoDB 저장 (필수 - 실패 시 에러 반환)
    // ========================================
    const result = await db.collection('consultations').insertOne(consultation);

    // 실제 접수 성공 후에만 rate limit 카운트 기록 (IP+전화번호로 동일인 판별)
    await rateLimitCollection.insertOne({
      ip: clientIp,
      phone: userPhone,
      createdAt: new Date(),
      userAgent: request.headers.get('user-agent') || '',
    });

    // ========================================
    // STEP 2: 즉시 응답 반환 (사용자 대기 없음)
    // ========================================
    const response = NextResponse.json({
      success: true,
      consultationId: result.insertedId,
      message: '상담 신청이 접수되었습니다. 담당자 배정 후 연락드리겠습니다.',
    });

    // ========================================
    // STEP 3: 백그라운드에서 알림/저장 처리 (waitUntil)
    // ========================================
    waitUntil(
      (async () => {
        const pipelineId = `${consultation.userName}|${consultation.userPhone}|${new Date().toISOString()}`;
        console.log(`[Pipeline] 시작: ${pipelineId}`);

        const errors: string[] = [];

        const [
          telegramResult,
          staffEmailResult,
          customerEmailResult,
          airtableResult,
          sheetsResult,
        ] = await Promise.allSettled([
          notifyAdminTelegram(consultation, []),
          sendStaffEmail(consultation, data),
          sendCustomerEmail(consultation, data),
          saveToAirtable(consultation, data),
          saveToGoogleSheets(consultation, data),
        ]);

        const results = {
          telegram:
            telegramResult.status === 'fulfilled'
              ? telegramResult.value
              : {
                  success: false,
                  error: `rejected: ${(telegramResult as PromiseRejectedResult).reason}`,
                },
          staffEmail:
            staffEmailResult.status === 'fulfilled'
              ? staffEmailResult.value
              : {
                  success: false,
                  error: `rejected: ${(staffEmailResult as PromiseRejectedResult).reason}`,
                },
          customerEmail:
            customerEmailResult.status === 'fulfilled'
              ? customerEmailResult.value
              : {
                  success: false,
                  error: `rejected: ${(customerEmailResult as PromiseRejectedResult).reason}`,
                },
          airtable:
            airtableResult.status === 'fulfilled'
              ? airtableResult.value
              : {
                  success: false,
                  error: `rejected: ${(airtableResult as PromiseRejectedResult).reason}`,
                },
          sheets:
            sheetsResult.status === 'fulfilled'
              ? sheetsResult.value
              : {
                  success: false,
                  error: `rejected: ${(sheetsResult as PromiseRejectedResult).reason}`,
                },
        };

        // 모든 결과를 console.log로 남김 (Vercel 로그에서 확인 가능)
        const ok = (r: { success: boolean }) => (r.success ? '✅' : '❌');
        console.log(
          `[Pipeline] ${ok(results.telegram)} 텔레그램: ${results.telegram.success ? 'OK' : results.telegram.error}`
        );
        console.log(
          `[Pipeline] ${ok(results.staffEmail)} 스태프이메일: ${results.staffEmail.success ? 'OK' : results.staffEmail.error}`
        );
        console.log(
          `[Pipeline] ${ok(results.customerEmail)} 고객이메일: ${results.customerEmail.success ? 'OK' : results.customerEmail.error}`
        );
        console.log(
          `[Pipeline] ${ok(results.airtable)} Airtable: ${results.airtable.success ? 'OK' : results.airtable.error}`
        );
        console.log(
          `[Pipeline] ${ok(results.sheets)} Sheets: ${results.sheets.success ? 'OK' : results.sheets.error}`
        );

        if (!results.telegram.success)
          errors.push(`텔레그램(${CUSTOMER_DB_CHAT_ID}): ${results.telegram.error}`);
        if (!results.staffEmail.success && STAFF_NOTIFICATION_EMAILS)
          errors.push(`스태프이메일: ${results.staffEmail.error}`);
        if (!results.customerEmail.success)
          errors.push(`고객이메일: ${results.customerEmail.error}`);
        if (!results.airtable.success) errors.push(`Airtable: ${results.airtable.error}`);
        if (!results.sheets.success && GOOGLE_SHEETS_URL)
          errors.push(`Sheets: ${results.sheets.error}`);

        if (errors.length > 0) {
          console.error(`[Pipeline] ⚠️ 실패 항목 ${errors.length}개: ${errors.join(' | ')}`);
        } else {
          console.log(`[Pipeline] ✨ 모든 단계 정상 완료`);
        }

        // 디버그 보고 (텔레그램)
        const debugMsg = [
          `🔧 <b>접수 파이프라인 보고</b>`,
          `👤 ${escapeHtml(consultation.userName || '')} | ${consultation.userPhone}`,
          '',
          `${ok(results.telegram)} 텔레그램 알림`,
          `${ok(results.staffEmail)} 스태프 이메일${!STAFF_NOTIFICATION_EMAILS ? ' (미설정)' : ''}`,
          `${ok(results.customerEmail)} 고객 확인 이메일`,
          `${ok(results.airtable)} Airtable 저장`,
          GOOGLE_SHEETS_URL
            ? `${ok(results.sheets)} Google Sheets 저장`
            : '⏭️ Google Sheets (URL 미설정)',
          '',
          errors.length > 0
            ? errors.map((e) => `⚠️ ${escapeHtml(e)}`).join('\n')
            : '✨ 모든 단계 정상',
        ].join('\n');

        const debugResult = await sendTelegram(ADMIN_TELEGRAM_CHAT_ID, debugMsg);
        if (!debugResult.ok) {
          console.error(`[Pipeline] 디버그 텔레그램도 실패: ${debugResult.error}`);
          console.error(
            `[Pipeline] 봇토큰 존재: ${!!ADMIN_TELEGRAM_BOT_TOKEN}, 길이: ${ADMIN_TELEGRAM_BOT_TOKEN.length}`
          );
          console.error(
            `[Pipeline] 디버그 채팅ID: ${ADMIN_TELEGRAM_CHAT_ID}, 고객DB 채팅ID: ${CUSTOMER_DB_CHAT_ID}`
          );
        }
      })().catch(async (err) => {
        console.error(`[Pipeline] 치명적 오류: ${String(err)}`);
        console.error(
          `[Pipeline] 봇토큰 존재: ${!!ADMIN_TELEGRAM_BOT_TOKEN}, 길이: ${ADMIN_TELEGRAM_BOT_TOKEN.length}`
        );
        const r = await sendTelegram(
          ADMIN_TELEGRAM_CHAT_ID,
          `🔥 <b>백그라운드 파이프라인 오류</b>\n\n${String(err)}`
        ).catch(() => ({ ok: false }));
      })
    );

    return response;
  } catch (error) {
    console.error('Failed to create consultation:', error);

    // 치명적 오류도 관리자에게 알림
    await sendTelegram(
      ADMIN_TELEGRAM_CHAT_ID,
      `🔥 <b>상담 접수 치명적 오류</b>\n\n${String(error)}`
    ).catch(() => {});

    return NextResponse.json({ error: '상담 신청 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
