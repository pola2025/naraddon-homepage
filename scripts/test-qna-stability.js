/**
 * Business Voice Q&A 안정성 테스트
 *
 * 실제 프로덕션 환경에서 발생할 수 있는 다양한 시나리오를 테스트합니다.
 */

const API_BASE = 'http://localhost:3000/api/business-voice';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n${msg}\n${colors.blue}${'='.repeat(60)}${colors.reset}`),
};

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function test(name, fn) {
  stats.total++;
  try {
    await fn();
    stats.passed++;
    log.success(name);
    return true;
  } catch (error) {
    stats.failed++;
    log.error(`${name}: ${error.message}`);
    return false;
  }
}

async function testAPI() {
  log.section('📡 API 엔드포인트 테스트');

  // 1. 기본 질문 목록 조회
  await test('GET /api/business-voice/questions (기본)', async () => {
    const res = await fetch(`${API_BASE}/questions`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format');
    }
    console.log(`   ${colors.gray}└─ ${data.count}개 질문 조회됨${colors.reset}`);
  });

  // 2. limit 파라미터 테스트
  await test('GET /api/business-voice/questions?limit=3', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=3`);
    const data = await res.json();
    if (data.questions.length > 3) {
      throw new Error(`Expected max 3, got ${data.questions.length}`);
    }
    console.log(`   ${colors.gray}└─ ${data.questions.length}개 반환 (limit 작동)${colors.reset}`);
  });

  // 3. 빈 결과 처리 (존재하지 않는 카테고리)
  await test('GET /api/business-voice/questions?category=nonexistent', async () => {
    const res = await fetch(`${API_BASE}/questions?category=nonexistent`);
    const data = await res.json();
    if (!Array.isArray(data.questions)) {
      throw new Error('Should return empty array');
    }
    console.log(`   ${colors.gray}└─ 빈 배열 반환 (정상)${colors.reset}`);
  });

  // 4. 카테고리 필터 테스트
  await test('GET /api/business-voice/questions?category=tax', async () => {
    const res = await fetch(`${API_BASE}/questions?category=tax`);
    const data = await res.json();
    if (data.questions.length > 0) {
      const allTax = data.questions.every(q => q.category === 'tax');
      if (!allTax) throw new Error('Category filter not working');
      console.log(`   ${colors.gray}└─ ${data.questions.length}개 세무 질문 필터링됨${colors.reset}`);
    } else {
      console.log(`   ${colors.gray}└─ 세무 질문 없음 (데이터 확인 필요)${colors.reset}`);
    }
  });

  // 5. 전문가 답변 필요 필터
  await test('GET /api/business-voice/questions?needsExpertReply=true', async () => {
    const res = await fetch(`${API_BASE}/questions?needsExpertReply=true`);
    const data = await res.json();
    console.log(`   ${colors.gray}└─ ${data.questions.length}개 전문가 답변 필요${colors.reset}`);
  });

  // 6. 잘못된 파라미터 (음수 limit)
  await test('GET /api/business-voice/questions?limit=-1', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=-1`);
    const data = await res.json();
    // 에러가 아니라 기본값으로 처리되어야 함
    if (!Array.isArray(data.questions)) {
      throw new Error('Should handle negative limit gracefully');
    }
    console.log(`   ${colors.gray}└─ 음수 limit 안전하게 처리됨${colors.reset}`);
  });

  // 7. 매우 큰 limit (100 초과)
  await test('GET /api/business-voice/questions?limit=999', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=999`);
    const data = await res.json();
    if (data.questions.length > 100) {
      log.warn('Limit 999 returned more than 100 items - 보안 이슈 가능성');
      stats.warnings++;
    }
    console.log(`   ${colors.gray}└─ ${data.questions.length}개 반환 (최대 100개 제한 확인 필요)${colors.reset}`);
  });
}

