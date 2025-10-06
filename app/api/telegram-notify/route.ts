import { NextRequest, NextResponse } from 'next/server';

/**
 * Telegram 알림 API
 *
 * 사용자 응답 필요 시 텔레그램으로 메시지 전송
 *
 * POST /api/telegram-notify
 * Body: { message: string, type: 'info' | 'warning' | 'success' | 'error' }
 */

interface TelegramNotifyRequest {
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  details?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TelegramNotifyRequest = await request.json();
    const { message, type = 'info', details } = body;

    // 환경변수 확인
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('⚠️  Telegram 설정 없음 - 메시지 전송 스킵');
      return NextResponse.json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 미설정',
        skipped: true
      });
    }

    // 아이콘 및 포맷팅
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌'
    };

    const icon = icons[type];

    // 메시지 포맷팅 (Markdown)
    let telegramMessage = `${icon} *Claude A 알림*\n\n`;
    telegramMessage += `${message}\n`;

    if (details) {
      telegramMessage += `\n📋 상세:\n${details}`;
    }

    telegramMessage += `\n\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

    // Telegram API 호출
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API 오류: ${error.description || response.statusText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      messageId: result.result.message_id,
      sentAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Telegram 알림 실패:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET 요청: 상태 확인용
export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  return NextResponse.json({
    configured: !!(botToken && chatId),
    botToken: botToken ? '설정됨 (****' + botToken.slice(-4) + ')' : '미설정',
    chatId: chatId ? '설정됨 (****' + chatId.slice(-4) + ')' : '미설정',
  });
}
