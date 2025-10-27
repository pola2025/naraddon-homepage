/**
 * 텔레그램 알림 유틸리티
 *
 * @purpose 관리자에게 중요 이벤트 실시간 알림 전송
 * @context 신규 가입, 상담 신청 등 주요 이벤트 발생 시 텔레그램으로 알림
 * @security 환경변수를 통한 봇 토큰 및 채팅 ID 관리
 */

/**
 * 텔레그램 메시지 전송
 *
 * @param message - 전송할 메시지 (마크다운 지원)
 * @returns 전송 성공 여부
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // 환경변수 미설정 시 로그만 출력하고 에러 발생 안 함 (운영 중단 방지)
  if (!botToken || !chatId) {
    console.warn('[Telegram] Bot token or chat ID not configured');
    console.log('[Telegram] Message would be sent:', message);
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Telegram] Failed to send message:', errorData);
      return false;
    }

    console.log('[Telegram] Message sent successfully');
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

/**
 * 신규 사용자 가입 알림
 *
 * @param user - 가입한 사용자 정보
 */
export async function notifyNewUserSignup(user: {
  name: string;
  email: string;
  mobile?: string;
  provider: string;
}): Promise<boolean> {
  const message = `
🎉 *신규 회원 가입*

👤 이름: ${user.name}
📧 이메일: ${user.email}
📱 전화번호: ${user.mobile || 'N/A'}
🔐 가입 방법: ${user.provider}
📅 가입 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
  `.trim();

  return await sendTelegramMessage(message);
}

/**
 * 상담 신청 알림
 *
 * @param consultation - 상담 신청 정보
 */
export async function notifyNewConsultation(consultation: {
  userName: string;
  userEmail: string;
  consultationType: string;
}) {
  const message = `
📝 *새로운 상담 신청*

👤 이름: ${consultation.userName}
📧 이메일: ${consultation.userEmail}
📋 상담 유형: ${consultation.consultationType}
📅 신청 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
  `.trim();

  await sendTelegramMessage(message);
}
