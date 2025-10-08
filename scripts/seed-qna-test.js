const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    author: {
      nickname: { type: String, required: true },
      businessType: { type: String, required: true },
      region: { type: String, required: true },
      yearsInBusiness: { type: Number, default: null },
    },
    metrics: {
      viewCount: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
      scrapCount: { type: Number, default: 0 },
    },
    flags: {
      needsExpertReply: { type: Boolean, default: false },
      needsExaminerReply: { type: Boolean, default: false },
    },
    sources: { type: Array, default: [] },
    answers: { type: Array, default: [] },
  },
  { timestamps: true }
);

const BusinessVoiceQuestion =
  mongoose.models.BusinessVoiceQuestion ||
  mongoose.model('BusinessVoiceQuestion', questionSchema);

const testData = [
  {
    title: '사업자등록 후 첫 세금신고는 언제 해야 하나요?',
    content:
      '개인사업자로 등록한지 2개월 됐는데, 세금신고를 언제부터 해야하는지 궁금합니다. 부가가치세와 종합소득세 신고 시기가 다른가요?',
    category: 'tax',
    author: {
      nickname: '파란하늘',
      businessType: '음식점',
      region: '서울',
      yearsInBusiness: 1,
    },
    metrics: {
      viewCount: 234,
      commentCount: 2,
      scrapCount: 5,
    },
    flags: {
      needsExpertReply: true,
      needsExaminerReply: false,
    },
    answers: [
      {
        role: 'examiner',
        displayName: '박현숙',
        organization: 'KPJ',
        content:
          '사업자등록 후 부가가치세는 일반과세자의 경우 분기별로 신고합니다. 1월, 4월, 7월, 10월에 신고 기간이 있으며, 간이과세자는 1월과 7월에 신고합니다. 종합소득세는 매년 5월에 신고하시면 됩니다.',
        isPinned: true,
        sources: [],
        helpfulCount: 15,
        answeredAt: new Date(),
      },
      {
        role: 'community',
        displayName: '겨울바람',
        content: '저도 처음엔 헷갈렸는데, 홈택스에서 안내 문자가 와요! 놓치지 마세요.',
        isPinned: false,
        sources: [],
        helpfulCount: 8,
        answeredAt: new Date(),
      },
    ],
  },
  {
    title: '정책자금 신청할 때 사업계획서는 어떻게 작성하나요?',
    content:
      '소상공인 정책자금을 신청하려고 하는데, 사업계획서 작성이 막막합니다. 어떤 내용을 중점적으로 작성해야 할까요?',
    category: 'funding',
    author: {
      nickname: '봄날햇살',
      businessType: '제조업',
      region: '경기',
      yearsInBusiness: 3,
    },
    metrics: {
      viewCount: 189,
      commentCount: 1,
      scrapCount: 12,
    },
    flags: {
      needsExpertReply: true,
      needsExaminerReply: true,
    },
    answers: [
      {
        role: 'examiner',
        displayName: '김범준',
        organization: 'SJ',
        content:
          '사업계획서는 1)사업개요 2)시장분석 3)마케팅전략 4)재무계획 순으로 작성하시면 됩니다. 특히 수익성과 성장가능성을 구체적인 수치로 제시하는 것이 중요합니다. 3개년 재무계획을 현실적으로 작성하시고, 경쟁사 분석도 빠뜨리지 마세요.',
        isPinned: true,
        sources: [],
        helpfulCount: 23,
        answeredAt: new Date(),
      },
    ],
  },
  {
    title: '직원 첫 채용 시 꼭 해야 할 절차가 뭔가요?',
    content:
      '1인 사업자로 운영하다가 처음으로 직원을 채용하게 됐습니다. 근로계약서 외에 어떤 절차를 밟아야 하나요?',
    category: 'hr',
    author: {
      nickname: '노을빛',
      businessType: '소매업',
      region: '부산',
      yearsInBusiness: 2,
    },
    metrics: {
      viewCount: 156,
      commentCount: 1,
      scrapCount: 8,
    },
    answers: [
      {
        role: 'examiner',
        displayName: '손지숙',
        organization: '손스타컴퍼니',
        content:
          '1) 근로계약서 작성 2) 4대보험 가입 3) 최저임금 준수 4) 근로기준법 준수사항 확인이 필수입니다. 특히 4대보험은 입사일로부터 14일 이내 신고해야 하며, 늦으면 과태료가 부과될 수 있습니다.',
        isPinned: false,
        sources: [],
        helpfulCount: 19,
        answeredAt: new Date(),
      },
    ],
  },
  {
    title: '온라인 쇼핑몰 창업 시 통신판매업 신고는 필수인가요?',
    content: '스마트스토어로 작게 시작하려는데 통신판매업 신고를 꼭 해야하나요? 매출이 적어도 필수인가요?',
    category: 'legal',
    author: {
      nickname: '여름바다',
      businessType: '온라인쇼핑',
      region: '인천',
      yearsInBusiness: 0,
    },
    metrics: {
      viewCount: 278,
      commentCount: 2,
      scrapCount: 15,
    },
    answers: [
      {
        role: 'examiner',
        displayName: '전지선',
        organization: 'JTL',
        content:
          '통신판매업 신고는 연매출 1,200만원 이상이면 의무입니다. 하지만 사업 초기라도 미리 신고하시는 것을 권장합니다. 정부24에서 온라인으로 간편하게 신고 가능하며, 수수료는 무료입니다.',
        isPinned: true,
        sources: [],
        helpfulCount: 12,
        answeredAt: new Date(),
      },
      {
        role: 'community',
        displayName: '가을단풍',
        content: '저는 처음부터 신고했어요. 나중에 급하게 하느라 고생하는 것보다 미리 하는게 낫더라구요.',
        isPinned: false,
        sources: [],
        helpfulCount: 5,
        answeredAt: new Date(),
      },
    ],
  },
  {
    title: '소상공인 정책자금 대출 신청 자격이 어떻게 되나요?',
    content:
      '카페를 운영하고 있는데 시설 개선 자금이 필요합니다. 소상공인 정책자금 대출을 받을 수 있을까요?',
    category: 'funding',
    author: {
      nickname: '초록물결',
      businessType: '음식점',
      region: '서울',
      yearsInBusiness: 1,
    },
    metrics: {
      viewCount: 312,
      commentCount: 1,
      scrapCount: 20,
    },
    flags: {
      needsExpertReply: true,
    },
    answers: [
      {
        role: 'examiner',
        displayName: '김영희',
        organization: '세움',
        content:
          '소상공인 정책자금은 상시근로자 10인 미만(제조업은 50인 미만) 사업자가 대상입니다. 업력 3개월 이상, 신용등급 기준 충족 시 신청 가능합니다. 카페의 경우 시설개선자금 신청이 가능하며, 금리도 일반 대출보다 저렴합니다.',
        isPinned: true,
        sources: [],
        helpfulCount: 28,
        answeredAt: new Date(),
      },
    ],
  },
];

async function seed() {
  try {
    console.log('MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 기존 테스트 데이터 삭제
    const deleteResult = await BusinessVoiceQuestion.deleteMany({});
    console.log(`🗑️  기존 데이터 ${deleteResult.deletedCount}개 삭제`);

    // 테스트 데이터 삽입
    const result = await BusinessVoiceQuestion.insertMany(testData);
    console.log(`✅ 테스트 데이터 ${result.length}개 생성 완료`);

    // 생성된 데이터 확인
    console.log('\n생성된 질문 목록:');
    result.forEach((q, i) => {
      console.log(`${i + 1}. [${q.category}] ${q.title}`);
      console.log(`   - ID: ${q._id}`);
      console.log(`   - 답변: ${q.answers.length}개`);
      console.log(`   - 조회수: ${q.metrics.viewCount}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ 완료!');
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

seed();
