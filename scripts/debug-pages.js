#!/usr/bin/env node

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DAILY_LOG_DB;

(async () => {
  console.log('Database ID:', DB_ID, '\n');

  // 모든 페이지 검색
  const all = await notion.search({
    filter: { property: 'object', value: 'page' }
  });

  console.log('전체 페이지 수:', all.results.length, '\n');

  // 데이터베이스별 그룹핑
  const byDb = {};
  for (const page of all.results) {
    const dbId = page.parent?.database_id || 'no-db';
    if (!byDb[dbId]) byDb[dbId] = [];
    byDb[dbId].push(page);
  }

  console.log('데이터베이스별 페이지 수:\n');
  const normalizedDbId = DB_ID.replace(/-/g, '');

  for (const [dbId, pages] of Object.entries(byDb)) {
    const normalizedKey = dbId.replace(/-/g, '');
    const isOurDb = normalizedKey === normalizedDbId;

    console.log(`  ${dbId}: ${pages.length}개${isOurDb ? ' ← 우리 DB!' : ''}`);

    if (isOurDb) {
      pages.slice(0, 5).forEach(p => {
        console.log(`    - ${p.created_time} (ID: ${p.id})`);
      });
    }
  }
})();
