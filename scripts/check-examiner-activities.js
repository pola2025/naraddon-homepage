/**
 * 기업심사관 활동 이력 확인 스크립트
 *
 * @purpose examiner 역할 사용자와 활동 기록 확인
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function checkActivities() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');
    const db = client.db('naraddon');

    // 1. Examiner 역할 사용자 확인
    console.log('=== 1. Examiner 역할 사용자 ===');
    const examinerUsers = await db.collection('users')
      .find({ role: 'examiner' })
      .project({ email: 1, name: 1, createdAt: 1, lastLoginAt: 1 })
      .toArray();

    console.log(`총 ${examinerUsers.length}명의 examiner 역할 사용자:\n`);
    examinerUsers.forEach(user => {
      console.log(`📧 ${user.name || '이름없음'} (${user.email})`);
      console.log(`   가입일: ${user.createdAt ? user.createdAt.toISOString().split('T')[0] : '기록없음'}`);
      console.log(`   최근 로그인: ${user.lastLoginAt ? user.lastLoginAt.toISOString().split('T')[0] : '기록없음'}`);
      console.log('');
    });

    // 2. Expert Examiners와 매핑 확인
    console.log('\n=== 2. Expert Examiners 연결 상태 ===');
    for (const user of examinerUsers) {
      const examiner = await db.collection('expert-examiners')
        .findOne({ userId: user._id.toString() });

      if (examiner) {
        console.log(`✅ ${user.email}`);
        console.log(`   → ${examiner.name} (ID: ${examiner._id})`);

        // 기존 작성 게시글 수 확인 (과거 데이터)
        const postsByLegacyKey = await db.collection('policy-analysis-posts')
          .countDocuments({ 'examiner.key': examiner.legacyKey || examiner._id.toString() });

        const postsByName = await db.collection('policy-analysis-posts')
          .countDocuments({ 'examiner.name': examiner.name });

        const totalPosts = Math.max(postsByLegacyKey, postsByName);
        console.log(`   📝 작성한 정책분석: ${totalPosts}개 (과거 데이터)`);
      } else {
        console.log(`❌ ${user.email} → 연결된 examiner 없음`);
      }
      console.log('');
    }

    // 3. Examiner Activities 컬렉션 확인
    console.log('\n=== 3. Examiner Activities 기록 상태 ===');
    const activities = await db.collection('examiner-activities').find({}).toArray();
    console.log(`활동 기록 문서 수: ${activities.length}개\n`);

    if (activities.length === 0) {
      console.log('⚠️  활동 기록이 전혀 없습니다.');
      console.log('→ 방금 구현한 시스템이므로 앞으로의 활동만 기록됩니다.\n');
    } else {
      activities.forEach(activity => {
        console.log(`📊 ExaminerID: ${activity.examinerId}`);
        console.log(`   로그인: ${activity.activities?.loginCount || 0}회`);
        console.log(`   페이지 방문: ${activity.activities?.pageVisits || 0}회`);
        console.log(`   게시글: ${activity.activities?.postsCreated || 0}개`);
        console.log(`   댓글: ${activity.activities?.commentsCreated || 0}개`);
        console.log(`   총점: ${activity.totalScore || 0}점`);
        console.log(`   마지막 활동: ${activity.activities?.lastActiveAt || '없음'}`);
        console.log('');
      });
    }

    // 4. 과거 데이터로 활동 추정
    console.log('\n=== 4. 과거 활동 데이터 기반 추정 ===');
    console.log('💡 기존 가입자의 과거 활동은 아래 데이터만 확인 가능:\n');

    for (const user of examinerUsers) {
      const examiner = await db.collection('expert-examiners')
        .findOne({ userId: user._id.toString() });

      if (examiner) {
        const posts = await db.collection('policy-analysis-posts')
          .countDocuments({
            $or: [
              { 'examiner.key': examiner.legacyKey || examiner._id.toString() },
              { 'examiner.name': examiner.name }
            ]
          });

        console.log(`${examiner.name}:`);
        console.log(`   - 작성한 게시글: ${posts}개 (DB에 저장된 과거 데이터)`);
        console.log(`   - 예상 점수: ${posts * 10}점 (게시글만 계산)`);
        console.log(`   ⚠️ 로그인, 페이지 방문, 댓글 기록은 과거 데이터 없음\n`);
      }
    }

    console.log('\n📌 결론:');
    console.log('- 활동 추적 시스템은 구현 시점(오늘)부터만 데이터 기록');
    console.log('- 과거 활동 이력은 게시글 작성 개수만 확인 가능');
    console.log('- 로그인, 페이지 방문, 댓글 등은 과거 데이터 추적 불가능');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkActivities();
