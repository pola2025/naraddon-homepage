#!/usr/bin/env node

/**
 * Notion 데이터베이스 구조 확인
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DAILY_LOG_DB = process.env.NOTION_DAILY_LOG_DB;

const notion = new Client({ auth: NOTION_API_KEY });

async function checkDatabase() {
  console.log('🔍 Notion 데이터베이스 구조 확인 중...\n');
  console.log(`Database ID: ${NOTION_DAILY_LOG_DB}\n`);

  try {
    const db = await notion.databases.retrieve({
      database_id: NOTION_DAILY_LOG_DB
    });

    console.log('✅ 데이터베이스 정보:\n');
    console.log(`제목: ${db.title[0]?.plain_text || '(제목 없음)'}\n`);

    console.log('📋 속성(Properties) 목록:\n');

    // Check if properties exist
    if (!db.properties || Object.keys(db.properties).length === 0) {
      console.log('  ⚠️ 데이터베이스에 속성이 없습니다. 새 데이터베이스인 것 같습니다.');
      console.log('\n💡 기본 속성 생성 방법:');
      console.log('  1. Notion에서 데이터베이스를 열고');
      console.log('  2. 첫 번째 열의 이름을 "Name" 또는 "이름"으로 설정하세요.');
      console.log('  3. 이 속성은 자동으로 Title 타입이 됩니다.');
      return;
    }

    for (const [key, value] of Object.entries(db.properties)) {
      console.log(`  - ${key} (${value.type})`);
    }

    console.log('\n💡 Title 속성 찾기:');
    const titleProp = Object.entries(db.properties).find(([_, v]) => v.type === 'title');
    if (titleProp) {
      console.log(`  Title 속성 이름: "${titleProp[0]}"`);
    } else {
      console.log('  Title 속성을 찾을 수 없습니다!');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error('\n전체 에러:');
    console.error(error);
  }
}

checkDatabase();
