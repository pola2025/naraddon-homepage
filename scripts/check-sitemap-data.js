/**
 * Sitemap 데이터 확인 스크립트
 *
 * @purpose 각 컬렉션의 published 상태 데이터 확인
 * @context sitemap.xml에 포함되어야 할 데이터가 실제로 존재하는지 검증
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkSitemapData() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;

    // 1. 정책소식 (policy_news)
    console.log('📰 정책소식 (policy_news)');
    const policyNewsTotal = await db.collection('policy_news').countDocuments();
    const policyNewsPublished = await db.collection('policy_news').countDocuments({ status: 'published' });
    const policyNewsSample = await db.collection('policy_news').findOne();
    console.log(`  전체: ${policyNewsTotal}개`);
    console.log(`  published: ${policyNewsPublished}개`);
    console.log(`  샘플 status: ${policyNewsSample?.status || 'N/A'}`);
    console.log('');

    // 2. 정책분석 (policy_analysis)
    console.log('📊 정책분석 (policy_analysis)');
    const policyAnalysisTotal = await db.collection('policy_analysis').countDocuments();
    const policyAnalysisPublished = await db.collection('policy_analysis').countDocuments({ status: 'published' });
    const policyAnalysisSample = await db.collection('policy_analysis').findOne();
    console.log(`  전체: ${policyAnalysisTotal}개`);
    console.log(`  published: ${policyAnalysisPublished}개`);
    console.log(`  샘플 status: ${policyAnalysisSample?.status || 'N/A'}`);
    console.log('');

    // 3. 똔톡 (business_voice_posts)
    console.log('💬 똔톡 (business_voice_posts)');
    const ttontokTotal = await db.collection('business_voice_posts').countDocuments();
    const ttontokPublished = await db.collection('business_voice_posts').countDocuments({ status: 'published' });
    const ttontokSample = await db.collection('business_voice_posts').findOne();
    console.log(`  전체: ${ttontokTotal}개`);
    console.log(`  published: ${ttontokPublished}개`);
    console.log(`  샘플 status: ${ttontokSample?.status || 'N/A'}`);
    console.log('');

    // 4. 묻고답하기 (ddontalk_posts)
    console.log('❓ 묻고답하기 (ddontalk_posts)');
    const ddontalkTotal = await db.collection('ddontalk_posts').countDocuments();
    const ddontalkPublished = await db.collection('ddontalk_posts').countDocuments({ status: 'published' });
    const ddontalkSample = await db.collection('ddontalk_posts').findOne();
    console.log(`  전체: ${ddontalkTotal}개`);
    console.log(`  published: ${ddontalkPublished}개`);
    console.log(`  샘플 status: ${ddontalkSample?.status || 'N/A'}`);
    console.log('');

    // 5. 인증심사관 (expert-examiners)
    console.log('👨‍💼 인증심사관 (expert-examiners)');
    const examinersTotal = await db.collection('expert-examiners').countDocuments();
    const examinersPublished = await db.collection('expert-examiners').countDocuments({ isPublished: true });
    const examinersSample = await db.collection('expert-examiners').findOne();
    console.log(`  전체: ${examinersTotal}개`);
    console.log(`  isPublished: true: ${examinersPublished}개`);
    console.log(`  샘플 isPublished: ${examinersSample?.isPublished || 'N/A'}`);
    console.log('');

    // 요약
    console.log('📋 Sitemap 포함 가능 URL 합계');
    const totalSitemapUrls =
      9 + // 정적 페이지
      policyNewsPublished +
      policyAnalysisPublished +
      ttontokPublished +
      ddontalkPublished +
      examinersPublished;
    console.log(`  예상 총 URL: ${totalSitemapUrls}개`);
    console.log(`  현재 sitemap.xml: 55개 (정적 9 + 심사관 46)`);

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB 연결 종료');
  }
}

checkSitemapData();
