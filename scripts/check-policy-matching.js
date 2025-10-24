require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkPolicyMatching() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 1. 김태은 심사관 정보 확인
    console.log('=== 김태은 심사관 정보 ===');
    const examiner = await db.collection('expert-examiners').findOne({
      name: '김태은'
    });

    if (examiner) {
      console.log('이름:', examiner.name);
      console.log('legacyKey:', examiner.legacyKey);
      console.log('_id:', examiner._id);
    } else {
      console.log('김태은 심사관을 찾을 수 없습니다.');
    }

    // 1.5. 모든 컬렉션 확인
    console.log('\n=== 데이터베이스 컬렉션 목록 ===');
    const collections = await db.listCollections().toArray();
    const policyCollections = collections.filter(c => c.name.includes('policy'));
    console.log('정책 관련 컬렉션:', policyCollections.map(c => c.name).join(', '));

    // 2. 정책분석 글 확인 (여러 컬렉션명 시도)
    console.log('\n=== 정책분석 글 확인 ===');
    const collectionNames = ['policy-analysis-posts', 'policyanalysisposts', 'PolicyAnalysisPost'];
    let posts = [];
    let actualCollectionName = '';

    for (const collName of collectionNames) {
      try {
        const count = await db.collection(collName).countDocuments();
        if (count > 0) {
          console.log(`${collName}: ${count}개의 글`);
          posts = await db.collection(collName).find({}).limit(5).toArray();
          actualCollectionName = collName;
          break;
        }
      } catch (err) {
        // 컬렉션이 없으면 무시
      }
    }

    posts.forEach((post, index) => {
      console.log(`\n글 ${index + 1}:`);
      console.log('제목:', post.title);
      console.log('examiner 필드:', JSON.stringify(post.examiner, null, 2));
    });

    if (actualCollectionName) {
      // 3. 김태은 관련 글 검색 시도
      console.log('\n=== 김태은 관련 글 검색 (컬렉션:', actualCollectionName, ') ===');

      // 방법 1: examiner.name으로 검색
      const byName = await db.collection(actualCollectionName).find({
        'examiner.name': '김태은'
      }).toArray();
      console.log('examiner.name으로 검색:', byName.length, '개');

      // 방법 2: examiner.key로 검색 (legacyKey가 있다면)
      if (examiner && examiner.legacyKey) {
        const byKey = await db.collection(actualCollectionName).find({
          'examiner.key': examiner.legacyKey
        }).toArray();
        console.log('examiner.key로 검색:', byKey.length, '개');
      }

      // 방법 3: 모든 작성자 확인
      console.log('\n=== 모든 정책분석 작성자 ===');
      const allPosts = await db.collection(actualCollectionName).find({}).toArray();
      const authors = new Set(allPosts.map(p => p.examiner?.name).filter(Boolean));
      console.log('작성자 목록:', Array.from(authors).join(', '));
      console.log('총', allPosts.length, '개의 글');
    } else {
      console.log('\n정책분석 글이 하나도 없습니다.');
    }

  } finally {
    await client.close();
  }
}

checkPolicyMatching().catch(console.error);
