require('dotenv').config({ path: '.env.local' });

async function testPolicyAPI() {
  // 1. examinerKey로 테스트
  console.log('=== 1. examinerKey로 API 호출 ===');
  const url1 = 'http://localhost:3000/api/policy-analysis?examinerKey=kim-tae-eun';
  console.log('URL:', url1);

  try {
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    console.log('응답:', JSON.stringify(data1, null, 2));
  } catch (err) {
    console.error('에러:', err.message);
  }

  // 2. examinerName으로 테스트
  console.log('\n=== 2. examinerName으로 API 호출 ===');
  const url2 = 'http://localhost:3000/api/policy-analysis?examinerName=김태은';
  console.log('URL:', url2);

  try {
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    console.log('응답:', JSON.stringify(data2, null, 2));
  } catch (err) {
    console.error('에러:', err.message);
  }

  // 3. 둘 다로 테스트
  console.log('\n=== 3. examinerKey + examinerName으로 API 호출 ===');
  const url3 = 'http://localhost:3000/api/policy-analysis?examinerKey=kim-tae-eun&examinerName=김태은';
  console.log('URL:', url3);

  try {
    const res3 = await fetch(url3);
    const data3 = await res3.json();
    console.log('응답:', JSON.stringify(data3, null, 2));
  } catch (err) {
    console.error('에러:', err.message);
  }
}

testPolicyAPI().catch(console.error);
