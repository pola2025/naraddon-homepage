// 웹훅 직접 테스트 스크립트

const testWebhook = async () => {
  console.log('🚀 웹훅 직접 테스트 시작...\n');

  const webhookUrl = 'https://script.google.com/macros/s/AKfycbyzrH3BgdAyqyqw-Mzk013BGkCAZEPnej_Jd7DpN_0g-hKP8qJH85aEdCFlSHxRY3ybZQ/exec';

  const webhookPayload = {
    auth: {
      secret: 'o8yxUnAE6pHq7fSaj9JYkRz5sU2nB4dM3P1WZTxi07g'
    },
    submission: {
      name: '웹훅테스트고객',
      phone: '010-9999-8888',
      email: 'webhook-test@example.com',
      region: '서울 강남구',
      businessNumber: '999-88-77777',
      consultType: '기업심사관 상담',
      annualRevenue: '10억원~50억원',
      employeeCount: '30~100명',
      desiredTime: '오전 10시',
      preferredTime: '즉시',
      message: '웹훅 직접 테스트입니다. 구글 스프레드시트, 이메일, 텔레그램 알림을 확인하세요.',
      privacyConsent: true,
      marketingConsent: false
    },
    submittedAt: new Date().toISOString(),
    meta: {
      source: 'WEB_FORM',
      isAuditorConsultation: true
    },
    notification: {
      emails: ['jjk_naraddon@naver.com', 'imjoo@jjk-biz.com', 'ijy@jjk-biz.com', 'syj@jjk-biz.com', 'mkt9834@gmail.com'],
      telegram: {
        enabled: true
      },
      sms: {
        enabled: false
      }
    }
  };

  console.log('📤 웹훅 URL:', webhookUrl);
  console.log('\n📋 요청 데이터:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  console.log('\n-------------------\n');

  try {
    console.log('⏳ 웹훅 호출 중...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log(`\n📬 응답 상태: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log('\n📥 응답 내용:');
    console.log(responseText);

    if (response.ok) {
      console.log('\n✅ 웹훅 호출 성공!');
      console.log('-------------------');
      console.log('확인해야 할 항목:');
      console.log('1. 구글 스프레드시트: https://docs.google.com/spreadsheets/d/1s1F6yw3ioJv1_pzI_OKG1u_st1S2pGRc99jqsUQbnIw');
      console.log('   - 새로운 행이 추가되었는지 확인');
      console.log('2. 이메일: jjk_naraddon@naver.com');
      console.log('   - 상담 신청 알림 이메일 수신 확인');
      console.log('3. 텔레그램: 채팅 ID -1002948627243');
      console.log('   - 알림 메시지 수신 확인');
    } else {
      console.log('\n❌ 웹훅 호출 실패');
      console.log('응답 코드:', response.status);
      console.log('응답 내용:', responseText);
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('상세 오류:', error);
  }
};

// 테스트 실행
testWebhook();