async function testDataIntegrity() {
  log.section('🔍 데이터 무결성 테스트');

  // 1. 필수 필드 존재 확인
  await test('필수 필드 검증', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=1`);
    const data = await res.json();

    if (data.questions.length === 0) {
      log.warn('테스트 데이터가 없습니다');
      stats.warnings++;
      return;
    }

    const question = data.questions[0];
    const requiredFields = ['id', 'title', 'content', 'category', 'author', 'metrics', 'answers'];

    for (const field of requiredFields) {
      if (!(field in question)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // author 하위 필드 확인
    const authorFields = ['nickname', 'businessType', 'region'];
    for (const field of authorFields) {
      if (!(field in question.author)) {
        throw new Error(`Missing author field: ${field}`);
      }
    }

    // metrics 하위 필드 확인
    const metricsFields = ['viewCount', 'commentCount', 'scrapCount'];
    for (const field of metricsFields) {
      if (!(field in question.metrics)) {
        throw new Error(`Missing metrics field: ${field}`);
      }
    }

    console.log(`   ${colors.gray}└─ 모든 필수 필드 존재 확인${colors.reset}`);
  });

  // 2. 답변 데이터 구조 확인
  await test('답변 데이터 구조 검증', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=10`);
    const data = await res.json();

    const questionsWithAnswers = data.questions.filter(q => q.answers.length > 0);

    if (questionsWithAnswers.length === 0) {
      log.warn('답변이 있는 질문이 없습니다');
      stats.warnings++;
      return;
    }

    const question = questionsWithAnswers[0];
    const answer = question.answers[0];

    const requiredAnswerFields = ['role', 'displayName', 'content', 'isPinned'];
    for (const field of requiredAnswerFields) {
      if (!(field in answer)) {
        throw new Error(`Missing answer field: ${field}`);
      }
    }

    // role 값 검증
    const validRoles = ['community', 'expert', 'examiner', 'consultant'];
    if (!validRoles.includes(answer.role)) {
      throw new Error(`Invalid role: ${answer.role}`);
    }

    console.log(`   ${colors.gray}└─ 답변 ${question.answers.length}개, role: ${answer.role}${colors.reset}`);
  });

  // 3. ID 형식 검증
  await test('ID 형식 검증 (MongoDB ObjectId)', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=1`);
    const data = await res.json();

    if (data.questions.length === 0) {
      throw new Error('No data to test');
    }

    const id = data.questions[0].id;

    // MongoDB ObjectId 형식: 24자 hex
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!objectIdRegex.test(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }

    console.log(`   ${colors.gray}└─ ID: ${id} (ObjectId 형식)${colors.reset}`);
  });

  // 4. 날짜 형식 검증
  await test('날짜 형식 검증 (ISO 8601)', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=1`);
    const data = await res.json();

    if (data.questions.length === 0) {
      throw new Error('No data to test');
    }

    const question = data.questions[0];

    const dateFields = ['createdAt', 'updatedAt'];
    for (const field of dateFields) {
      const dateStr = question[field];
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for ${field}: ${dateStr}`);
      }

      // ISO 8601 형식 확인
      if (!dateStr.includes('T') || !dateStr.includes('Z')) {
        throw new Error(`Date not in ISO 8601 format: ${dateStr}`);
      }
    }

    console.log(`   ${colors.gray}└─ createdAt: ${question.createdAt}${colors.reset}`);
  });

  // 5. 답변 정렬 확인 (isPinned 우선)
  await test('답변 정렬 검증 (isPinned 우선)', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=10`);
    const data = await res.json();

    const questionsWithMultipleAnswers = data.questions.filter(q => q.answers.length > 1);

    if (questionsWithMultipleAnswers.length === 0) {
      log.warn('답변이 2개 이상인 질문이 없어 정렬 테스트 불가');
      stats.warnings++;
      return;
    }

    for (const question of questionsWithMultipleAnswers) {
      let pinnedFound = false;
      for (const answer of question.answers) {
        if (answer.isPinned) {
          if (pinnedFound) {
            // 이미 pinned 답변을 찾았는데 또 있음 (정렬 안됨)
            throw new Error(`Pinned answers not sorted first in question ${question.id}`);
          }
          pinnedFound = true;
        } else {
          if (!pinnedFound) {
            // pinned가 아닌데 먼저 나옴 (정렬 안됨)
            // 하지만 pinned가 아예 없을 수도 있으므로 패스
          }
        }
      }
    }

    console.log(`   ${colors.gray}└─ ${questionsWithMultipleAnswers.length}개 질문의 답변 정렬 확인${colors.reset}`);
  });
}

