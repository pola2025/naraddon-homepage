#!/usr/bin/env node

/**
 * 기존 페이지 요약 업데이트
 */

const { updateDailySummary } = require('./notion-daily-log');
const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DAILY_LOG_DB;

(async () => {
  console.log('📊 페이지 요약 업데이트 중...\n');

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
    console.log(`처리 중: ${page.id}`);
    await updateDailySummary(page.id);
  }

  console.log('\n✅ 모든 페이지 요약 업데이트 완료!');
})();
