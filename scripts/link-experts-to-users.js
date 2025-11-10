/**
 * 전문가(experts) 컬렉션과 사용자(users) 컬렉션 연결
 *
 * @purpose 전문가 문서에 userId 필드 추가하여 users와 연결하고 expert 역할 부여
 * @context 전문가가 대시보드에서 본인 프로필을 관리할 수 있도록 연결 필요
 * @note 이메일 기반으로 매칭하여 userId 추가
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI가 설정되지 않았습니다.');
  process.exit(1);
}

async function linkExpertsToUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    const db = client.db('naraddon');
    const expertsCollection = db.collection('experts');
    const usersCollection = db.collection('users');

    // 전문가 이메일 매핑 (이메일이 DB에 없는 경우를 위한 기본값)
    const expertEmails = {
      '백경우': 'paik@example.com',
      '성민석': 'sung@example.com',
      '전기홍': 'jeon@example.com',
      '최일현': 'choi@example.com'
    };

    const experts = await expertsCollection.find({ isActive: true }).toArray();
    console.log(`\n📋 전문가 ${experts.length}명 발견`);

    for (const expert of experts) {
      console.log(`\n처리 중: ${expert.name}`);

      // 1. 이메일로 사용자 찾기 (없으면 기본 이메일 사용)
      const email = expert.email || expertEmails[expert.name];

      if (!email) {
        console.log(`⚠️  ${expert.name}: 이메일 없음, 건너뜀`);
        continue;
      }

      let user = await usersCollection.findOne({ email });

      // 2. 사용자 없으면 생성
      if (!user) {
        console.log(`   → 사용자 생성: ${email}`);
        const result = await usersCollection.insertOne({
          name: expert.name,
          email: email,
          role: 'expert',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        });
        user = await usersCollection.findOne({ _id: result.insertedId });
      } else {
        // 기존 사용자에게 expert 역할 부여
        console.log(`   → 기존 사용자 발견: ${email}`);
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              role: 'expert',
              updatedAt: new Date()
            }
          }
        );
        console.log(`   → 역할 업데이트: expert`);
      }

      // 3. expert 문서에 userId 추가
      await expertsCollection.updateOne(
        { _id: expert._id },
        {
          $set: {
            userId: user._id.toString(),
            email: email,
            updatedAt: new Date()
          }
        }
      );
      console.log(`   ✅ userId 연결 완료: ${user._id}`);
    }

    // 최종 결과 확인
    console.log('\n\n🎯 최종 결과:');
    const linkedExperts = await expertsCollection.find({
      isActive: true,
      userId: { $exists: true }
    }).toArray();

    for (const expert of linkedExperts) {
      const user = await usersCollection.findOne({ _id: new ObjectId(expert.userId) });
      console.log(`   ${expert.name}: ${user?.email} (role: ${user?.role})`);
    }

    console.log(`\n✅ 전문가-사용자 연결 완료: ${linkedExperts.length}명`);
  } catch (error) {
    console.error('❌ 에러:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

linkExpertsToUsers();
