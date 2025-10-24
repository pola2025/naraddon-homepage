/**
 * 모든 기업심사관 활동 점수 및 카드 표시 테스트
 *
 * @purpose certified-examiners API로 실제 카드 데이터 확인
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testAllExaminers() {
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

    // 1. 박현숙 심사관에게도 테스트 활동 추가
    console.log('=== 1. 박현숙 심사관 활동 추가 ===');
    const park = await db.collection('users').findOne({ email: 'bibiwos@naver.com' });
    if (park) {
      const parkExaminer = await db.collection('expert-examiners').findOne({
        userId: park._id.toString()
      });

      if (parkExaminer) {
        const parkExaminerId = parkExaminer._id.toString();

        // 활동 문서 확인 및 생성
        let parkActivity = await db.collection('examiner-activities').findOne({ examinerId: parkExaminerId });
        if (!parkActivity) {
          await db.collection('examiner-activities').insertOne({
            examinerId: parkExaminerId,
            userId: park._id.toString(),
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
        }

        // 로그인 2회, 페이지 방문 3회 추가
        await db.collection('examiner-activities').updateOne(
          { examinerId: parkExaminerId },
          {
            $inc: {
              'activities.loginCount': 2,
              'activities.pageVisits': 3
            },
            $set: {
              'activities.lastActiveAt': new Date(),
              updatedAt: new Date()
            }
          }
        );

        console.log(`✅ ${parkExaminer.name}: 로그인 2회, 페이지 방문 3회 추가`);
        console.log(`   예상 점수: ${2 * 2 + 3 * 1} = 7점\n`);
      }
    }

    // 2. certified-examiners API 로직 실행 (실제 API 동작 시뮬레이션)
    console.log('=== 2. Certified Examiners API 시뮬레이션 ===\n');

    const examiners = await db.collection('expert-examiners')
      .find({ isPublished: true })
      .project({
        name: 1,
        companyName: 1,
        imageUrl: 1,
        position: 1,
        category: 1,
        specialties: 1,
        sortOrder: 1,
        isPublished: 1
      })
      .toArray();

    console.log(`공개된 심사관: ${examiners.length}명\n`);

    // 활동 점수 조회
    const examinerIds = examiners.map(e => e._id.toString());
    const activitiesData = await db.collection('examiner-activities')
      .find({ examinerId: { $in: examinerIds } })
      .project({
        examinerId: 1,
        activities: 1,
        totalScore: 1
      })
      .toArray();

    const activitiesMap = new Map(
      activitiesData.map(a => [a.examinerId, a])
    );

    const scoreConfig = {
      pageVisit: 1,
      postCreated: 10,
      commentCreated: 5,
      login: 2
    };

    // 카드 데이터 생성
    const formattedExaminers = examiners.map(examiner => {
      const examinerId = examiner._id.toString();
      const activity = activitiesMap.get(examinerId);

      let activityScore = 0;
      if (activity && activity.activities) {
        activityScore =
          (activity.activities.pageVisits || 0) * scoreConfig.pageVisit +
          (activity.activities.postsCreated || 0) * scoreConfig.postCreated +
          (activity.activities.commentsCreated || 0) * scoreConfig.commentCreated +
          (activity.activities.loginCount || 0) * scoreConfig.login;
      }

      return {
        _id: examinerId,
        name: examiner.name,
        companyName: examiner.companyName,
        activityScore,
        activityStats: activity ? {
          loginCount: activity.activities?.loginCount || 0,
          pageVisits: activity.activities?.pageVisits || 0,
          postsCreated: activity.activities?.postsCreated || 0,
          commentsCreated: activity.activities?.commentsCreated || 0,
          lastActiveAt: activity.activities?.lastActiveAt || null
        } : null
      };
    });

    // 3. 프로필 카드 표시 미리보기
    console.log('=== 3. 프로필 카드 표시 미리보기 ===\n');

    formattedExaminers.forEach((examiner, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`카드 ${index + 1}: ${examiner.name}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏢 ${examiner.companyName}`);

      if (examiner.activityScore > 0) {
        console.log(`🔥 활동 점수: ${examiner.activityScore}점`);

        if (examiner.activityStats) {
          console.log(`\n📊 활동 통계:`);
          console.log(`   🔐 로그인: ${examiner.activityStats.loginCount}회`);
          console.log(`   👁️  페이지 방문: ${examiner.activityStats.pageVisits}회`);
          console.log(`   📄 게시글: ${examiner.activityStats.postsCreated}개`);
          console.log(`   💬 댓글: ${examiner.activityStats.commentsCreated}개`);
        }

        console.log(`\n✨ 카드에 표시될 요소:`);
        console.log(`   [🏅 나라똔 인증] (좌측 상단)`);
        console.log(`   [🔥 ${examiner.activityScore}점] (우측 상단 - 빨간 배지)`);
        if (examiner.activityStats?.postsCreated > 0 || examiner.activityStats?.commentsCreated > 0) {
          console.log(`   [활동 통계 박스]`);
          if (examiner.activityStats.postsCreated > 0) {
            console.log(`     📄 게시글 ${examiner.activityStats.postsCreated}`);
          }
          if (examiner.activityStats.commentsCreated > 0) {
            console.log(`     💬 댓글 ${examiner.activityStats.commentsCreated}`);
          }
        }
      } else {
        console.log(`⚠️  활동 점수 없음 (배지 미표시)`);
      }
      console.log(``);
    });

    // 4. 점수별 정렬 (높은 순)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('=== 4. 활동 점수 랭킹 ===\n');

    const sortedByScore = [...formattedExaminers].sort((a, b) => b.activityScore - a.activityScore);

    sortedByScore.forEach((examiner, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${index + 1}위: ${examiner.name} - ${examiner.activityScore}점`);
    });

    console.log('\n✅ 모든 테스트 완료!');
    console.log('\n📌 확인 사항:');
    console.log('1. 활동 점수가 0점 이상인 심사관은 프로필 카드에 🔥 배지 표시');
    console.log('2. 게시글/댓글이 있으면 통계 박스 표시');
    console.log('3. 활동 점수가 높을수록 상위 랭킹');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testAllExaminers();