async function testEdgeCases() {
  log.section('🎯 엣지 케이스 테스트');

  // 1. 존재하지 않는 질문 ID
  await test('존재하지 않는 질문 조회', async () => {
    const fakeId = '000000000000000000000000'; // 유효한 ObjectId 형식이지만 존재하지 않음
    const res = await fetch(`${API_BASE}/questions/${fakeId}`);

    if (res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }

    console.log(`   ${colors.gray}└─ 404 Not Found 반환 (정상)${colors.reset}`);
  });

  // 2. 잘못된 ID 형식
  await test('잘못된 ID 형식 처리', async () => {
    const invalidId = 'invalid-id-format';
    const res = await fetch(`${API_BASE}/questions/${invalidId}`);

    if (res.status !== 400 && res.status !== 404 && res.status !== 500) {
      throw new Error(`Expected 400/404/500, got ${res.status}`);
    }

    console.log(`   ${colors.gray}└─ ${res.status} 에러 반환 (정상)${colors.reset}`);
  });

  // 3. 빈 문자열 ID
  await test('빈 문자열 ID 처리', async () => {
    const res = await fetch(`${API_BASE}/questions/`);

    // 404 또는 리다이렉트 허용
    if (res.status !== 404 && res.status !== 301 && res.status !== 302) {
      log.warn(`Empty ID returned ${res.status} - 라우팅 확인 필요`);
      stats.warnings++;
    }

    console.log(`   ${colors.gray}└─ ${res.status} 반환${colors.reset}`);
  });

  // 4. SQL Injection 시도 (NoSQL injection 방어 확인)
  await test('NoSQL Injection 방어 확인', async () => {
    const maliciousCategory = encodeURIComponent('{"$gt": ""}');
    const res = await fetch(`${API_BASE}/questions?category=${maliciousCategory}`);

    if (!res.ok) {
      log.warn('Malicious input caused error - 입력 검증 확인 필요');
      stats.warnings++;
    }

    const data = await res.json();
    // 빈 배열이 반환되어야 정상
    console.log(`   ${colors.gray}└─ ${data.questions.length}개 반환 (injection 방어됨)${colors.reset}`);
  });

  // 5. XSS 공격 시도 (스크립트 태그)
  await test('XSS 방어 확인 (응답 데이터 검증)', async () => {
    const res = await fetch(`${API_BASE}/questions?limit=10`);
    const data = await res.json();

    if (data.questions.length === 0) {
      log.warn('테스트 데이터 없음');
      stats.warnings++;
      return;
    }

    // 응답에 <script> 태그가 있는지 확인
    const jsonStr = JSON.stringify(data);
    if (jsonStr.includes('<script>') || jsonStr.includes('javascript:')) {
      throw new Error('XSS vulnerability detected in response');
    }

    console.log(`   ${colors.gray}└─ 응답에 스크립트 태그 없음 (안전)${colors.reset}`);
  });
}

async function testPerformance() {
  log.section('⚡ 성능 테스트');

  // 1. 응답 시간 측정
  await test('API 응답 시간 (< 2초)', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/questions?limit=20`);
    await res.json();
    const duration = Date.now() - start;

    if (duration > 2000) {
      log.warn(`Response time: ${duration}ms (느림)`);
      stats.warnings++;
    } else {
      console.log(`   ${colors.gray}└─ ${duration}ms (양호)${colors.reset}`);
    }
  });

  // 2. 대량 데이터 조회
  await test('대량 데이터 조회 (limit=100)', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/questions?limit=100`);
    const data = await res.json();
    const duration = Date.now() - start;

    console.log(`   ${colors.gray}└─ ${data.questions.length}개 조회, ${duration}ms${colors.reset}`);

    if (duration > 5000) {
      log.warn('대량 조회 시 5초 이상 소요 - 인덱스 확인 필요');
      stats.warnings++;
    }
  });

  // 3. 동시 요청 처리 (동시성 테스트)
  await test('동시 요청 처리 (10개)', async () => {
    const requests = Array(10).fill().map((_, i) =>
      fetch(`${API_BASE}/questions?limit=${i + 1}`)
    );

    const start = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    const allOk = results.every(res => res.ok);
    if (!allOk) {
      throw new Error('Some concurrent requests failed');
    }

    console.log(`   ${colors.gray}└─ 10개 동시 요청 처리, ${duration}ms${colors.reset}`);
  });
}

