// 상담신청 테스트 스크립트
// 실행: node test-consultation.js

const testConsultation = async () => {
  console.log('🚀 상담신청 테스트 시작...\n');

  // 테스트 데이터
  const testData = {
    userName: '테스트고객',
    userPhone: '010-1234-5678',
    userEmail: 'test@example.com',
    companyName: '테스트회사',
    businessNumber: '123-45-67890',
    region: '서울 강남구',
    consultationType: '기업심사관 상담',
    annualRevenue: '5억원~10억원',
    employeeCount: '10~30명',
    preferredTime: '즉시',
    desiredTime: '오후 2시~4시',
    message: '정책자금 상담을 받고 싶습니다. 테스트 메시지입니다.',
    isAuditorConsultation: true
  };

  try {
    console.log('📤 요청 데이터:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\n-------------------\n');

    // API 호출
    const response = await fetch('http://localhost:3002/api/consultations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`📬 응답 상태: ${response.status} ${response.statusText}`);

    const result = await response.json();
    console.log('\n📥 응답 데이터:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ 테스트 성공!');
      console.log('-------------------');
      console.log('확인해야 할 항목:');
      console.log('1. MongoDB: consultations 컬렉션에 데이터 저장됨');
      console.log('2. 구글 스프레드시트: https://docs.google.com/spreadsheets/d/1s1F6yw3ioJv1_pzI_OKG1u_st1S2pGRc99jqsUQbnIw');
      console.log('3. 이메일: jjk_naraddon@naver.com 수신 확인');
      console.log('4. 텔레그램: 메시지 수신 확인');
    } else {
      console.log('\n❌ 테스트 실패:', result.error);
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('상세 오류:', error);
  }
};

// 테스트 실행
testConsultation();