#!/usr/bin/env node

/**
 * 데이터베이스에 Title 속성 추가
 * 주의: Notion API는 데이터베이스 속성 추가를 지원하지 않습니다.
 * 대신 페이지 생성 시 자동으로 속성이 생성되도록 합니다.
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DAILY_LOG_DB;

(async () => {
  console.log('⚠️  Notion API는 데이터베이스 속성을 직접 추가할 수 없습니다.\n');
  console.log('대신 더미 페이지를 생성하여 Title 속성을 강제로 생성합니다.\n');

  try {
    // 더미 페이지 생성 (Title 속성 강제 생성)
    const dummyPage = await notion.pages.create({
      parent: {
        database_id: DB_ID
      },
      properties: {
        'Name': {  // 기본 Title 속성 이름
          title: [
            {
              text: {
                content: '초기 설정 페이지 (삭제 예정)'
              }
            }
          ]
        }
      }
    });

    console.log('✅ 더미 페이지 생성 완료 (ID:', dummyPage.id, ')');
    console.log('\n이제 데이터베이스 구조를 다시 확인합니다...\n');

    // 데이터베이스 구조 재확인
    const db = await notion.databases.retrieve({
      database_id: DB_ID
    });

    console.log('📋 속성 목록:');
    for (const [key, value] of Object.entries(db.properties || {})) {
      console.log(`  - ${key} (${value.type})`);
    }

    // 더미 페이지 삭제
    console.log('\n더미 페이지 삭제 중...');
    await notion.pages.update({
      page_id: dummyPage.id,
      archived: true
    });
    console.log('✅ 더미 페이지 삭제 완료\n');

    console.log('💡 이제 update-page-title.js를 실행하여 제목을 업데이트하세요.');

  } catch (error) {
    console.error('❌ 오류:', error.message);

    if (error.message.includes('Name is not a property')) {
      console.log('\n💡 Notion에서 수동으로 설정해주세요:');
      console.log('1. 데이터베이스 열기');
      console.log('2. 첫 번째 컬럼 클릭 → "Name" 입력');
    }
  }
})();
