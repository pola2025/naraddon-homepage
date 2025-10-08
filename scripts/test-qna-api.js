const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api/business-voice';
const QUESTION_ID = '68e5cf07bf6bc304efc8ecfe';

async function test() {
  console.log('🧪 묻고 답하기 API 테스트\n');

  // 1. 질문 목록 조회
  console.log('1️⃣ 질문 목록 조회');
  const listRes = await fetch(`${API_BASE}/questions?limit=3`);
  const listData = await listRes.json();
  console.log(`   ✅ ${listData.count}개 질문 조회됨`);
  listData.questions.forEach((q, i) => {
    console.log(`   ${i + 1}. [${q.category}] ${q.title}`);
    console.log(`      답변 ${q.answers.length}개, 조회 ${q.metrics.viewCount}회`);
  });

  // 2. 질문 상세 조회 (1차)
  console.log('\n2️⃣ 질문 상세 조회 (1차) - 조회수 증가 확인');
  const detailRes1 = await fetch(`${API_BASE}/questions/${QUESTION_ID}`);
  const detailData1 = await detailRes1.json();
  console.log(`   조회수: ${detailData1.question.metrics.viewCount}회`);

  // 3. 질문 상세 조회 (2차) - 조회수 증가 확인
  console.log('\n3️⃣ 질문 상세 조회 (2차) - 조회수 증가 확인');
  const detailRes2 = await fetch(`${API_BASE}/questions/${QUESTION_ID}`);
  const detailData2 = await detailRes2.json();
  console.log(`   조회수: ${detailData2.question.metrics.viewCount}회`);
  console.log(`   ${detailData2.question.metrics.viewCount > detailData1.question.metrics.viewCount ? '✅ 조회수 증가 정상' : '❌ 조회수 증가 안됨'}`);

  // 4. 카테고리 필터 테스트
  console.log('\n4️⃣ 카테고리 필터 테스트 (tax)');
  const taxRes = await fetch(`${API_BASE}/questions?category=tax&limit=10`);
  const taxData = await taxRes.json();
  console.log(`   세무 카테고리: ${taxData.count}개`);
  taxData.questions.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.title} (${q.category})`);
  });

  console.log('\n✅ 모든 테스트 완료!');
}

test().catch(console.error);
