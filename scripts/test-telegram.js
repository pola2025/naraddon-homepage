/**
 * 텔레그램 알림 테스트 스크립트
 *
 * @purpose 프로덕션 배포 전 텔레그램 알림 기능 검증
 * @usage node scripts/test-telegram.js
 */

// 환경변수 로드
require('dotenv').config({ path: '.env.local' });

async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log('[Debug] Bot Token:', botToken ? '✅ 설정됨' : '❌ 없음');
  console.log('[Debug] Chat ID:', chatId ? '✅ 설정됨' : '❌ 없음');

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

    const result = await response.json();
    console.log('[Telegram] ✅ Message sent successfully:', result.ok);
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

async function testTelegram() {
  console.log('🧪 Telegram 알림 테스트 시작...\n');

  // 1. 기본 메시지 전송 테스트
  console.log('1️⃣ 기본 메시지 전송 테스트...');
  const basicResult = await sendTelegramMessage('🧪 테스트 메시지입니다.');
  console.log('결과:', basicResult ? '✅ 성공' : '❌ 실패');
  console.log('');

  // 2. 신규 회원 가입 알림 테스트
  console.log('2️⃣ 신규 회원 가입 알림 테스트...');
  const signupMessage = `
🎉 *신규 회원 가입 테스트*

👤 이름: 홍길동
📧 이메일: test@example.com
📱 전화번호: 010-1234-5678
🔐 가입 방법: naver
📅 가입 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
  `.trim();

  const signupResult = await sendTelegramMessage(signupMessage);
  console.log('결과:', signupResult ? '✅ 성공' : '❌ 실패');
  console.log('');

  console.log('✅ 모든 테스트 완료!');
}

// 실행
testTelegram().catch(console.error);
