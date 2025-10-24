#!/usr/bin/env node

/**
 * Git Commit에서 Notion 동기화
 * @purpose 커밋된 Obsidian 파일을 Notion에 기록
 */

const { parseObsidianFile } = require('./obsidian-watcher');
const { logWork } = require('./auto-logger');
const path = require('path');

async function syncFile(filePath) {
  console.log(`\n📄 동기화: ${path.basename(filePath)}`);

  try {
    // 파일 파싱
    const workData = parseObsidianFile(filePath);

    if (!workData) {
      console.log('⚠️  메타데이터 없음 - 건너뜀');
      return;
    }

    // Notion에 기록
    await logWork(workData);

  } catch (error) {
    console.error('❌ 동기화 실패:', error.message);
  }
}

// CLI 실행
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('사용법: node sync-from-commit.js <파일경로>');
    process.exit(1);
  }

  syncFile(filePath);
}

module.exports = { syncFile };
