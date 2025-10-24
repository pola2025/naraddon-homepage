#!/usr/bin/env node

/**
 * 기존 페이지에 제목 속성 추가
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DAILY_LOG_DB;

(async () => {
  console.log('📝 페이지 제목 업데이트 중...\n');

  // 1. 데이터베이스 구조 확인
  const db = await notion.databases.retrieve({
    database_id: DB_ID
  });

  console.log('데이터베이스 속성:');
  console.log(JSON.stringify(db.properties, null, 2));
  console.log('');

  // 2. Title 속성 찾기
  let titlePropName = null;
  if (db.properties && Object.keys(db.properties).length > 0) {
    const titleProp = Object.entries(db.properties).find(([_, v]) => v.type === 'title');
    if (titleProp) {
      titlePropName = titleProp[0];
      console.log(`✅ Title 속성 찾음: "${titlePropName}"\n`);
    }
  }

  if (!titlePropName) {
    console.log('❌ Title 속성이 없습니다.');
    console.log('\n💡 해결 방법:');
    console.log('1. Notion에서 데이터베이스를 열고');
    console.log('2. 첫 번째 컬럼을 클릭하여 "Name" 또는 "일자" 등으로 이름 설정');
    console.log('3. 이 스크립트를 다시 실행하세요.');
    process.exit(1);
  }

  // 3. 데이터베이스의 모든 페이지 가져오기
  const search = await notion.search({
    filter: { property: 'object', value: 'page' }
  });

  const normalizedDbId = DB_ID.replace(/-/g, '');
  const dbPages = search.results.filter(p => {
    if (!p.parent?.database_id) return false;
    return p.parent.database_id.replace(/-/g, '') === normalizedDbId;
  });

  console.log(`📄 업데이트할 페이지: ${dbPages.length}개\n`);

  // 4. 각 페이지 제목 업데이트
  for (const page of dbPages) {
    const dateStr = page.created_time.split('T')[0];

    try {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          [titlePropName]: {
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
})();
