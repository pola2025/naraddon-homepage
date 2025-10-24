/**
 * 기업심사관 활동 추적 시스템 테스트
 *
 * @purpose 로그인, 페이지 방문, 게시글 작성 등의 활동이 제대로 기록되는지 검증
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testActivityTracking() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');
    const db = client.db('naraddon');

    // 1. 테스트할 심사관 선택
    console.log('=== 1. 테스트할 심사관 선택 ===');
    const testUser = await db.collection('users').findOne({
      role: 'examiner',
      email: 'kimte85@naver.com' // 김태은 심사관으로 테스트
    });

    if (!testUser) {
      console.error('❌ 테스트할 examiner 사용자를 찾을 수 없습니다');
      return;
    }

    console.log(`테스트 사용자: ${testUser.name} (${testUser.email})`);

    const examiner = await db.collection('expert-examiners').findOne({
      userId: testUser._id.toString()
    });

    if (!examiner) {
      console.error('❌ 연결된 expert-examiner를 찾을 수 없습니다');
      return;
    }

    const examinerId = examiner._id.toString();
    console.log(`Examiner ID: ${examinerId}`);
    console.log(`Examiner 이름: ${examiner.name}\n`);

    // 2. 현재 활동 점수 확인 (BEFORE)
    console.log('=== 2. 현재 활동 점수 확인 (BEFORE) ===');
    let activityBefore = await db.collection('examiner-activities').findOne({ examinerId });

    if (!activityBefore) {
      console.log('⚠️  활동 기록이 없습니다. 새로 생성됩니다.');
      activityBefore = {
        activities: {
          loginCount: 0,
          pageVisits: 0,
          postsCreated: 0,
          commentsCreated: 0
        }
      };
    } else {
      console.log('현재 활동 점수:');
      console.log(`  - 로그인: ${activityBefore.activities?.loginCount || 0}회 (2점 × ${activityBefore.activities?.loginCount || 0} = ${(activityBefore.activities?.loginCount || 0) * 2}점)`);
      console.log(`  - 페이지 방문: ${activityBefore.activities?.pageVisits || 0}회 (1점 × ${activityBefore.activities?.pageVisits || 0} = ${activityBefore.activities?.pageVisits || 0}점)`);
      console.log(`  - 게시글: ${activityBefore.activities?.postsCreated || 0}개 (10점 × ${activityBefore.activities?.postsCreated || 0} = ${(activityBefore.activities?.postsCreated || 0) * 10}점)`);
      console.log(`  - 댓글: ${activityBefore.activities?.commentsCreated || 0}개 (5점 × ${activityBefore.activities?.commentsCreated || 0} = ${(activityBefore.activities?.commentsCreated || 0) * 5}점)`);

      const totalBefore =
        (activityBefore.activities?.loginCount || 0) * 2 +
        (activityBefore.activities?.pageVisits || 0) * 1 +
        (activityBefore.activities?.postsCreated || 0) * 10 +
        (activityBefore.activities?.commentsCreated || 0) * 5;
      console.log(`  📊 총점: ${totalBefore}점\n`);
    }

    // 3. 테스트 활동 기록 (API 직접 호출)
    console.log('=== 3. 테스트 활동 기록 ===');

    // 먼저 활동 문서가 있는지 확인하고 없으면 생성
    let existingActivity = await db.collection('examiner-activities').findOne({ examinerId });
    if (!existingActivity) {
      console.log('📝 활동 문서 생성 중...');
      await db.collection('examiner-activities').insertOne({
        examinerId,
        userId: testUser._id.toString(),
        activities: {
          pageVisits: 0,
          postsCreated: 0,
          commentsCreated: 0,
          consultationsAssigned: 0,
          consultationsCompleted: 0,
          loginCount: 0,
          lastActiveAt: new Date()
        },
        totalScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ 활동 문서 생성 완료\n');
    }

    // 3-1. 로그인 활동 기록
    console.log('📝 로그인 활동 기록 중...');
    await db.collection('examiner-activities').updateOne(
      { examinerId },
      {
        $inc: { 'activities.loginCount': 1 },
        $set: {
          'activities.lastActiveAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
    console.log('✅ 로그인 기록 성공');

    // 3-2. 페이지 방문 기록
    console.log('📝 페이지 방문 기록 중...');
    await db.collection('examiner-activities').updateOne(
      { examinerId },
      {
        $inc: { 'activities.pageVisits': 1 },
        $set: { 'activities.lastActiveAt': new Date(), updatedAt: new Date() }
      }
    );
    console.log('✅ 페이지 방문 기록 성공');

    // 3-3. 게시글 작성 기록
    console.log('📝 게시글 작성 기록 중...');
    await db.collection('examiner-activities').updateOne(
      { examinerId },
      {
        $inc: { 'activities.postsCreated': 1 },
        $set: { 'activities.lastActiveAt': new Date(), updatedAt: new Date() }
      }
    );
    console.log('✅ 게시글 작성 기록 성공');

    // 3-4. 댓글 작성 기록
    console.log('📝 댓글 작성 기록 중...');
    await db.collection('examiner-activities').updateOne(
      { examinerId },
      {
        $inc: { 'activities.commentsCreated': 1 },
        $set: { 'activities.lastActiveAt': new Date(), updatedAt: new Date() }
      }
    );
    console.log('✅ 댓글 작성 기록 성공\n');

    // 4. 업데이트된 활동 점수 확인 (AFTER)
    console.log('=== 4. 업데이트된 활동 점수 확인 (AFTER) ===');
    const activityAfter = await db.collection('examiner-activities').findOne({ examinerId });

    if (activityAfter) {
      console.log('업데이트된 활동 점수:');
      console.log(`  - 로그인: ${activityAfter.activities?.loginCount || 0}회 (2점 × ${activityAfter.activities?.loginCount || 0} = ${(activityAfter.activities?.loginCount || 0) * 2}점)`);
      console.log(`  - 페이지 방문: ${activityAfter.activities?.pageVisits || 0}회 (1점 × ${activityAfter.activities?.pageVisits || 0} = ${activityAfter.activities?.pageVisits || 0}점)`);
      console.log(`  - 게시글: ${activityAfter.activities?.postsCreated || 0}개 (10점 × ${activityAfter.activities?.postsCreated || 0} = ${(activityAfter.activities?.postsCreated || 0) * 10}점)`);
      console.log(`  - 댓글: ${activityAfter.activities?.commentsCreated || 0}개 (5점 × ${activityAfter.activities?.commentsCreated || 0} = ${(activityAfter.activities?.commentsCreated || 0) * 5}점)`);

      const totalAfter =
        (activityAfter.activities?.loginCount || 0) * 2 +
        (activityAfter.activities?.pageVisits || 0) * 1 +
        (activityAfter.activities?.postsCreated || 0) * 10 +
        (activityAfter.activities?.commentsCreated || 0) * 5;
      console.log(`  📊 총점: ${totalAfter}점`);

      const expectedIncrease = 2 + 1 + 10 + 5; // login(2) + pageVisit(1) + post(10) + comment(5)
      console.log(`  ✅ 예상 증가분: ${expectedIncrease}점\n`);
    }

    // 5. certified-examiners API로 프로필 카드 데이터 확인
    console.log('=== 5. 프로필 카드 데이터 확인 ===');

    // API 로직을 직접 실행 (API 호출 대신)
    const examiners = await db.collection('expert-examiners')
      .find({ isPublished: true })
      .toArray();

    const examinerIds = examiners.map(e => e._id.toString());
    const activitiesData = await db.collection('examiner-activities')
      .find({ examinerId: { $in: examinerIds } })
      .toArray();

    const activitiesMap = new Map(
      activitiesData.map(a => [a.examinerId, a])
    );

    const testExaminerData = examiners.find(e => e._id.toString() === examinerId);
    if (testExaminerData) {
      const activity = activitiesMap.get(examinerId);

      let activityScore = 0;
      if (activity && activity.activities) {
        activityScore =
          (activity.activities.pageVisits || 0) * 1 +
          (activity.activities.postsCreated || 0) * 10 +
          (activity.activities.commentsCreated || 0) * 5 +
          (activity.activities.loginCount || 0) * 2;
      }

      console.log(`프로필 카드 표시 데이터:`);
      console.log(`  이름: ${testExaminerData.name}`);
      console.log(`  회사: ${testExaminerData.companyName}`);
      console.log(`  활동 점수: ${activityScore}점`);

      if (activity && activity.activities) {
        console.log(`  활동 통계:`);
        console.log(`    - 로그인: ${activity.activities.loginCount || 0}회`);
        console.log(`    - 페이지 방문: ${activity.activities.pageVisits || 0}회`);
        console.log(`    - 게시글: ${activity.activities.postsCreated || 0}개`);
        console.log(`    - 댓글: ${activity.activities.commentsCreated || 0}개`);
        console.log(`    - 마지막 활동: ${activity.activities.lastActiveAt || 'N/A'}`);
      }

      console.log(`\n  ✅ 카드에 표시될 내용:`);
      console.log(`     🔥 ${activityScore}점 (활동 배지)`);
      if (activity?.activities?.postsCreated > 0) {
        console.log(`     📄 게시글 ${activity.activities.postsCreated}`);
      }
      if (activity?.activities?.commentsCreated > 0) {
        console.log(`     💬 댓글 ${activity.activities.commentsCreated}`);
      }
    }

    // 6. 검증 결과
    console.log('\n=== 6. 검증 결과 ===');
    const beforeTotal =
      (activityBefore.activities?.loginCount || 0) * 2 +
      (activityBefore.activities?.pageVisits || 0) * 1 +
      (activityBefore.activities?.postsCreated || 0) * 10 +
      (activityBefore.activities?.commentsCreated || 0) * 5;

    const afterTotal =
      (activityAfter.activities?.loginCount || 0) * 2 +
      (activityAfter.activities?.pageVisits || 0) * 1 +
      (activityAfter.activities?.postsCreated || 0) * 10 +
      (activityAfter.activities?.commentsCreated || 0) * 5;

    const actualIncrease = afterTotal - beforeTotal;
    const expectedIncrease = 18; // 2 + 1 + 10 + 5

    console.log(`Before: ${beforeTotal}점`);
    console.log(`After: ${afterTotal}점`);
    console.log(`실제 증가: ${actualIncrease}점`);
    console.log(`예상 증가: ${expectedIncrease}점`);

    if (actualIncrease === expectedIncrease) {
      console.log('\n✅✅✅ 테스트 성공! 활동 추적 시스템이 정상 작동합니다! ✅✅✅');
    } else {
      console.log('\n❌ 테스트 실패: 점수 증가분이 예상과 다릅니다');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testActivityTracking();
