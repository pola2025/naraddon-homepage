// 스프레드시트 데이터 확인 안내
console.log('📋 구글 스프레드시트 확인 안내\n');
console.log('스프레드시트 URL:');
console.log('https://docs.google.com/spreadsheets/d/1s1F6yw3ioJv1_pzI_OKG1u_st1S2pGRc99jqsUQbnIw/edit\n');

console.log('방금 테스트한 데이터:');
console.log('-------------------');
console.log('이름: 프로덕션최종테스트');
console.log('전화번호: 010-2222-2222');
console.log('이메일: final@test.com');
console.log('회사명: 최종테스트회사');
console.log('사업자번호: 222-22-22222');
console.log('메시지: 환경변수 수정 후 최종 테스트입니다');
console.log('-------------------\n');

console.log('✅ 확인사항:');
console.log('1. 스프레드시트에 위 데이터가 새로운 행으로 추가되었는지 확인');
console.log('2. 텔레그램 채팅방(-1002948627243)에 알림 메시지가 도착했는지 확인');
console.log('3. 이메일(jjk_naraddon@naver.com 등)로 상담 신청 알림이 도착했는지 확인');
console.log('\n📊 스프레드시트에서 가장 최근 행을 확인하세요.');
console.log('시간은 한국 시간(KST) 기준으로 표시됩니다.');

// 추가 테스트를 위한 다른 데이터
console.log('\n\n🔄 추가 테스트가 필요하다면 아래 명령어를 실행하세요:');
console.log('-------------------');
console.log(`curl -X POST https://naraddon.com/api/consultations \\
  -H "Content-Type: application/json" \\
  -d "{\\"userName\\":\\"추가테스트${Date.now()}\\",\\"userPhone\\":\\"010-3333-3333\\",\\"userEmail\\":\\"test${Date.now()}@example.com\\",\\"companyName\\":\\"테스트회사\\",\\"businessNumber\\":\\"333-33-33333\\",\\"region\\":\\"서울\\",\\"consultationType\\":\\"기업심사관 상담\\",\\"annualRevenue\\":\\"1억원 미만\\",\\"employeeCount\\":\\"5명 미만\\",\\"preferredTime\\":\\"즉시\\",\\"desiredTime\\":\\"오후\\",\\"message\\":\\"프로덕션 웹훅 테스트\\",\\"isAuditorConsultation\\":true}"`);