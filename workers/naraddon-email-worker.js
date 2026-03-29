/**
 * 나라똔 고객 이메일 발송 Worker
 *
 * Resend API를 사용하여 HTML 구조화된 이메일 발송
 *
 * 환경변수 설정 필요:
 * - RESEND_API_KEY: Resend API 키
 * - WORKER_SECRET: 웹훅 인증용 시크릿 (선택)
 */

// 나라똔 브랜드 컬러
const BRAND_COLORS = {
  primaryDark: '#1B4332',
  accent: '#52B788',
  light: '#74C69D',
  white: '#FFFFFF',
  text: '#1a1a1a',
  textMuted: '#666666',
  label: '#888888',
  sectionLabel: '#777777',
  border: '#f0f0f0',
  footerBg: '#fafafa',
  bannerBg: '#edf7f0',
  bannerText: '#2d5a3f',
};

// HTML 이스케이프
function sanitizeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 한국 시간 포맷
function formatKstDate(date) {
  return new Date(date).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// 짧은 날짜 포맷 (2026.02.27)
function formatShortDate(submittedAtText) {
  const digits = submittedAtText.replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return submittedAtText;
}

// 고객용 이메일 HTML 생성
function buildCustomerEmailHtml(submission, submittedAtText) {
  const c = BRAND_COLORS;
  const customerName = submission.name || '고객';
  const receiptNumber = submittedAtText.replace(/[^0-9]/g, '').slice(0, 12);
  const shortDate = formatShortDate(submittedAtText);
  const consultType = sanitizeHtml(submission.consultType || '-');
  const desiredTime = sanitizeHtml(submission.desiredTime || submission.preferredTime || '-');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Pretendard',-apple-system,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;">
    <!-- 헤더 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${c.primaryDark};">
      <tr>
        <td style="padding:16px 20px;font-size:13px;font-weight:700;color:${c.light};letter-spacing:3px;">NARADDON</td>
        <td style="padding:16px 20px;font-size:10px;color:${c.accent};letter-spacing:1px;text-align:right;white-space:nowrap;">CONFIRMED</td>
      </tr>
    </table>
    <!-- 배너 -->
    <div style="background:${c.bannerBg};border-left:3px solid ${c.accent};padding:10px 20px;font-size:13px;color:${c.bannerText};">
      상담 신청이 정상적으로 접수되었습니다 &mdash; ${submittedAtText}
    </div>
    <!-- 인사말 -->
    <div style="padding:28px 20px 16px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Welcome</div>
      <div style="font-size:18px;color:#333;margin-bottom:8px;">안녕하세요, <strong>${sanitizeHtml(customerName)}</strong>님</div>
      <div style="font-size:14px;color:#666;line-height:1.6;">나라똔 상담 서비스에 신청해 주셔서 감사합니다.<br>전문 상담사가 빠른 시일 내에 연락드리겠습니다.</div>
    </div>
    <!-- 접수 정보: 2x2 그리드 -->
    <div style="padding:4px 20px 20px;">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Details</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:12px 16px;border:1px solid #e5e7eb;width:50%;vertical-align:top;">
            <div style="font-size:10px;color:#999;letter-spacing:1px;margin-bottom:4px;">접수번호</div>
            <div style="font-size:14px;color:#333;font-weight:600;">${receiptNumber}</div>
          </td>
          <td style="padding:12px 16px;border:1px solid #e5e7eb;width:50%;vertical-align:top;">
            <div style="font-size:10px;color:#999;letter-spacing:1px;margin-bottom:4px;">접수일시</div>
            <div style="font-size:14px;color:#333;font-weight:600;">${shortDate}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border:1px solid #e5e7eb;width:50%;vertical-align:top;">
            <div style="font-size:10px;color:#999;letter-spacing:1px;margin-bottom:4px;">상담분야</div>
            <div style="font-size:14px;color:#333;font-weight:600;">${consultType}</div>
          </td>
          <td style="padding:12px 16px;border:1px solid #e5e7eb;width:50%;vertical-align:top;">
            <div style="font-size:10px;color:#999;letter-spacing:1px;margin-bottom:4px;">희망시간</div>
            <div style="font-size:14px;color:#333;font-weight:600;">${desiredTime}</div>
          </td>
        </tr>
      </table>
    </div>
    <!-- CTA -->
    <div style="padding:0 20px 24px;">
      <div style="background:${c.primaryDark};border-radius:8px;padding:20px;text-align:center;">
        <div style="color:#fff;font-size:16px;font-weight:700;">영업일 기준 24시간 이내 연락드리겠습니다</div>
        <div style="color:${c.accent};font-size:13px;margin-top:6px;">전문 상담사가 맞춤 상담을 진행합니다</div>
      </div>
    </div>
    <!-- 푸터 -->
    <div style="border-top:1px solid #eee;padding:16px 20px;text-align:center;">
      <span style="font-size:12px;color:${c.accent};">나라똔</span>
      <span style="font-size:12px;color:#ccc;"> &middot; </span>
      <span style="font-size:12px;color:#999;">소상공인 정책자금 플랫폼 &middot; 본 메일은 발신 전용입니다</span>
    </div>
  </div>
</body>
</html>`;
}

// Resend API로 이메일 발송
async function sendEmailViaResend(env, to, submission, submittedAtText) {
  const html = buildCustomerEmailHtml(submission, submittedAtText);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '나라똔 <noreply@mail.policy-fund.online>',
      to: to,
      subject: '[나라똔] 상담 신청이 접수되었습니다',
      html: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Resend] 발송 실패:', response.status, errorText);
    return { success: false, error: errorText, status: response.status };
  }

  const result = await response.json();
  console.log('[Resend] 발송 성공:', to, result.id);
  return { success: true, id: result.id };
}

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 메인 핸들러
export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // POST만 허용
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const payload = await request.json();

      // 시크릿 검증 (선택)
      if (env.WORKER_SECRET) {
        const providedSecret = payload.auth?.secret || '';
        if (providedSecret !== env.WORKER_SECRET) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { to, submission, submittedAt } = payload;

      if (!to || !submission) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, submission' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const submittedAtText = formatKstDate(submittedAt || new Date().toISOString());
      const result = await sendEmailViaResend(env, to, submission, submittedAtText);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[Worker] 오류:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
