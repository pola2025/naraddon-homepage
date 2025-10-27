/**
 * 텔레그램 알림 테스트 스크립트
 *
 * @purpose 프로덕션 배포 전 텔레그램 알림 기능 검증
 * @usage ts-node scripts/test-telegram.ts
 */

import { sendTelegramMessage, notifyNewUserSignup } from '../lib/telegram';

async function testTelegram() {
  console.log('🧪 Telegram 알림 테스트 시작...\n');

  // 1. 기본 메시지 전송 테스트
  console.log('1️⃣ 기본 메시지 전송 테스트...');
  const basicResult = await sendTelegramMessage('🧪 테스트 메시지입니다.');
  console.log('결과:', basicResult ? '✅ 성공' : '❌ 실패');
  console.log('');

  // 2. 신규 회원 가입 알림 테스트
  console.log('2️⃣ 신규 회원 가입 알림 테스트...');
  const signupResult = await notifyNewUserSignup({
    name: '홍길동',
    email: 'test@example.com',
    mobile: '010-1234-5678',
    provider: 'naver',
  });
  console.log('결과:', signupResult !== false ? '✅ 성공' : '❌ 실패');
  console.log('');

  // 3. 마크다운 포맷 테스트
  console.log('3️⃣ 마크다운 포맷 테스트...');
  const markdownMessage = `
🎉 *신규 회원 가입 테스트*

👤 이름: 홍길동
📧 이메일: test@example.com
📱 전화번호: 010-1234-5678
🔐 가입 방법: naver
📅 가입 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
  `.trim();

  const markdownResult = await sendTelegramMessage(markdownMessage);
  console.log('결과:', markdownResult ? '✅ 성공' : '❌ 실패');
  console.log('');

  console.log('✅ 모든 테스트 완료!');
}

// 실행
testTelegram().catch(console.error);
