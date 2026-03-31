import { NextRequest, NextResponse } from 'next/server';

/**
 * 파트너십 제휴문의 API
 *
 * 제휴문의 내용을 텔레그램으로 전송
 *
 * POST /api/partnership-inquiry
 * Body: { contact: string, email: string, content: string }
 */

interface PartnershipInquiryRequest {
  contact: string;
  email: string;
  content: string;
}

// 제휴문의 전용 텔레그램 채팅 ID (환경변수에서 가져옴)
const PARTNERSHIP_CHAT_ID = process.env.TELEGRAM_CHAT_ID_AUDITOR;

export async function POST(request: NextRequest) {
  // IP 추출
  const ip =
    request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Rate limiting (3회/시간/IP)
  try {
    const { checkRateLimit, recordRateLimitHit } = await import('@/lib/rate-limit-middleware');
    const rlKey = `partnership:${ip}`;
    const rl = await checkRateLimit({ key: rlKey, maxRequests: 3, windowSeconds: 3600 });
    if (!rl.allowed) {
      console.warn(`[나라똔:제휴문의] rate limit 초과 IP=${ip}`);
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }
    await recordRateLimitHit(rlKey);
  } catch {
    // rate limit 실패 시 통과
  }

  try {
    let body: PartnershipInquiryRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }
    const { contact, email, content } = body;

    // 필수 필드 검증
    if (!contact || !email || !content) {
      return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식을 입력해주세요.' }, { status: 400 });
    }

    // 환경변수에서 텔레그램 봇 토큰 가져오기 (LEAD용 토큰 사용)
    const botToken = process.env.LEAD_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || !PARTNERSHIP_CHAT_ID) {
      console.error('❌ 텔레그램 환경변수 미설정:', {
        botToken: !!botToken,
        chatId: !!PARTNERSHIP_CHAT_ID,
      });
      return NextResponse.json({ error: '서버 설정 오류가 발생했습니다.' }, { status: 500 });
    }

    // 텔레그램 메시지 포맷팅
    const telegramMessage = `🤝 *파트너십 제휴문의*

📞 *담당자 연락처:* ${escapeMarkdown(contact)}
📧 *이메일:* ${escapeMarkdown(email)}

📝 *제휴문의 내용:*
${escapeMarkdown(content)}

⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

    // Telegram API 호출
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: PARTNERSHIP_CHAT_ID,
        text: telegramMessage,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API 오류:', error);
      throw new Error(`Telegram API 오류: ${error.description || response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ 파트너십 제휴문의 전송 성공:', {
      contact,
      email,
      messageId: result.result.message_id,
    });

    return NextResponse.json({
      success: true,
      message: '제휴문의가 성공적으로 전송되었습니다.',
      messageId: result.result.message_id,
    });
  } catch (error: unknown) {
    console.error('[나라똔:제휴문의] 전송 실패:', error);

    return NextResponse.json(
      { error: '전송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}

/**
 * Telegram Markdown 특수문자 이스케이프
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`');
}
