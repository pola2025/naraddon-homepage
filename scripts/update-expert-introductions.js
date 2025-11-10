const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MongoDB URI가 설정되지 않았습니다.');
  process.exit(1);
}

// Expert 스키마 정의
const ExpertSchema = new mongoose.Schema({
  name: String,
  position: String,
  companyName: String,
  specialties: [String],
  introduction: String,
  imageKey: String,
  order: Number,
  isActive: Boolean,
}, {
  timestamps: true,
});

const Expert = mongoose.models.Expert || mongoose.model('Expert', ExpertSchema);

// 각 전문가별 소개 내용
const expertIntroductions = {
  '백경우': '특허, 상표, 디자인 등 지식재산권 전반에 대한 풍부한 경험을 보유하고 있으며, 중소기업과 스타트업의 기술 보호와 사업화를 위한 맞춤형 IP 전략을 제공합니다.',
  '성민석': '기업의 세무 리스크를 최소화하고 절세 효과를 극대화하는 전략적 세무 컨설팅을 제공하며, 세무조사 대응 및 재무제표 분석에 특화되어 있습니다.',
  '전기홍': '노동법 및 인사관리 분야의 전문가로, 근로계약부터 4대보험, 외국인 근로자 관리까지 기업의 인사노무 전반을 체계적으로 지원합니다.',
  '최일현': '사업계획 수립부터 투자유치, M&A까지 기업 경영의 전 과정을 아우르는 회계 전문가로, 실질적인 경영 개선과 성장 전략을 제시합니다.'
};

async function updateIntroductions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB에 연결되었습니다.');

    const experts = await Expert.find({});
    console.log(`\n총 ${experts.length}명의 전문가를 찾았습니다.`);

    for (const expert of experts) {
      const introduction = expertIntroductions[expert.name];

      if (introduction) {
        await Expert.updateOne(
          { _id: expert._id },
          { $set: { introduction } }
        );
        console.log(`✅ ${expert.name} - 소개 내용 업데이트 완료`);
        console.log(`   "${introduction}"\n`);
      } else {
        console.log(`⚠️  ${expert.name} - 소개 내용이 정의되지 않았습니다.\n`);
      }
    }

    console.log('모든 전문가의 소개 내용 업데이트가 완료되었습니다.');

  } catch (error) {
    console.error('오류가 발생했습니다:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결을 종료했습니다.');
  }
}

updateIntroductions();
