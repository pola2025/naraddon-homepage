#!/usr/bin/env node

/**
 * Notion 데이터베이스의 모든 페이지 삭제 (재시작용)
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DAILY_LOG_DB = process.env.NOTION_DAILY_LOG_DB;

const notion = new Client({ auth: NOTION_API_KEY });

async function cleanAllPages() {
  console.log('🗑️  Notion 데이터베이스 페이지 정리 중...\n');

  try {
    // 모든 페이지 검색
    const searchResponse = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    console.log(`전체 검색 결과: ${searchResponse.results.length}개 페이지`);
    console.log(`찾는 DB ID: ${NOTION_DAILY_LOG_DB}\n`);

    // 이 데이터베이스의 페이지만 필터링
    // UUID는 하이픈 유무 관계없이 비교
    const normalizedDbId = NOTION_DAILY_LOG_DB.replace(/-/g, '');

    console.log('첫 3개 페이지의 parent 정보:');
    searchResponse.results.slice(0, 3).forEach(p => {
      console.log(`  - parent.type: ${p.parent?.type}, parent.database_id: ${p.parent?.database_id || 'null'}`);
    });
    console.log('');

    const dbPages = searchResponse.results.filter(page => {
      // parent.type이 'data_source_id' 또는 'database_id' 모두 허용
      if (!page.parent?.database_id) return false;

      const pageDbId = page.parent.database_id.replace(/-/g, '');
      const match = pageDbId === normalizedDbId;
      if (match) {
        console.log(`  매칭: ${page.id} (${page.created_time})`);
      }
      return match;
    });

    console.log(`\n📄 삭제할 페이지: ${dbPages.length}개\n`);

    if (dbPages.length === 0) {
      console.log('✅ 삭제할 페이지가 없습니다.');
      return;
    }

    // 각 페이지 아카이브 (삭제)
    for (const page of dbPages) {
      try {
        await notion.pages.update({
          page_id: page.id,
          archived: true
        });
        console.log(`  ✅ 삭제: ${page.id}`);
      } catch (error) {
        console.error(`  ❌ 실패: ${page.id} - ${error.message}`);
      }
    }

    console.log(`\n✅ 총 ${dbPages.length}개 페이지 삭제 완료!`);
    console.log('\n💡 이제 log-today-work.js를 다시 실행하세요.');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    throw error;
  }
}

cleanAllPages();