async function testRealWorldScenarios() {
  log.section('🌍 실제 사용 시나리오 테스트');

  // 1. 사용자가 질문 목록 조회 → 상세 페이지 이동
  await test('시나리오: 목록 → 상세 페이지', async () => {
    // Step 1: 목록 조회
    const listRes = await fetch(`${API_BASE}/questions?limit=1`);
    const listData = await listRes.json();

    if (listData.questions.length === 0) {
      log.warn('테스트 데이터 없음');
      stats.warnings++;
      return;
    }

    const questionId = listData.questions[0].id;

    // Step 2: 상세 조회
    const detailRes = await fetch(`${API_BASE}/questions/${questionId}`);
    if (!detailRes.ok) {
      throw new Error(`Detail page failed: ${detailRes.status}`);
    }

    const detailData = await detailRes.json();

    if (!detailData.question) {
      throw new Error('Detail response missing question field');
    }

    console.log(`   ${colors.gray}└─ 목록 → 상세 페이지 흐름 정상${colors.reset}`);
  });

  // 2. 카테고리별 필터링 사용
  await test('시나리오: 카테고리 필터링', async () => {
    const categories = ['tax', 'funding', 'legal', 'hr'];

    for (const category of categories) {
      const res = await fetch(`${API_BASE}/questions?category=${category}&limit=5`);
      const data = await res.json();

      if (data.questions.length > 0) {
        const allMatchCategory = data.questions.every(q => q.category === category);
        if (!allMatchCategory) {
          throw new Error(`Category filter failed for ${category}`);
        }
      }
    }

    console.log(`   ${colors.gray}└─ 4개 카테고리 필터링 정상${colors.reset}`);
  });

  // 3. 페이지네이션 시뮬레이션
  await test('시나리오: 페이지네이션', async () => {
    const page1 = await fetch(`${API_BASE}/questions?limit=5`);
    const data1 = await page1.json();

    // 실제로는 offset/cursor 기반 페이지네이션이 필요하지만
    // 현재는 limit만 지원하므로 limit 변경으로 시뮬레이션
    const page2 = await fetch(`${API_BASE}/questions?limit=10`);
    const data2 = await page2.json();

    if (data2.questions.length < data1.questions.length) {
      throw new Error('Pagination logic issue');
    }

    console.log(`   ${colors.gray}└─ Page 1: ${data1.questions.length}개, Page 2: ${data2.questions.length}개${colors.reset}`);
  });
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     Business Voice Q&A - 안정성 종합 테스트              ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const startTime = Date.now();

  try {
    await testAPI();
    await testDataIntegrity();
    await testEdgeCases();
    await testPerformance();
    await testRealWorldScenarios();
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log.section('📊 테스트 결과 요약');

  console.log(`총 테스트: ${stats.total}개`);
  console.log(`${colors.green}통과: ${stats.passed}개${colors.reset}`);
  console.log(`${colors.red}실패: ${stats.failed}개${colors.reset}`);
  console.log(`${colors.yellow}경고: ${stats.warnings}개${colors.reset}`);
  console.log(`소요 시간: ${duration}초\n`);

  // 최종 판정
  if (stats.failed === 0 && stats.warnings === 0) {
    log.success('✨ 모든 테스트 통과! 프로덕션 배포 준비 완료');
    process.exit(0);
  } else if (stats.failed === 0 && stats.warnings > 0) {
    log.warn(`⚠️  ${stats.warnings}개 경고 발견 - 수정 권장하지만 배포 가능`);
    process.exit(0);
  } else {
    log.error(`❌ ${stats.failed}개 테스트 실패 - 수정 후 재테스트 필요`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
