/**
 * 김지완, 김도현 심사관 계정 문제 진단
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function diagnoseExaminerAccounts() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    const names = ['김지완', '김도현'];

    for (const name of names) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${name} 계정 진단`);
      console.log('='.repeat(60));

      // 1. users 컬렉션 확인
      const user = await db.collection('users').findOne({ name });
      console.log('\n📋 Users 컬렉션:');
      if (user) {
        console.log('  ✅ 찾음');
        console.log(`  이름: ${user.name}`);
        console.log(`  이메일: ${user.email || '❌ 없음'}`);
        console.log(`  역할: ${user.role || 'N/A'}`);
        console.log(`  Provider: ${user.provider || 'N/A'}`);
      } else {
        console.log('  ❌ 찾을 수 없음');
      }

      // 2. expert-examiners 컬렉션 확인
      const examiner = await db.collection('expert-examiners').findOne({ name });
      console.log('\n🎓 Expert-examiners 컬렉션:');
      if (examiner) {
        console.log('  ✅ 찾음');
        console.log(`  ID: ${examiner._id}`);
        console.log(`  이름: ${examiner.name}`);
        console.log(`  이메일: ${examiner.email || '❌ 없음'}`);
        console.log(`  회사명: ${examiner.companyName || 'N/A'}`);
        console.log(`  브랜드 페이지: ${examiner.brandPage ? '있음' : '없음'}`);
      } else {
        console.log('  ❌ 찾을 수 없음');
      }

      // 3. 문제 진단
      console.log('\n🔍 문제 진단:');

      if (!user) {
        console.log('  ❌ users 컬렉션에 계정 없음 → 로그인 불가');
      } else if (!user.email) {
        console.log('  ❌ users 컬렉션에 이메일 없음 → 로그인 불가');
      } else if (user.role !== 'examiner' && user.role !== 'admin') {
        console.log(`  ❌ users 역할이 '${user.role}' → examiner 권한 없음`);
      } else if (!examiner) {
        console.log('  ❌ expert-examiners 컬렉션에 프로필 없음');
      } else if (!examiner.email) {
        console.log('  ❌ expert-examiners에 이메일 없음 → 매칭 실패');
        console.log(`  💡 해결: expert-examiners의 email을 "${user.email}"로 설정 필요`);
      } else if (user.email !== examiner.email) {
        console.log('  ❌ 이메일 불일치 → 매칭 실패');
        console.log(`     Users: "${user.email}"`);
        console.log(`     Examiners: "${examiner.email}"`);
        console.log(`  💡 해결: 두 이메일을 동일하게 맞춰야 함`);
      } else {
        console.log('  ✅ 모든 조건 정상 → 권한 체크 통과해야 함');
        console.log('  💡 다른 문제 가능성: 세션, 쿠키, 캐시 문제');
      }
    }

    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await client.close();
  }
}

diagnoseExaminerAccounts();
