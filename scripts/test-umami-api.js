/**
 * Umami Analytics API 연결 테스트
 *
 * @purpose Umami Analytics API 정상 작동 확인
 * @context 사이트 방문자 통계 데이터 수집
 */

import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config({ path: '.env.local' });

async function testUmamiAPI() {
  console.log('============================================================');
  console.log('Umami Analytics API 연결 테스트 시작');
  console.log('============================================================\n');

  try {
    // 1. 환경변수 확인
    console.log('[1] 환경변수 확인:');
    const apiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://cloud.umami.is';
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const username = process.env.UMAMI_USERNAME;
    const password = process.env.UMAMI_PASSWORD;

    console.log(`  - UMAMI_URL: ${apiUrl}`);
    console.log(`  - UMAMI_WEBSITE_ID: ${websiteId ? '설정됨' : '❌ 미설정'}`);
    console.log(`  - UMAMI_USERNAME: ${username ? '설정됨' : '❌ 미설정'}`);
    console.log(`  - UMAMI_PASSWORD: ${password ? '설정됨' : '❌ 미설정'}\n`);

    if (!websiteId || !username || !password) {
      console.log('⚠️  Umami Analytics API 설정이 완료되지 않았습니다.\n');
      console.log('설정 방법:');
      console.log('.env.local에 아래 환경변수 추가:');
      console.log('   NEXT_PUBLIC_UMAMI_URL=https://naraddon-analytics.vercel.app');
      console.log('   NEXT_PUBLIC_UMAMI_WEBSITE_ID=your_website_id');
      console.log('   UMAMI_USERNAME=your_username');
      console.log('   UMAMI_PASSWORD=your_password\n');
      return;
    }

    // 2. 로그인하여 토큰 획득
    console.log('[2] Umami 로그인 중...');
    const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    console.log(`  - HTTP 상태: ${loginResponse.status} ${loginResponse.statusText}`);

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log(`  ❌ 로그인 실패\n`);
      console.log(`응답 내용:\n${errorText}\n`);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('  ✅ 로그인 성공!\n');

    // 3. API 연결 테스트 - 웹사이트 정보 조회
    console.log('[3] 웹사이트 정보 조회 중...');
    console.log(`  대상 URL: ${apiUrl}/api/websites/${websiteId}`);

    const websiteResponse = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`  - HTTP 상태: ${websiteResponse.status} ${websiteResponse.statusText}`);

    if (!websiteResponse.ok) {
      const errorText = await websiteResponse.text();
      console.log(`  ❌ API 호출 실패\n`);
      console.log(`응답 내용:\n${errorText}\n`);
      return;
    }

    const websiteData = await websiteResponse.json();
    console.log('  ✅ 웹사이트 정보 조회 성공\n');

    // 4. 통계 데이터 조회
    console.log('[4] 통계 데이터 조회 중...');

    // 최근 7일 데이터 조회
    const endDate = Date.now();
    const startDate = endDate - (7 * 24 * 60 * 60 * 1000); // 7일 전

    const statsResponse = await fetch(
      `${apiUrl}/api/websites/${websiteId}/stats?startAt=${startDate}&endAt=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.log(`  ⚠️  통계 데이터 조회 실패\n`);
      console.log(`응답 내용:\n${errorText}\n`);
    } else {
      const statsData = await statsResponse.json();
      console.log('  ✅ 통계 데이터 조회 성공\n');

      // 4. 결과 출력
      console.log('============================================================');
      console.log('[4] Umami Analytics 데이터:');
      console.log('============================================================\n');

      console.log('📊 웹사이트 정보:');
      console.log(`  - 도메인: ${websiteData.domain || 'N/A'}`);
      console.log(`  - 이름: ${websiteData.name || 'N/A'}`);
      console.log(`  - ID: ${websiteData.id || websiteId}\n`);

      console.log('📈 최근 7일 통계:');
      console.log(`  - 페이지뷰: ${statsData.pageviews?.value || 0}`);
      console.log(`  - 순 방문자: ${statsData.uniques?.value || 0}`);
      console.log(`  - 방문 수: ${statsData.visits?.value || 0}`);
      console.log(`  - 이탈률: ${statsData.bounces?.value || 0}%`);
      console.log(`  - 평균 세션 시간: ${Math.round((statsData.totaltime?.value || 0) / 1000)}초\n`);
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:');
    console.error('  메시지:', error.message);
    console.error('\n전체 에러:', error);
  }

  console.log('============================================================');
  console.log('✅ 테스트 완료!');
  console.log('============================================================');
}

// 스크립트 실행
testUmamiAPI();
