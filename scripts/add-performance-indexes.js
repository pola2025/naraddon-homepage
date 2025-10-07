/**
 * MongoDB 성능 최적화 인덱스 추가 스크립트
 *
 * 실행 방법:
 *   node scripts/add-performance-indexes.js
 *
 * 주의: 프로덕션 DB에 실행 시 부하가 발생할 수 있으므로
 *       트래픽이 적은 시간대에 실행하는 것을 권장합니다.
 */

const mongoose = require('mongoose');

// 환경변수 로드
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  console.error('   .env.local 파일을 확인해주세요.');
  process.exit(1);
}

async function addPerformanceIndexes() {
  try {
    console.log('🔗 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;

    // PolicyAnalysisPost 컬렉션 인덱스 추가
    console.log('📊 PolicyAnalysisPost 인덱스 생성 중...');
    const policyAnalysisCollection = db.collection('policyanalysisposts');

    // 기존 인덱스 확인
    const existingIndexes = await policyAnalysisCollection.indexes();
    console.log('   기존 인덱스:', existingIndexes.map(idx => idx.name).join(', '));

    // views 정렬용 인덱스
    try {
      await policyAnalysisCollection.createIndex(
        { views: -1, createdAt: -1 },
        { name: 'views_-1_createdAt_-1', background: true }
      );
      console.log('   ✅ views 정렬 인덱스 생성 완료');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('   ℹ️  views 정렬 인덱스가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // 카테고리별 인기순 인덱스
    try {
      await policyAnalysisCollection.createIndex(
        { category: 1, views: -1 },
        { name: 'category_1_views_-1', background: true }
      );
      console.log('   ✅ 카테고리별 인기순 인덱스 생성 완료');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('   ℹ️  카테고리별 인기순 인덱스가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // PolicyNewsPost 컬렉션 인덱스 추가
    console.log('\n📊 PolicyNewsPost 인덱스 생성 중...');
    const policyNewsCollection = db.collection('policynewsposts');

    const existingNewsIndexes = await policyNewsCollection.indexes();
    console.log('   기존 인덱스:', existingNewsIndexes.map(idx => idx.name).join(', '));

    // views 정렬용 인덱스
    try {
      await policyNewsCollection.createIndex(
        { views: -1, createdAt: -1 },
        { name: 'views_-1_createdAt_-1', background: true }
      );
      console.log('   ✅ views 정렬 인덱스 생성 완료');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('   ℹ️  views 정렬 인덱스가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // 복합 인덱스 개선
    try {
      await policyNewsCollection.createIndex(
        { isMain: 1, isPinned: 1, createdAt: -1 },
        { name: 'isMain_1_isPinned_1_createdAt_-1', background: true }
      );
      console.log('   ✅ 복합 인덱스 생성 완료');
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('   ℹ️  복합 인덱스가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // 최종 인덱스 목록 확인
    console.log('\n📋 최종 인덱스 목록:');
    console.log('\n   PolicyAnalysisPost:');
    const finalAnalysisIndexes = await policyAnalysisCollection.indexes();
    finalAnalysisIndexes.forEach(idx => {
      console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n   PolicyNewsPost:');
    const finalNewsIndexes = await policyNewsCollection.indexes();
    finalNewsIndexes.forEach(idx => {
      console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ 모든 인덱스 생성 완료!');
    console.log('\n💡 다음 명령어로 인덱스 사용 현황을 확인할 수 있습니다:');
    console.log('   db.policyanalysisposts.getIndexes()');
    console.log('   db.policynewsposts.getIndexes()');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
addPerformanceIndexes();
