#!/usr/bin/env node

/**
 * 기존 페이지에 제목 추가
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DAILY_LOG_DB;

(async () => {
  console.log('📝 기존 페이지 제목 업데이트 중...\n');

  // 데이터베이스의 모든 페이지 가져오기
  const search = await notion.search({
    filter: { property: 'object', value: 'page' }
  });

  const normalizedDbId = DB_ID.replace(/-/g, '');
  const dbPages = search.results.filter(p => {
    if (!p.parent?.database_id) return false;
    return p.parent.database_id.replace(/-/g, '') === normalizedDbId;
  });

  console.log(`📄 업데이트할 페이지: ${dbPages.length}개\n`);

  for (const page of dbPages) {
    const dateStr = page.created_time.split('T')[0];

    try {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          '업무일시': {  // Title 속성 이름
            title: [
              {
                text: {
                  content: `${dateStr} 업무일지`
                }
              }
            ]
          }
        }
      });

      console.log(`  ✅ ${dateStr} 업무일지 - 제목 업데이트 완료`);
    } catch (error) {
      console.error(`  ❌ 실패 (${page.id}):`, error.message);
    }
  }

  console.log('\n✅ 모든 페이지 제목 업데이트 완료!');
  console.log('\n이제 Notion 테이블 뷰에서 제목이 보여야 합니다.');
})();
