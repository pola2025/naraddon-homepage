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
  primary: '#2D6A4F',
  secondary: '#40916C',
  accent: '#52B788',
  light: '#74C69D',
  veryLight: '#95D5B2',
  background: '#D8F3DC',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#4B5563',
  border: '#E5E7EB'
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
    hour12: false
  });
}

// 고객용 이메일 HTML 생성
function buildCustomerEmailHtml(submission, submittedAtText) {
  const c = BRAND_COLORS;
  const customerName = submission.name || '고객';
  const receiptNumber = submittedAtText.replace(/[^0-9]/g, '').slice(0, 12);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
  <div style="font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:${c.white};">
    <div style="background:linear-gradient(135deg,${c.primary} 0%,${c.secondary} 100%);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center;">
      <div style="width:60px;height:60px;background:${c.white};border-radius:50%;margin:0 auto 16px;line-height:60px;font-size:28px;">✅</div>
      <h1 style="margin:0;color:${c.white};font-size:24px;font-weight:700;">상담 신청 완료</h1>
      <p style="margin:12px 0 0;color:${c.veryLight};font-size:15px;">접수가 정상적으로 완료되었습니다</p>
    </div>
    <div style="padding:32px 24px;">
      <div style="background:${c.background};padding:24px;border-radius:12px;margin-bottom:24px;border-left:4px solid ${c.accent};">
        <p style="margin:0 0 12px;font-size:18px;color:${c.text};">안녕하세요, <strong style="color:${c.primary};">${sanitizeHtml(customerName)}</strong>님</p>
        <p style="margin:0;color:${c.textLight};font-size:14px;line-height:1.7;">나라똔 상담 서비스에 신청해 주셔서 감사합니다.<br>전문 상담사가 빠른 시일 내에 연락드리겠습니다.</p>
      </div>
      <div style="background:${c.white};border:1px solid ${c.border};border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <div style="background:${c.primary};padding:16px 20px;">
          <h3 style="margin:0;color:${c.white};font-size:15px;font-weight:600;">📋 접수 내용</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:14px 20px;font-size:13px;color:${c.textLight};border-bottom:1px solid ${c.border};width:100px;">접수번호</td>
            <td style="padding:14px 20px;font-size:14px;color:${c.text};font-weight:600;border-bottom:1px solid ${c.border};">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;font-size:13px;color:${c.textLight};border-bottom:1px solid ${c.border};">접수일시</td>
            <td style="padding:14px 20px;font-size:14px;color:${c.text};border-bottom:1px solid ${c.border};">${submittedAtText}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;font-size:13px;color:${c.textLight};border-bottom:1px solid ${c.border};">상담 분야</td>
            <td style="padding:14px 20px;font-size:14px;color:${c.primary};font-weight:600;border-bottom:1px solid ${c.border};">${sanitizeHtml(submission.consultType || '-')}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;font-size:13px;color:${c.textLight};">희망 시간</td>
            <td style="padding:14px 20px;font-size:14px;color:${c.text};">${sanitizeHtml(submission.desiredTime || submission.preferredTime || '-')}</td>
          </tr>
        </table>
      </div>
      <div style="background:linear-gradient(135deg,${c.secondary} 0%,${c.accent} 100%);padding:24px;border-radius:12px;text-align:center;">
        <p style="margin:0 0 8px;color:${c.white};font-size:16px;font-weight:700;">📞 영업일 기준 24시간 이내</p>
        <p style="margin:0;color:${c.background};font-size:14px;">전문 상담사가 연락드리겠습니다</p>
      </div>
    </div>
    <div style="background:${c.primaryDark};padding:24px;text-align:center;border-radius:0 0 12px 12px;">
      <p style="margin:0 0 8px;color:${c.white};font-size:14px;font-weight:600;">나라똔</p>
      <p style="margin:0 0 4px;color:${c.light};font-size:12px;">소상공인 정책자금 플랫폼</p>
      <p style="margin:12px 0 0;color:${c.veryLight};font-size:11px;">본 메일은 발신 전용입니다.</p>
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
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: '나라똔 <noreply@mail.policy-fund.online>',
      to: to,
      subject: '[나라똔] 상담 신청이 접수되었습니다',
      html: html
    })
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      const { to, submission, submittedAt } = payload;

      if (!to || !submission) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, submission' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const submittedAtText = formatKstDate(submittedAt || new Date().toISOString());
      const result = await sendEmailViaResend(env, to, submission, submittedAtText);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[Worker] 오류:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
