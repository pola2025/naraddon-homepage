require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

// CertifiedExaminersPage.tsx에서 가져온 하드코딩된 데이터
const allExaminers = [
  { name: '이용흔', company: '제이제이에스 기업지원센터', filename: 'lee-yong-heun.jpg' },
  { name: '김수빈', company: '주식회사 유에스이노웨이브', filename: 'kim-su-bin.jpg' },
  { name: '태건호', company: '경영지원컨설팅', filename: 'tae-gun-ho.jpg' },
  { name: '박민재', company: '푸른중소기업경영컨설팅', filename: 'park-min-jae.jpg' },
  { name: '양미진', company: '에스제이파트너스', filename: 'yang-mi-jin.jpg' },
  { name: '전예진', company: '비젠파트너스', filename: 'jeon-ye-jin.jpg' },
  { name: '전지선', company: '제이티엘파트너스', filename: 'jeon-ji-sun.jpg' },
  { name: '김범준', company: '에스제이파트너스', filename: 'kim-beom-jun.jpg' },
  { name: '김영희', company: '세움기업지원센터', filename: 'kim-young-hee.jpg' },
  { name: '김태은', company: '가나안 기업지원센터', filename: 'kim-tae-eun.jpg' },
  { name: '박성훈', company: '비즈스카이', filename: 'park-sung-hoon.jpg' },
  { name: '박현숙', company: '케이피제이', filename: 'park-hyun-sook.jpg' },
  { name: '손지숙', company: '손스타컴퍼니', filename: 'son-ji-sook.jpg' },
  { name: '전윤지', company: '열린정책자금연구소', filename: 'jeon-yoon-ji.jpg' },
  { name: '팽성희', company: '기업성장지원플랫폼', filename: 'paeng-sung-hee.jpg' },
  { name: '황만규', company: '바른경영지원센터', filename: 'hwang-man-gyu.jpg' }
];

// 파일명에서 legacyKey 추출 (확장자 제거)
function getKeyFromFilename(filename) {
  return filename.replace('.jpg', '');
}

async function migrateExaminers() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const collection = db.collection('expert-examiners');

    // 기존 데이터 확인
    const existingCount = await collection.countDocuments();

    if (existingCount > 0) {
      console.log(`⚠️  경고: 이미 ${existingCount}개의 심사관 데이터가 존재합니다.`);
      console.log('계속 진행하면 중복 데이터가 생성될 수 있습니다.\n');

      // 실제 실행을 위해서는 이 부분을 주석 해제하고 확인 필요
      // process.exit(0);
    }

    console.log('📊 마이그레이션할 데이터:\n');

    const now = new Date();
    const documents = allExaminers.map((examiner, index) => ({
      name: examiner.name,
      position: '인증 기업심사관', // 기본 직책
      companyName: examiner.company,
      category: 'funding', // 기본 카테고리
      specialties: [], // 전문분야는 추후 관리자가 추가
      imageUrl: `/images/examiners/${examiner.filename}`,
      imageAlt: `${examiner.name} 인증 기업심사관`,
      sortOrder: index + 1,
      legacyKey: getKeyFromFilename(examiner.filename),
      isPublished: true,
      userId: null, // 사용자 연결은 추후 관리자 페이지에서
      createdAt: now,
      updatedAt: now
    }));

    // 미리보기 출력
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name} - ${doc.companyName}`);
      console.log(`   이미지: ${doc.imageUrl}`);
      console.log(`   legacyKey: ${doc.legacyKey}`);
      console.log(`   sortOrder: ${doc.sortOrder}\n`);
    });

    console.log('───────────────────────────────────────');
    console.log(`총 ${documents.length}명의 심사관 데이터를 마이그레이션합니다.`);
    console.log('───────────────────────────────────────\n');

    // 실제 삽입
    const result = await collection.insertMany(documents);

    console.log(`✅ 성공: ${result.insertedCount}명의 심사관 데이터가 DB에 저장되었습니다.\n`);

    // 결과 확인
    const inserted = await collection.find({}).sort({ sortOrder: 1 }).toArray();
    console.log('📋 저장된 데이터 확인:\n');
    inserted.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name} (${doc.companyName})`);
    });

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB 연결 종료');
  }
}

// 실행
console.log('🚀 심사관 데이터 마이그레이션 시작...\n');
migrateExaminers();
