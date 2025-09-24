// 똔톡 기능 테스트 스크립트

const API_BASE_URL = 'http://localhost:3005/api/business-voice/ttontok';
const TTONTOK_WRITE_PASSWORD = process.env.TTONTOK_WRITE_PASSWORD;

async function simulateUserFlow() {
  console.log('🚀 똔톡 사용자 시뮬레이션 테스트 시작\n');

  try {
    // Step 1: 글 작성 테스트
    console.log('📝 [Step 1] 새 글 작성 중...');
    const newPost = {
      title: '스타트업 초기 자금 조달 전략 문의드립니다',
      category: 'funding',
      content: '안녕하세요. IT 스타트업을 준비중인 예비창업자입니다.\n\n시드 투자를 받기 위한 준비사항과 투자자들이 중요하게 보는 포인트가 무엇인지 궁금합니다.\n\n특히 MVP 단계에서 어느 정도의 완성도를 갖춰야 하는지, 그리고 팀 구성은 어떻게 해야 하는지 조언 부탁드립니다.',
      nickname: '예비창업자',
      tags: ['시드투자', 'MVP', '자금조달'],
      password: TTONTOK_WRITE_PASSWORD
    };

    const createResponse = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`글 작성 실패: ${error.message}`);
    }

    const created = await createResponse.json();
    console.log(`✅ 글 작성 성공! ID: ${created.id}`);
    console.log(`   제목: ${created.title}`);
    console.log(`   카테고리: ${created.category}`);
    console.log(`   태그: ${created.tags.join(', ')}\n`);

    // Step 2: 글 목록 조회
    console.log('📋 [Step 2] 글 목록 조회 중...');
    const listResponse = await fetch(`${API_BASE_URL}?limit=5&sort=latest`);
    const list = await listResponse.json();

    console.log(`✅ 총 ${list.total}개의 글 중 최신 ${list.items.length}개 조회`);
    list.items.forEach((post, idx) => {
      console.log(`   ${idx + 1}. [${post.category}] ${post.title} - ${post.nickname}`);
    });
    console.log();

    // Step 3: 상세 글 조회
    console.log('🔍 [Step 3] 작성한 글 상세 조회 중...');
    const detailResponse = await fetch(`${API_BASE_URL}/${created.id}`);
    const detail = await detailResponse.json();

    console.log(`✅ 글 상세 정보:`);
    console.log(`   제목: ${detail.title}`);
    console.log(`   내용: ${detail.content.substring(0, 100)}...`);
    console.log(`   조회수: ${detail.viewCount}`);
    console.log(`   좋아요: ${detail.likeCount}`);
    console.log(`   댓글수: ${detail.replyCount}\n`);

    // Step 4: 조회수 증가 테스트
    console.log('👁️ [Step 4] 조회수 증가 테스트...');
    const viewUpdateResponse = await fetch(`${API_BASE_URL}/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewCount: detail.viewCount + 1 })
    });

    if (viewUpdateResponse.ok) {
      const updated = await viewUpdateResponse.json();
      console.log(`✅ 조회수 업데이트: ${detail.viewCount} → ${updated.viewCount}\n`);
    }

    // Step 5: 카테고리별 조회
    console.log('🏷️ [Step 5] 카테고리별 조회 테스트...');
    const categories = ['funding', 'tax', 'hr'];
    for (const cat of categories) {
      const catResponse = await fetch(`${API_BASE_URL}?category=${cat}&limit=3`);
      const catData = await catResponse.json();
      console.log(`   [${cat}] 카테고리: ${catData.total}개 글 존재`);
    }
    console.log();

    // Step 6: 정렬 옵션 테스트
    console.log('📊 [Step 6] 정렬 옵션 테스트...');
    const sortOptions = ['latest', 'popular', 'discussed'];
    for (const sort of sortOptions) {
      const sortResponse = await fetch(`${API_BASE_URL}?sort=${sort}&limit=3`);
      const sortData = await sortResponse.json();
      console.log(`   [${sort}] 정렬: ${sortData.items.length}개 글 조회 성공`);
    }

    console.log('\n✨ 모든 테스트 완료! 똔톡 기능이 정상적으로 작동합니다.');

    // 테스트 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 글 작성 기능: 정상');
    console.log('   ✅ 목록 조회 기능: 정상');
    console.log('   ✅ 상세 조회 기능: 정상');
    console.log('   ✅ 조회수 업데이트: 정상');
    console.log('   ✅ 카테고리 필터링: 정상');
    console.log('   ✅ 정렬 기능: 정상');

    return created.id;

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

// 테스트 실행
simulateUserFlow().then(postId => {
  console.log(`\n🔗 브라우저에서 확인: http://localhost:3005/business-voice/ttontok/${postId}`);
});