/**
 * 환영 이메일 발송 테스트 스크립트
 *
 * 사용법:
 * node scripts/test-welcome-email.js
 */

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyPLBKI5CTDEHp4RAVLszclvK9HODXZf2FRPdziMwLVOP2OsXZDBvfT2jaX1CmdMZHvRg/exec';

// 테스트용 이메일 데이터
const testEmailData = {
  type: 'welcome_email',
  recipient: {
    name: '테스트 사용자',
    email: 'mkt@polarad.co.kr'  // 테스트 수신 이메일
  },
  data: {
    provider: 'naver',
    registeredAt: new Date().toISOString(),
    websiteUrl: 'https://naraddon.com',
    loginUrl: 'https://naraddon.com/auth/signin',
    myPageUrl: 'https://naraddon.com/mypage'
  },
  emailContent: {
    subject: '[나라똔] 회원가입을 환영합니다! 🎉',
    template: 'welcome',
    variables: {
      userName: '테스트 사용자',
      provider: '네이버',
      year: new Date().getFullYear()
    }
  }
};

async function testWelcomeEmail() {
  console.log('🧪 환영 이메일 발송 테스트 시작...\n');
  console.log('📧 수신자:', testEmailData.recipient.email);
  console.log('👤 이름:', testEmailData.recipient.name);
  console.log('🔑 가입 경로:', testEmailData.data.provider);
  console.log('\n📤 Google Apps Script 웹훅 호출 중...\n');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailData)
    });

    console.log('📊 응답 상태:', response.status, response.statusText);

    const result = await response.json();

    console.log('\n📬 응답 결과:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ 환영 이메일 발송 성공!');
      console.log(`📧 ${testEmailData.recipient.email}로 이메일이 발송되었습니다.`);
      console.log('📮 이메일함을 확인해주세요. (스팸함도 확인)');
    } else {
      console.log('\n❌ 이메일 발송 실패');
      console.log('에러:', result.message);
    }

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('상세:', error);
  }
}

// 테스트 실행
testWelcomeEmail();
