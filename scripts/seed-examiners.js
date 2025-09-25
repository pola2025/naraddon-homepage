const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const examinerSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  position: String,
  category: String,
  imageKey: String,
  legacyKey: String,
  isPublished: Boolean,
  sortOrder: Number
});

const ExaminerProfile = mongoose.models.ExaminerProfile || mongoose.model('ExaminerProfile', examinerSchema);

async function seedExaminers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');

    // certifiedExaminers.ts 파일과 동일한 20명의 심사관 데이터
    const defaultExaminers = [
      { name: '권혁중', companyName: '주식회사 레토', position: '수출지원 전문가', category: 'export', imageKey: 'kwon-hyuk-jung', legacyKey: 'kwon-hyuk-jung', isPublished: true, sortOrder: 0 },
      { name: '길진영', companyName: 'TF 컨설팅', position: '정책자금 전문가', category: 'funding', imageKey: 'gil-jin-young', legacyKey: 'gil-jin-young', isPublished: true, sortOrder: 1 },
      { name: '김범준', companyName: '에스제이파트너스', position: '정책자금 컨설턴트', category: 'funding', imageKey: 'kim-beom-jun', legacyKey: 'kim-beom-jun', isPublished: true, sortOrder: 2 },
      { name: '김수빈', companyName: '주식회사 유에스이노웨이브', position: '기업인증 전문가', category: 'certification', imageKey: 'kim-su-bin', legacyKey: 'kim-su-bin', isPublished: true, sortOrder: 3 },
      { name: '김영희', companyName: '세움 기업지원센터', position: '창업지원 컨설턴트', category: 'funding', imageKey: 'kim-young-hee', legacyKey: 'kim-young-hee', isPublished: true, sortOrder: 4 },
      { name: '김태수', companyName: '비즈레스큐', position: '기술금융 전문가', category: 'funding', imageKey: 'kim-tae-soo', legacyKey: 'kim-tae-soo', isPublished: true, sortOrder: 5 },
      { name: '김태은', companyName: '가나안 기업지원센터', position: '사회적경제 전문가', category: 'funding', imageKey: 'kim-tae-eun', legacyKey: 'kim-tae-eun', isPublished: true, sortOrder: 6 },
      { name: '박민재', companyName: '푸른중소기업 경영지원센터', position: '제조업 컨설턴트', category: 'manufacturing', imageKey: 'park-min-jae', legacyKey: 'park-min-jae', isPublished: true, sortOrder: 7 },
      { name: '박성훈', companyName: '비즈스카이', position: '금융컨설턴트', category: 'funding', imageKey: 'park-sung-hoon', legacyKey: 'park-sung-hoon', isPublished: true, sortOrder: 8 },
      { name: '박현숙', companyName: '케이피제이', position: '여성기업 전문가', category: 'funding', imageKey: 'park-hyun-sook', legacyKey: 'park-hyun-sook', isPublished: true, sortOrder: 9 },
      { name: '손지숙', companyName: '손스타컴퍼니', position: '서비스업 컨설턴트', category: 'funding', imageKey: 'son-ji-sook', legacyKey: 'son-ji-sook', isPublished: true, sortOrder: 10 },
      { name: '양미진', companyName: '에스제이파트너스', position: '바이오산업 전문가', category: 'funding', imageKey: 'yang-mi-jin', legacyKey: 'yang-mi-jin', isPublished: true, sortOrder: 11 },
      { name: '이용흔', companyName: '제이제이에스 기업지원센터', position: '부동산금융 전문가', category: 'funding', imageKey: 'lee-yong-heun', legacyKey: 'lee-yong-heun', isPublished: true, sortOrder: 12 },
      { name: '전예진', companyName: '비젠파트너스', position: 'IT/콘텐츠 전문가', category: 'funding', imageKey: 'jeon-ye-jin', legacyKey: 'jeon-ye-jin', isPublished: true, sortOrder: 13 },
      { name: '전윤지', companyName: '열린정책자금연구소', position: '농식품산업 전문가', category: 'funding', imageKey: 'jeon-yoon-ji', legacyKey: 'jeon-yoon-ji', isPublished: true, sortOrder: 14 },
      { name: '전지선', companyName: '제이티엘파트너스', position: 'ISO인증 전문가', category: 'certification', imageKey: 'jeon-ji-sun', legacyKey: 'jeon-ji-sun', isPublished: true, sortOrder: 15 },
      { name: '천명숙', companyName: '씨에스파트너스', position: '관광산업 컨설턴트', category: 'funding', imageKey: 'cheon-myung-sook', legacyKey: 'cheon-myung-sook', isPublished: true, sortOrder: 16 },
      { name: '태건호', companyName: '경영지원컨설팅', position: '청년창업 멘토', category: 'startup', imageKey: 'tae-gun-ho', legacyKey: 'tae-gun-ho', isPublished: true, sortOrder: 17 },
      { name: '팽성희', companyName: '기업성장지원플랫폼', position: '스타트업 액셀러레이터', category: 'startup', imageKey: 'paeng-sung-hee', legacyKey: 'paeng-sung-hee', isPublished: true, sortOrder: 18 },
      { name: '황만규', companyName: '바름경영지원센터', position: '뿌리산업 전문가', category: 'manufacturing', imageKey: 'hwang-man-gyu', legacyKey: 'hwang-man-gyu', isPublished: true, sortOrder: 19 }
    ];

    // 기존 데이터 삭제
    await ExaminerProfile.deleteMany({});
    console.log('기존 심사관 데이터 삭제 완료');

    // 새 데이터 삽입
    const result = await ExaminerProfile.insertMany(defaultExaminers);
    console.log(`${result.length}명의 심사관 데이터 생성 완료`);

    // 생성된 데이터 확인
    const examiners = await ExaminerProfile.find({});
    console.log('생성된 심사관 목록:');
    examiners.forEach(e => {
      console.log(`- ${e.name} (ID: ${e._id}, legacyKey: ${e.legacyKey})`);
    });

  } catch (error) {
    console.error('에러 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

seedExaminers();