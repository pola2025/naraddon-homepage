/**
 * 똔톡 닉네임 마이그레이션 스크립트
 *
 * 하드코딩된 닉네임 목록을 MongoDB로 이전
 *
 * 실행: npx tsx scripts/migrate-ttontok-nicknames.ts
 */

import mongoose from 'mongoose';
import TtontokNickname from '../src/models/TtontokNickname';

const MONGODB_URI = process.env.MONGODB_URI || '';

const PREDEFINED_NICKNAMES = {
  examiners: [
    '권혁중 심사관',
    '길진영 심사관',
    '김범준 심사관',
    '김수빈 심사관',
    '김영희 심사관',
    '김태수 심사관',
    '김태은 심사관',
    '박민재 심사관',
    '박성훈 심사관',
    '박현숙 심사관',
    '손지숙 심사관',
    '양미진 심사관',
    '이용흔 심사관',
    '전예진 심사관',
    '전윤지 심사관',
    '전지선 심사관',
    '천명숙 심사관',
    '태건호 심사관',
    '팽성희 심사관',
    '황만규 심사관',
  ],
  experts: ['백경우 전문가', '성민석 전문가', '전기홍 전문가', '최일현 전문가'],
  general: [
    '커피한잔',
    '빵굽는사람',
    '꽃집사장',
    '행복가득',
    '스타트업꿈나무',
    '청년사업가',
    '도전하는청년',
    '카페창업준비',
    '치킨집사장',
    '편의점운영',
    '카페알바생',
    '예비창업자',
    '디저트카페',
    '베이커리카페',
    '커피매니아',
    '프랜차이즈관계자',
    '세무초보',
    '식당사장',
    '온라인쇼핑몰',
    '우산장수',
    '임대인의고민',
    '응원합니다',
    '화이팅',
    '꽃좋아',
    '마케팅고민',
    'SNS전문가',
  ],
};

async function migrate() {
  try {
    console.log('🔄 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 기존 데이터 확인
    const existingCount = await TtontokNickname.countDocuments();
    console.log(`📊 기존 닉네임 수: ${existingCount}`);

    if (existingCount > 0) {
      const answer = await new Promise<string>((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question(
          '⚠️  기존 데이터가 있습니다. 삭제하고 다시 마이그레이션하시겠습니까? (y/N): ',
          (ans: string) => {
            readline.close();
            resolve(ans);
          }
        );
      });

      if (answer.toLowerCase() === 'y') {
        console.log('🗑️  기존 데이터 삭제 중...');
        await TtontokNickname.deleteMany({});
        console.log('✅ 기존 데이터 삭제 완료');
      } else {
        console.log('❌ 마이그레이션 취소');
        process.exit(0);
      }
    }

    // 닉네임 추가
    const nicknamesData = [];

    // 심사관
    PREDEFINED_NICKNAMES.examiners.forEach((nickname, index) => {
      nicknamesData.push({
        nickname,
        role: 'certified_examiner',
        sortOrder: index,
        isActive: true,
      });
    });

    // 전문가
    PREDEFINED_NICKNAMES.experts.forEach((nickname, index) => {
      nicknamesData.push({
        nickname,
        role: 'expert',
        sortOrder: index,
        isActive: true,
      });
    });

    // 일반 사용자
    PREDEFINED_NICKNAMES.general.forEach((nickname, index) => {
      nicknamesData.push({
        nickname,
        role: 'general',
        sortOrder: index,
        isActive: true,
      });
    });

    console.log(`📝 ${nicknamesData.length}개 닉네임 추가 중...`);
    await TtontokNickname.insertMany(nicknamesData);

    console.log('✅ 마이그레이션 완료!');
    console.log(`   - 심사관: ${PREDEFINED_NICKNAMES.examiners.length}명`);
    console.log(`   - 전문가: ${PREDEFINED_NICKNAMES.experts.length}명`);
    console.log(`   - 일반: ${PREDEFINED_NICKNAMES.general.length}명`);
    console.log(`   - 총합: ${nicknamesData.length}명`);

    await mongoose.disconnect();
    console.log('👋 MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

migrate();
